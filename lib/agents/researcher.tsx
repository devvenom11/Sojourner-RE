import { createStreamableUI, createStreamableValue } from 'ai/rsc'
import { CoreMessage, LanguageModel, ToolCallPart, ToolResultPart, streamText } from 'ai'
import { getTools } from './tools'
import { getModel, transformToolMessages } from '../utils'
import { AnswerSection } from '@/components/answer-section'
import { searchWriter } from './search-writer'
import { type } from 'os'
import { log } from 'console'

export async function researcher(
  uiStream: ReturnType<typeof createStreamableUI>,
  streamableText: ReturnType<typeof createStreamableValue<string>>,
  messages: CoreMessage[]
) {
  let fullResponse = ''
  let hasError = false
  let finishReason = ''

  // Transform the messages if using Ollama provider
  let processedMessages = messages
  const useOllamaProvider = !!(
    process.env.OLLAMA_MODEL && process.env.OLLAMA_BASE_URL
  )
  const useAnthropicProvider = !!process.env.ANTHROPIC_API_KEY
  if (useOllamaProvider) {
    processedMessages = transformToolMessages(messages)
  }
  const includeToolResponses = messages.some(message => message.role === 'tool')
  const useSubModel = useOllamaProvider && includeToolResponses

  const streamableAnswer = createStreamableValue<string>('')
  const answerSection = <AnswerSection result={streamableAnswer.value} />

  console.log("Messages", messages);

  const currentDate = new Date().toLocaleString()
  const result = await streamText({
    model: getModel(useSubModel) as LanguageModel,
    maxTokens: 2500,
    system: `plaintext
As a professional assistant with three access tools:

Greeting: Use to greet or casual conversation.
Search: To answer the user's question accurately. For Example Current news, facts, latest information or any.
VideoSearch: For queries specifically requesting videos.

Tool Usage Guidelines:
Use "Greeting" for greetings or casual conversation.
Use "Search" Everytime other than greeting and video seeking.
Use "VideoSearch" exclusively for queries explicitly seeking videos.

Response Guidelines:
Enhance your responses with information from search results if you've used a tool.
Include relevant images when appropriate to support your answer.
Use only one tool per query and avoid unnecessary tool usage.
Do not mention or reference the tools you are using in your response.
Avoid self-talk or meta-commentary about your actions or limitations.

Citing Sources:
When quoting or referencing information from specific URLs, cite the source using the [number] format that matches the order of the search results.
Multiple citations can be included as needed, e.g., [1], [2].

Additional Instructions:
Match the language of your response to the user's language.
Current date and time: ${currentDate}

    `,
    messages: processedMessages,
    tools: getTools({
      uiStream,
      fullResponse
    }),
    onFinish: async event => {
      finishReason = event.finishReason
      fullResponse = event.text
      console.log("Full Response", fullResponse);
      // streamableAnswer.done()
    }
  }).catch(err => {
    hasError = true
    console.log("Error: " + err.message);

    fullResponse = 'Error: ' + err.message
    streamableText.update(fullResponse)
  })

  // If the result is not available, return an error response
  if (!result) {
    return { result, fullResponse, hasError, toolResponses: [] }
  }

  const hasToolResult = messages.some(message => message.role === 'tool')
  if (hasToolResult) {
    uiStream.append(answerSection)
  }

  // // Process the response
  const toolCalls: ToolCallPart[] = []
  const toolResponses: ToolResultPart[] = []
  for await (const delta of result.fullStream) {
    switch (delta.type) {
      case 'text-delta':
        if (delta.textDelta) {
          fullResponse += delta.textDelta
          if (useAnthropicProvider && !hasToolResult) {
            streamableText.update(fullResponse)
          } else {
            streamableAnswer.update(fullResponse)
          }
        }
        break
      case 'tool-call':
        toolCalls.push(delta)
        break
      case 'tool-result':
        if (!delta.result) {
          hasError = true
        }
        toolResponses.push(delta)
        break
      case 'error':
        console.log('Error: ' + delta.error)
        hasError = true
        fullResponse += `\nError occurred while executing the tool`
        break
    }
  }
  messages.push({
    role: 'assistant',
    content: [{ type: 'text', text: fullResponse }, ...toolCalls]
  })

  if (toolResponses.length > 0) {
    // Add tool responses to the messages
    messages.push({ role: 'tool', content: toolResponses })
  }

  // Ensure searchWriter is called only if toolResponses are available
  let response = null
  if (toolResponses.length > 0) {
    const searchWriterResult = await searchWriter(uiStream, messages, JSON.stringify(toolResponses[0]))
    response = searchWriterResult.response
    // console.log("Writer Result searchWriter", typeof (response), typeof ({ response }));
    // console.log("Response :", response);
    // console.log("Tool  Responses", typeof (toolResponses), toolResponses);
  }

  return { result, fullResponse, hasError, toolResponses, finishReason, response }
}
