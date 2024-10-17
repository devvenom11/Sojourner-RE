import { createStreamableUI, createStreamableValue } from 'ai/rsc'
import { CoreMessage, ToolCallPart, ToolResultPart, streamText } from 'ai'
import { getTools } from './tools'
import { getModel, transformToolMessages } from '../utils'
import { AnswerSection } from '@/components/answer-section'
import { searchWriter } from './search-writer'
import { type } from 'os'

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

  console.log("Messages",messages);
  
  const currentDate = new Date().toLocaleString()
  const result = await streamText({
    model: getModel(useSubModel),
    maxTokens: 2500,
    system: `plaintext
As a professional assistant with access to three tools:

Search: For general web searches when external information is needed to answer the user's question accurately.If user query related to finding news summary, you can use this tool. Every query that requires external information should be answered using this tool.

VideoSearch: For queries specifically requesting videos.

As a professional assistant with access to three tools:

Answer Generation: For generating responses based on your existing knowledge without external resources. Use this tool for casual conversations, greetings, or when you can provide a complete and helpful answer without external data. Also use this tool to provide friendly and short answers without using any external tools.

Search: For general web searches when external information is needed to answer the user's question accurately.
VideoSearch: For queries specifically requesting videos.
Tool Usage Guidelines:

Use "Answer Generation" for casual conversations, greetings, or when you can provide a complete and helpful answer without external data. In these cases, respond in a friendly and engaging manner without using any tools.
Use "Search" when the user's question requires information beyond your current knowledge.
Use "VideoSearch" exclusively for queries explicitly seeking videos.
Response Guidelines:

Provide clear, detailed, and friendly answers, especially during casual interactions.
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
      streamableAnswer.done()
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

  // console.log("Tools response ",JSON.stringify(toolResponses[0]),JSON.stringify(toolResponses[0]));
 
  const { response } = await searchWriter(uiStream, messages, JSON.stringify(toolResponses[0]))
  console.log("Writer Result searchWriter",typeof(response),typeof({response}));
  console.log("Full Response :",fullResponse);
  
  return { result, fullResponse, hasError, toolResponses, finishReason, response }
  // return { result, fullResponse, hasError, toolResponses, finishReason  }

}


