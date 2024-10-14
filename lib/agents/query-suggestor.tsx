import { createStreamableUI, createStreamableValue } from 'ai/rsc'
import { CoreMessage, streamObject } from 'ai'
import SearchRelated from '@/components/search-related'
import { getModel } from '../utils'
import { z } from 'zod';


export async function querySuggestor(
  uiStream: ReturnType<typeof createStreamableUI> | any,
  messages: CoreMessage[]
) {
  // Define the Zod schema
  const relatedSchema = z.object({
    related: z.array(z.string()),
  });
  // console.log();

  type PartialRelated = {
    items?: { query: string }[];
  };

  const objectStream = createStreamableValue<PartialRelated>();
  uiStream.append(<SearchRelated relatedQueries={objectStream.value} />);

  // console.log("Original Messages:", messages);

  const getLatestUserMessage = (messages: CoreMessage[]) => {
    const validUserMessages: CoreMessage[] = [];
    // Iterate through the array in reverse to prioritize latest messages
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];

      // Check if the role is 'user'
      if (message.role === "user") {
        try {
          // Attempt to parse the content as JSON
          const parsedContent = JSON.parse(message.content);

          // If the message has an action and it's 'skip', ignore this message
          if (
            parsedContent.action &&
            parsedContent.action.toLowerCase() === "skip"
          ) {
            // console.log(`Skipping message: ${JSON.stringify(message)}`);
            continue; // Skip to the next message
          }

          // If no action is 'skip', add this message to the validUserMessages array
          validUserMessages.unshift(message);
        } catch (error) {
          // If parsing fails, include the message as it's not an 'action': 'skip'
          // console.log(`Including message (not JSON or no 'action': 'skip'): ${JSON.stringify(message)}`);
          validUserMessages.unshift(message);
        }
      }
    }

    return validUserMessages;
  };

  const new_latest_messages = getLatestUserMessage(messages);
  // console.log("Filtered Latest Messages:", new_latest_messages);

  let finalRelatedQueries: PartialRelated = { items: [] };

  try {
    const result = await streamObject({
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

Your output should be relevant to the user query always. Aim to create queries that progressively delve into more specific aspects, implications, or adjacent topics related to the initial query. The goal is to anticipate the user's potential information needs and guide them towards a more comprehensive understanding of the subject matter. 
Please match the language of the response to the user's language.`,
      messages: new_latest_messages,
      schema: relatedSchema,
    });

    console.log("Stream started successfully.");

    for await (const obj of result.partialObjectStream) {
      if (obj.related) {
        // Transform the 'related' array into the required format
        const relatedQueries = obj.related.map((query: string) => ({ query }));
        // Update objectStream with the new items
        objectStream.update({ items: relatedQueries });
        // Update finalRelatedQueries
        finalRelatedQueries.items = finalRelatedQueries.items!.concat(
          relatedQueries
        );
      } else {
        console.log("No 'related' in the received object:", obj);
      }
    }

  } catch (error) {
    console.error("Error during streamObject:", error);
  } finally {
    // Ensure that objectStream is not updated after it's done
    objectStream.done();
    console.log("Stream closed.");
  }

  // console.log("Final Related Queries:", finalRelatedQueries);
  return finalRelatedQueries;
}