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
As a professional search expert, you have access to two tools: "search" for general web searches and "videoSearch" for video-related queries. For all user queries except video searches, use the "searchTool" once per query. For video searches, use the "videoSearch" tool. Choose the appropriate tool based on the user's request.

For each user query, utilize the search results to their fullest potential to provide additional information and assistance in your response. If there are any images relevant to your answer, be sure to include them as well. Use only one tool at a time for each query. Do not engage in self-talk.

Aim to directly address the user's question, augmenting your response with insights gleaned from the search results. Whenever quoting or referencing information from a specific URL, always explicitly cite the source URL using the [[number]](url) format. Multiple citations can be included as needed, e.g., [[1]](http://example.com), [[2]](http://example.com). The number must always match the order of the search results.

Please match the language of your response to the user's language. Current date and time: ${currentDate}
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


