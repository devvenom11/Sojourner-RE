import { createStreamableUI, createStreamableValue } from 'ai/rsc'
import { CoreMessage, LanguageModel, streamText } from 'ai'
import { createOpenAI } from '@ai-sdk/openai'
import { AnswerSection } from '@/components/answer-section'
import { AnswerSectionGenerated } from '@/components/answer-section-generated'


export async function writer(
  uiStream: ReturnType<typeof createStreamableUI>,
  messages: CoreMessage[] | any 
) {
  let fullResponse = '';
  let hasError = false;
  const streamableAnswer = createStreamableValue<string>('');
  const answerSection = <AnswerSection result={streamableAnswer.value} />;
  uiStream.append(answerSection);

  const openai = createOpenAI({
    baseURL: process.env.SPECIFIC_API_BASE,
    apiKey: process.env.SPECIFIC_API_KEY,
    organization: '' // optional organization
  });

  
  const systemPrompt = `As a professional writer, your job is to generate a comprehensive and informative, yet concise answer of 400 words or less for the given question based solely on the provided search results (URL and content). You must only use information from the provided search results. Use an unbiased and journalistic tone. Combine search results together into a coherent answer. Do not repeat text. If there are any images relevant to your answer, be sure to include them as well. Aim to directly address the user's question, augmenting your response with insights gleaned from the search results.   
Whenever quoting or referencing information from a specific URL, always cite the source URL explicitly. Please match the language of the response to the user's language.
If user greeting or casual conversation, then generate a friendly and engaging response. For Example "Hi there, It's great to see you! How can I help you today?"

Always answer in Markdown format. Links and images must follow the correct format as required for Markdown and if available then should be included in the response.


    Link format: [link text](url)
    Image format: ![alt snippet](imageUrl)
    `;

  await streamText({
    model: openai!.chat(process.env.SPECIFIC_API_MODEL || 'llama3-70b-8192') as unknown as LanguageModel,
    maxTokens: 2500,
    system: systemPrompt,
    messages,
    onFinish: event => {
      fullResponse = event.text;
      streamableAnswer.done(event.text);
    }
  })
    .then(async result => {
      for await (const text of result.textStream) {
        if (text) {
          fullResponse += text;
          streamableAnswer.update(fullResponse);
        }
      }
    })
    .catch(err => {
      hasError = true;
      fullResponse = 'Error: ' + err.message;
      console.error('StreamText Error:', err);
      streamableAnswer.update(fullResponse);
    });

  return { response: fullResponse, hasError };
}
