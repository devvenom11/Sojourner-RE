import { createStreamableUI, createStreamableValue } from 'ai/rsc'
import { CoreMessage, streamObject } from 'ai'
import { PartialRelated, relatedSchema } from '@/lib/schema/related'
import SearchRelated from '@/components/search-related'
import { getModel } from '../utils'
import { get } from 'http'

export async function querySuggestor(
  uiStream: ReturnType<typeof createStreamableUI> | any,
  messages: CoreMessage[]
  // messages: CoreMessage[] | any

) {
  const objectStream = createStreamableValue<PartialRelated>()
  uiStream.append(<SearchRelated relatedQueries={objectStream.value} />)

  console.log("Message :", messages);


  const lastMessages = messages.slice(-1).map(message => {
    return {
      ...message,
      role: 'user'
    }
  }) as CoreMessage[]

  console.log("Last message", lastMessages);


  const getLatestUserMessage = (messages: any) => {
    const validUserMessages = [];

    // Iterate through the array in reverse to prioritize latest messages
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];

      // Check if the role is 'user'
      if (message.role === 'user') {
        try {
          // Attempt to parse the content as JSON
          const parsedContent = JSON.parse(message.content);

          // If the message has an action and it's 'skip', ignore this message
          if (parsedContent.action && parsedContent.action.toLowerCase() === 'skip') {
            continue; // Skip to the next message
          }

          // If no action is 'skip', add this message to the validUserMessages array
          validUserMessages.unshift(message);
        } catch (error) {
          // If parsing fails, assume the content is not a JSON string
          // Include the message as it's not an 'action': 'skip'
          validUserMessages.push(message);
        }
      }
    }

    return validUserMessages;
  }

  const new_latest_messages = getLatestUserMessage(messages)
  console.log("new_latest_messages", new_latest_messages);


  let finalRelatedQueries: PartialRelated = {}
  await streamObject({
    model: getModel(),
    system: `As a professional web researcher, your task is to generate a set of three queries that explore the subject matter more deeply, building upon the initial query and the information uncovered in its search results.

    For instance, if the original query was "Starship's third test flight key milestones", your output should follow this format:

    "{
      "related": [
        "What were the primary objectives achieved during Starship's third test flight?",
        "What factors contributed to the ultimate outcome of Starship's third test flight?",
        "How will the results of the third test flight influence SpaceX's future development plans for Starship?"
      ]
    }"

    Your output should be relavent to user query always. Aim to create queries that progressively delve into more specific aspects, implications, or adjacent topics related to the initial query. The goal is to anticipate the user's potential information needs and guide them towards a more comprehensive understanding of the subject matter. 
    Please match the language of the response to the user's language.`,
    messages: new_latest_messages,
    schema: relatedSchema
  })
    .then(async result => {
      for await (const obj of result.partialObjectStream) {
        if (obj.items) {
          objectStream.update(obj)
          finalRelatedQueries = obj
        }
      }
    })
    .finally(() => {
      objectStream.done()
    })

  console.log("finalRelatedQueries", finalRelatedQueries);

  return finalRelatedQueries
}
