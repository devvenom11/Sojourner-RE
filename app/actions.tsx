// Import necessary modules and components
import {
  StreamableValue,
  createAI,
  createStreamableUI,
  createStreamableValue,
  getAIState,
  getMutableAIState
} from 'ai/rsc';

import { CoreMessage, generateId, ToolResultPart } from 'ai';

import { Spinner } from '@/components/ui/spinner';
import { Section } from '@/components/section';
import { FollowupPanel } from '@/components/followup-panel';

import { inquire, researcher, taskManager, querySuggestor } from '@/lib/agents';
import { writer } from '@/lib/agents/writer';

import { saveChat } from '@/lib/actions/chat';
import { Chat } from '@/lib/types';
import { AIMessage } from '@/lib/types';

import { UserMessage } from '@/components/user-message';
import { SearchSection } from '@/components/search-section';
import SearchRelated from '@/components/search-related';
import { CopilotDisplay } from '@/components/copilot-display';
import RetrieveSection from '@/components/retrieve-section';
import { VideoSearchSection } from '@/components/video-search-section';

import { transformToolMessages } from '@/lib/utils';
import { AnswerSection } from '@/components/answer-section';
import { ErrorCard } from '@/components/error-card';

import { array } from 'zod';

// Async function to handle form submission and AI interactions
async function submit(
  formData?: FormData,
  skip?: boolean,
  retryMessages?: AIMessage[]
) {
  'use server'; // Indicates server-side execution

  // Get mutable AI state and create UI stream for real-time updates
  const aiState = getMutableAIState<typeof AI>();
  const uiStream = createStreamableUI();

  // Create streamable values for generating state and collapse state
  const isGenerating = createStreamableValue(true);
  const isCollapsed = createStreamableValue(false);

  // Retrieve messages from AI state, including any retry messages
  const aiMessages = [...(retryMessages ?? aiState.get().messages)];

  // Filter out tool-related messages and map to CoreMessage format
  const messages: CoreMessage[] = aiMessages
    .filter(
      message =>
        message.role !== 'tool' &&
        message.type !== 'followup' &&
        message.type !== 'related' &&
        message.type !== 'end'
    )
    .map(message => {
      const { role, content } = message;
      return { role, content } as CoreMessage;
    });

  // Generate a group ID for message grouping
  const groupId = generateId();

  // Determine API usage based on environment variables
  const useSpecificAPI = process.env.USE_SPECIFIC_API_FOR_WRITER === 'true';
  const useOllamaProvider = !!(
    process.env.OLLAMA_MODEL && process.env.OLLAMA_BASE_URL
  );

  // Set maximum messages to consider based on API provider
  const maxMessages = useSpecificAPI ? 5 : useOllamaProvider ? 1 : 10;

  // Limit the messages array to the maximum allowed messages
  messages.splice(0, Math.max(messages.length - maxMessages, 0));

  // Extract user input from form data or set to skip action
  const userInput = skip
    ? `{"action": "skip"}`
    : (formData?.get('input') as string);

  // Determine content and type based on form data
  const content = skip
    ? userInput
    : formData
    ? JSON.stringify(Object.fromEntries(formData))
    : null;
  const type = skip
    ? undefined
    : formData?.has('input')
    ? 'input'
    : formData?.has('related_query')
    ? 'input_related'
    : 'inquiry';

  // Add user message to AI state if content exists
  if (content) {
    aiState.update({
      ...aiState.get(),
      messages: [
        ...aiState.get().messages,
        {
          id: generateId(),
          role: 'user',
          content,
          type
        }
      ]
    });
    messages.push({
      role: 'user',
      content
    });
  }

  // Function to process AI events and update UI accordingly
  async function processEvents() {
    // Display a spinner while processing
    uiStream.append(<Spinner />);

    // Default action is to proceed
    let action = { object: { next: 'proceed' } };

    // Determine next action using task manager if not skipping
    if (!skip) action = (await taskManager(messages)) ?? action;

    // Handle 'inquire' action by generating an inquiry
    if (action.object.next === 'inquire') {
      const inquiry = await inquire(uiStream, messages);
      uiStream.done();
      isGenerating.done();
      isCollapsed.done(false);
      aiState.done({
        ...aiState.get(),
        messages: [
          ...aiState.get().messages,
          {
            id: generateId(),
            role: 'assistant',
            content: `inquiry: ${inquiry?.question}`,
            type: 'inquiry'
          }
        ]
      });
      return;
    }

    // Collapse previous UI components
    isCollapsed.done(true);

    // Initialize variables for answer generation
    let answer = '';
    let stopReason = '';
    let toolOutputs: ToolResultPart[] = [];
    let errorOccurred = false;

    const streamText = createStreamableValue<string>();

    // Update UI with answer section or placeholder based on API key
    if (process.env.ANTHROPIC_API_KEY) {
      uiStream.update(
        <AnswerSection result={streamText.value} hasHeader={false} />
      );
    } else {
      uiStream.update(<div />);
    }

    // Loop to handle answer generation and tool outputs
    while (
      useSpecificAPI
        ? toolOutputs.length === 0 && answer.length === 0 && !errorOccurred
        : (stopReason !== 'stop' || answer.length === 0) && !errorOccurred
    ) {
      // Use researcher agent to generate responses
      const {
        fullResponse,
        hasError,
        toolResponses,
        finishReason,
        response
      } = await researcher(uiStream, streamText, messages);
      stopReason = finishReason || '';
      answer = response ?? '';
      toolOutputs = toolResponses;
      errorOccurred = hasError;

      // Add assistant's response to messages
      // messages.push({
      //   role: 'assistant',
      //   content: response
      // });

      // Update AI state with tool outputs if available
      if (toolOutputs.length > 0) {
        toolOutputs.map(output => {
          aiState.update({
            ...aiState.get(),
            messages: [
              ...aiState.get().messages,
              {
                id: groupId,
                role: 'tool',
                content: JSON.stringify(output.result),
                name: output.toolName,
                type: 'tool'
              }
            ]
          });
        });
      }
    }

    // Handle answer generation using specific API if required
    if (useSpecificAPI && answer.length === 0 && !errorOccurred) {
      const modifiedMessages = transformToolMessages(messages);
      const latestMessages = modifiedMessages.slice(maxMessages * -1);
      const { response, hasError } = await writer(uiStream, latestMessages);
      answer = response;
      errorOccurred = hasError;
      messages.push({
        role: 'assistant',
        content: answer
      });
    }

    // Process the final answer if no errors occurred
    if (!errorOccurred) {
      const useGoogleProvider = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      const useOllamaProvider = !!(
        process.env.OLLAMA_MODEL && process.env.OLLAMA_BASE_URL
      );
      let processedMessages = messages;

      // Adjust messages based on provider requirements
      if (useGoogleProvider) {
        processedMessages = transformToolMessages(messages);
      }
      if (useOllamaProvider) {
        processedMessages = [{ role: 'assistant', content: answer }];
      }

      // Finalize streamed text and update AI state
      streamText.done();
      aiState.update({
        ...aiState.get(),
        messages: [
          ...aiState.get().messages,
          {
            id: groupId,
            role: 'assistant',
            content: answer,
            type: 'answer'
          }
        ]
      });

      // Generate related queries and update UI
      const relatedQueries = await querySuggestor(uiStream, processedMessages);
      uiStream.append(
        <Section title="Follow-up">
          <FollowupPanel />
        </Section>
      );

      // Update AI state with related queries and follow-up prompts
      aiState.done({
        ...aiState.get(),
        messages: [
          ...aiState.get().messages,
          {
            id: groupId,
            role: 'assistant',
            content: JSON.stringify(relatedQueries),
            type: 'related'
          },
          {
            id: groupId,
            role: 'assistant',
            content: 'followup',
            type: 'followup'
          }
        ]
      });
    } else {
      // Handle errors by updating UI with error message
      aiState.done(aiState.get());
      streamText.done();
      uiStream.append(
        <ErrorCard
          errorMessage={answer || 'An error occurred. Please try again.'}
        />
      );
    }

    // Finalize generating state and UI stream
    isGenerating.done(false);
    uiStream.done();
  }

  // Invoke the event processing function
  processEvents();

  // Return the updated UI state
  return {
    id: generateId(),
    isGenerating: isGenerating.value,
    component: uiStream.value,
    isCollapsed: isCollapsed.value
  };
}

// Define AIState type to manage AI-related state
export type AIState = {
  messages: AIMessage[];
  chatId: string;
  isSharePage?: boolean;
};

// Define UIState type to manage UI components and their states
export type UIState = {
  id: string;
  component: React.ReactNode;
  isGenerating?: StreamableValue<boolean>;
  isCollapsed?: StreamableValue<boolean>;
}[];

// Initialize AI state with a unique chat ID and empty messages
const initialAIState: AIState = {
  chatId: generateId(),
  messages: []
};

// Initialize UI state as an empty array
const initialUIState: UIState = [];

// Create AI provider to wrap the application and access AI and UI state
export const AI = createAI<AIState, UIState>({
  actions: {
    submit
  },
  initialUIState,
  initialAIState,

  // Function to get UI state from AI state
  onGetUIState: async () => {
    'use server';

    const aiState = getAIState();
    if (aiState) {
      const uiState = getUIStateFromAIState(aiState as Chat);
      return uiState;
    } else {
      return;
    }
  },

  // Function to handle AI state updates
  onSetAIState: async ({ state, done }) => {
    'use server';

    // Proceed only if there is an 'answer' type message
    if (!state.messages.some(e => e.type === 'answer')) {
      return;
    }

    const { chatId, messages } = state;
    const createdAt = new Date();
    const userId = 'anonymous';
    const path = `/search/${chatId}`;
    const title =
      messages.length > 0
        ? JSON.parse(messages[0].content)?.input?.substring(0, 100) ||
          'Untitled'
        : 'Untitled';

    // Append an 'end' message to determine if history needs to be reloaded
    const updatedMessages: AIMessage[] = [
      ...messages,
      {
        id: generateId(),
        role: 'assistant',
        content: `end`,
        type: 'end'
      }
    ];

    // Create chat object and save it
    const chat: Chat = {
      id: chatId,
      createdAt,
      userId,
      path,
      title,
      messages: updatedMessages
    };
    await saveChat(chat);
  }
});

// Function to derive UI state from AI state
export const getUIStateFromAIState = (aiState: Chat) => {
  const chatId = aiState.chatId;
  const isSharePage = aiState.isSharePage;

  // Ensure messages are in a plain object array
  const messages = Array.isArray(aiState.messages)
    ? aiState.messages.map(msg => ({ ...msg }))
    : [];

  // Map messages to UI components based on their type and role
  return messages
    .map((message, index) => {
      const { role, content, id, type, name } = message;

      // Skip certain message types
      if (
        !type ||
        type === 'end' ||
        (isSharePage && type === 'related') ||
        (isSharePage && type === 'followup')
      )
        return null;

      switch (role) {
        case 'user':
          switch (type) {
            case 'input':
            case 'input_related':
              // Parse content and extract user input
              const json = JSON.parse(content);
              const value =
                type === 'input' ? json.input : json.related_query;
              return {
                id,
                component: (
                  <UserMessage
                    message={value}
                    chatId={chatId}
                    showShare={index === 0 && !isSharePage}
                  />
                )
              };
            case 'inquiry':
              return {
                id,
                component: <CopilotDisplay content={content} />
              };
          }
          break;
        case 'assistant':
          // Create streamable value for assistant's answer
          const answer = createStreamableValue();
          answer.done(content);
          switch (type) {
            case 'answer':
              return {
                id,
                component: <AnswerSection result={answer.value} />
              };
            case 'related':
              // Parse related queries and create component
              const relatedQueries = createStreamableValue();
              relatedQueries.done(JSON.parse(content));
              return {
                id,
                component: (
                  <SearchRelated relatedQueries={relatedQueries.value} />
                )
              };
            case 'followup':
              return {
                id,
                component: (
                  <Section title="Follow-up" className="pb-8">
                    <FollowupPanel />
                  </Section>
                )
              };
          }
          break;
        case 'tool':
          try {
            // Parse tool output and create corresponding component
            const toolOutput = JSON.parse(content);
            const isCollapsed = createStreamableValue();
            isCollapsed.done(true);
            const searchResults = createStreamableValue();
            searchResults.done(JSON.stringify(toolOutput));
            switch (name) {
              case 'search':
                return {
                  id,
                  component: <SearchSection result={searchResults.value} />,
                  isCollapsed: isCollapsed.value
                };
              case 'retrieve':
                return {
                  id,
                  component: <RetrieveSection data={toolOutput} />,
                  isCollapsed: isCollapsed.value
                };
              case 'videoSearch':
                return {
                  id,
                  component: (
                    <VideoSearchSection result={searchResults.value} />
                  ),
                  isCollapsed: isCollapsed.value
                };
            }
          } catch (error) {
            return {
              id,
              component: null
            };
          }
          break;
        default:
          return {
            id,
            component: null
          };
      }
    })
    .filter(message => message !== null) as UIState;
};
