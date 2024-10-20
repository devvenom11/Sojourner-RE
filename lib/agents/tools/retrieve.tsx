import { tool } from 'ai';
import { retrieveSchema } from '@/lib/schema/retrieve';
import { ToolProps } from '.';
import { DefaultSkeleton } from '@/components/default-skeleton';
import { SearchResults as SearchResultsType } from '@/lib/types';
import RetrieveSection from '@/components/retrieve-section';
import {searchWriter} from '../search-writer'

interface Article {
  title: string;
  description: string;
  url: string;
  content: string;
  images: Image[];
}

interface Image {
  description: string;
  url: string;
}

function processRetrieveToolResponse(json: any): Article[] {
  if (!json || !json.data) return [];

  const { title, description, url, content } = json.data;
  const articles: Article[] = [];
  const imagePattern = /!\[(Image \d+: .+?)\]\((https?:\/\/[^)]+)\)/g;

  // Extract images and corresponding captions
  const images: Image[] = [];
  let match;
  while ((match = imagePattern.exec(content)) !== null) {
    images.push({
      description: match[1], // The caption, e.g., "Image 1: Description"
      url: match[2] // The URL of the image
    });
  }

  // Split the content by the header sections and process each as a separate article if necessary
  const sections = content.split(/\n\s*###\s+/);
  sections.forEach((section:any, index:any) => {
    if (index === 0) { // The first section often does not start with a header
      articles.push({
        title,
        description,
        url,
        content: section.trim(),
        images
      });
    } else {
      const headerEndIndex = section.indexOf('\n');
      const sectionTitle = section.substring(0, headerEndIndex).trim();
      const sectionContent = section.substring(headerEndIndex).trim();
      articles.push({
        title: sectionTitle,
        description: '', // No separate description for subsections
        url,
        content: sectionContent,
        images: [] // Images are assumed to be global; modify if section-specific images are needed
      });
    }
  });

  return articles;
}

export const retrieveTool = ({ uiStream}: ToolProps) =>
  tool({
    description: 'Retrieve content from the web',
    parameters: retrieveSchema,
    execute: async ({ url }) => {
      uiStream; // Show loading indicator

      let results: SearchResultsType | undefined;
      let hasError = false;

      try {
        const response = await fetch(`https://r.jina.ai/${url}`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            'X-With-Generated-Alt': 'true'
          }
        });
        const json = await response.json();
        console.log("Retrieve tool response", typeof(json), json);
        
        // Process the response using the custom function
        const articles = processRetrieveToolResponse(json);
        
        if (articles.length === 0) {
          hasError = true;
        } 
        else {
          results = {
            answer: 'ai',
            results: articles.map(article => ({
              title: article.title,
              content: article.content,
              url: article.url
            })),
            query: '',
            images: []
          };
        }
      } catch (error) {
        console.error('Retrieve API error:', error);
        hasError = true;
      }
   return results; // Returning results might be used for further processing or validation
    }
  });
