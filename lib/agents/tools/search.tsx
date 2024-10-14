// import { tool } from 'ai'
// import { createStreamableValue } from 'ai/rsc'
// import Exa from 'exa-js'
// import { searchSchema } from '@/lib/schema/search'
// import { SearchSection } from '@/components/search-section'
// import { ToolProps } from '.' // Ensure this path is correct
// import { sanitizeUrl } from '@/lib/utils'
// import {
//   SearchResultImage,
//   SearchResults,
//   SearchResultItem,
//   SearXNGResponse,
//   SearXNGResult
// } from '@/lib/types'

// export const searchTool = ({ uiStream }: ToolProps) =>
//   tool({
//     description: 'Search the web for information',
//     parameters: searchSchema,
//     execute: async ({
//       query,
//       max_results,
//       include_domains,
//       exclude_domains
//     }) => {
//       let hasError = false
//       let fullResponse = ''

//       const streamResults = createStreamableValue<string>()

//       if (!uiStream || typeof uiStream.update !== 'function') {
//         throw new Error('uiStream is not defined or does not have an update function.')
//       }

//       uiStream.update(
//         <SearchSection
//           result={streamResults.value}
//           includeDomains={include_domains}
//         />
//       )

//       // Validate query parameter
//       if (!query || typeof query !== 'string') {
//         throw new Error('Query parameter is required and must be a string.')
//       }

//       // Convert max_results to a number if it's a string
//       const maxResults =
//         typeof max_results === 'string' ? parseInt(max_results, 10) : max_results

//       if (isNaN(maxResults)) {
//         throw new Error('max_results must be a valid number.')
//       }

//       // Ensure the query has at least 5 characters
//       const filledQuery =
//         query.length < 5 ? query + ' '.repeat(5 - query.length) : query

//       // Initialize searchResult with default values
//       let searchResult: SearchResults = {
//         results: [],
//         query: filledQuery,
//         images: [],
//         number_of_results: 0,
//         answer: ''
//       }

//       const searchAPI =
//         (process.env.SEARCH_API as 'tavily' | 'exa' | 'searxng') || 'tavily'

//       // Override search depth to 'advanced'
//       const effectiveSearchDepth: 'basic' | 'advanced' = 'advanced'

//       console.log(
//         `Using search API: ${searchAPI}, Search Depth: ${effectiveSearchDepth}`
//       )

//       try {
//         if (searchAPI === 'searxng' && effectiveSearchDepth === 'advanced') {
//           // API route for advanced SearXNG search
//           const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'

//           const response = await fetch(`${baseUrl}/api/advanced-search`, {
//             method: 'POST',
//             headers: { 'Content-Type': 'application/json' },
//             body: JSON.stringify({
//               query: filledQuery,
//               maxResults: maxResults,
//               searchDepth: effectiveSearchDepth,
//               includeDomains: include_domains,
//               excludeDomains: exclude_domains
//             })
//           })
//           if (!response.ok) {
//             throw new Error(
//               `Advanced search API error: ${response.status} ${response.statusText}`
//             )
//           }
//           const data = await response.json()
//           // Validate response structure
//           if (data && typeof data === 'object' && Array.isArray(data.results)) {
//             searchResult = data
//           } else {
//             throw new Error('Invalid data format from advanced search API')
//           }
//         } else {
//           // Choose the appropriate search function based on the API
//           switch (searchAPI) {
//             case 'tavily':
//               searchResult = await tavilySearch(
//                 filledQuery,
//                 maxResults,
//                 effectiveSearchDepth,
//                 include_domains,
//                 exclude_domains
//               )
//               break
//             case 'exa':
//               searchResult = await exaSearch(
//                 filledQuery,
//                 maxResults,
//                 effectiveSearchDepth,
//                 include_domains,
//                 exclude_domains
//               )
//               break
//             case 'searxng':
//               searchResult = await searxngSearch(
//                 filledQuery,
//                 maxResults,
//                 effectiveSearchDepth,
//                 include_domains,
//                 exclude_domains
//               )
//               break
//             default:
//               throw new Error(`Unsupported search API: ${searchAPI}`)
//           }
//         }
//       } catch (error: any) {
//         console.error('Search API error:', error)
//         hasError = true
//         searchResult = {
//           results: [],
//           query: filledQuery,
//           images: [],
//           number_of_results: 0,
//           answer: ''
//         }
//         fullResponse = `An error occurred while searching for "${filledQuery}".`
//         uiStream.update(null) // Clear the UI stream on error
//         streamResults.done()
//         return searchResult
//       }

//       // Process the search results
//       streamResults.done(JSON.stringify(searchResult))

//       return searchResult
//     }
//   })

// // Helper search functions with added error handling

// async function tavilySearch(
//   query: string,
//   maxResults: number = 10,
//   searchDepth: 'basic' | 'advanced' = 'advanced',
//   includeDomains: string[] = [],
//   excludeDomains: string[] = []
// ): Promise<SearchResults> {
//   const apiKey = process.env.TAVILY_API_KEY
//   if (!apiKey) {
//     throw new Error('TAVILY_API_KEY is not set in the environment variables')
//   }

//   // Validate query parameter
//   if (!query || typeof query !== 'string') {
//     throw new Error('Query parameter is required and must be a string.')
//   }

//   const includeImageDescriptions = true
//   const response = await fetch('https://api.tavily.com/search', {
//     method: 'POST',
//     headers: {
//       'Content-Type': 'application/json'
//     },
//     body: JSON.stringify({
//       api_key: apiKey,
//       query,
//       max_results: Math.max(maxResults, 5),
//       search_depth: searchDepth,
//       include_images: true,
//       include_image_descriptions: includeImageDescriptions,
//       include_domains: includeDomains,
//       exclude_domains: excludeDomains
//     })
//   })

//   if (!response.ok) {
//     throw new Error(
//       `Tavily API error: ${response.status} ${response.statusText}`
//     )
//   }

//   const data = await response.json()

//   // Validate and process data
//   if (!data || typeof data !== 'object') {
//     throw new Error('Invalid data format from Tavily API')
//   }

//   // Process images
//   const processedImages: SearchResultImage[] = includeImageDescriptions
//     ? (data.images || [])
//         .map(({ url, description }: { url: string; description: string }) => ({
//           url: sanitizeUrl(url),
//           description
//         }))
//         .filter(
//           (image: any): image is SearchResultImage =>
//             typeof image === 'object' &&
//             image.description !== undefined &&
//             image.description !== ''
//         )
//     : (data.images || []).map((url: string) => sanitizeUrl(url))

//   return {
//     results: Array.isArray(data.results) ? data.results : [],
//     query: data.query || query,
//     images: processedImages,
//     number_of_results: data.number_of_results || 0,
//     answer: data?.answer
//   }
// }

// async function exaSearch(
//   query: string,
//   maxResults: number = 10,
//   _searchDepth: 'basic' | 'advanced',
//   includeDomains: string[] = [],
//   excludeDomains: string[] = []
// ): Promise<SearchResults> {
//   const apiKey = process.env.EXA_API_KEY
//   if (!apiKey) {
//     throw new Error('EXA_API_KEY is not set in the environment variables')
//   }

//   // Validate query parameter
//   if (!query || typeof query !== 'string') {
//     throw new Error('Query parameter is required and must be a string.')
//   }

//   const exa = new Exa(apiKey)
//   const exaResults = await exa.searchAndContents(query, {
//     highlights: true,
//     numResults: maxResults,
//     includeDomains,
//     excludeDomains
//   })

//   // Validate exaResults
//   if (!exaResults || !Array.isArray(exaResults.results)) {
//     throw new Error('Invalid data format from Exa API')
//   }

//   return {
//     answer:"ai",
//     results: exaResults.results.map((result: any) => ({
//       title: result.title,
//       url: result.url,
//       content: result.highlight || result.text
//     })),
//     query,
//     images: [],
//     number_of_results: exaResults.results.length
//   }
// }

// async function searxngSearch(
//   query: string,
//   maxResults: number = 10,
//   searchDepth: 'basic' | 'advanced',
//   includeDomains: string[] = [],
//   excludeDomains: string[] = []
// ): Promise<SearchResults> {
//   const apiUrl = process.env.SEARXNG_API_URL
//   if (!apiUrl) {
//     throw new Error('SEARXNG_API_URL is not set in the environment variables')
//   }

//   // Validate query parameter
//   if (!query || typeof query !== 'string') {
//     throw new Error('Query parameter is required and must be a string.')
//   }

//   try {
//     // Construct the URL with query parameters
//     const url = new URL(`${apiUrl}/search`)
//     url.searchParams.append('q', query)
//     url.searchParams.append('format', 'json')
//     url.searchParams.append('categories', 'general,images')

//     // Apply search depth settings
//     if (searchDepth === 'advanced') {
//       url.searchParams.append('time_range', '')
//       url.searchParams.append('safesearch', '0')
//       url.searchParams.append('engines', 'google,bing,duckduckgo,wikipedia')
//     } else {
//       url.searchParams.append('time_range', 'year')
//       url.searchParams.append('safesearch', '1')
//       url.searchParams.append('engines', 'google,bing')
//     }

//     // Fetch results from SearXNG
//     const response = await fetch(url.toString(), {
//       method: 'GET',
//       headers: {
//         Accept: 'application/json'
//       }
//     })

//     if (!response.ok) {
//       const errorText = await response.text()
//       console.error(`SearXNG API error (${response.status}):`, errorText)
//       throw new Error(
//         `SearXNG API error: ${response.status} ${response.statusText} - ${errorText}`
//       )
//     }

//     const data: SearXNGResponse = await response.json()

//     // Validate data structure
//     if (!data || typeof data !== 'object' || !Array.isArray(data.results)) {
//       throw new Error('Invalid data format from SearXNG API')
//     }
//     // Separate general results and image results, and limit to maxResults
//     const generalResults = data.results
//       .filter(result => !result.img_src)
//       .slice(0, maxResults)
//     const imageResults = data.results
//       .filter(result => result.img_src)
//       .slice(0, maxResults)
//     return {
//       answer:"ai",
//       results: generalResults.map(
//         (result: SearXNGResult): SearchResultItem => ({
//           title: result.title,
//           url: result.url,
//           content: result.content,
//         })
//       ),
//       query: data.query,
//       images: imageResults
//         .map(result => {
//           const imgSrc = result.img_src || ''
//           return imgSrc.startsWith('http') ? imgSrc : `${apiUrl}${imgSrc}`
//         })
//         .filter(Boolean),
//       number_of_results: data.number_of_results
//     }
//   } catch (error) {
//     console.error('SearXNG API error:', error)
//     throw error
//   }
// }


// Import necessary modules and types
import { tool } from 'ai'; // Function to create a tool
import { createStreamableValue } from 'ai/rsc'; // For streaming values in React Server Components
import Exa from 'exa-js'; // Exa API client
import { searchSchema } from '@/lib/schema/search'; // Schema for validating search parameters
import { SearchSection } from '@/components/search-section'; // UI component to display search results
import { ToolProps } from '.'; // Interface for tool properties (ensure the path is correct)
import { sanitizeUrl } from '@/lib/utils'; // Utility function to sanitize URLs
import {
  SearchResultImage,
  SearchResults,
  SearchResultItem,
  SearXNGResponse,
  SearXNGResult,
} from '@/lib/types'; // Types for search results and responses

// Export the search tool function
export const searchTool = ({ uiStream }: ToolProps) =>
  tool({
    description: 'Search the web for information',
    parameters: searchSchema,
    execute: async ({
      query,
      max_results,
      include_domains,
      exclude_domains,
    }) => {
      // Initialize variables
      let hasError = false;
      let fullResponse = '';

      // Create a streamable value to hold the search results
      const streamResults = createStreamableValue<string>();

      // Ensure uiStream is defined and has an update function
      if (!uiStream || typeof uiStream.update !== 'function') {
        throw new Error(
          'uiStream is not defined or does not have an update function.'
        );
      }

      // Update the UI stream with the SearchSection component
      uiStream.update(
        <SearchSection
          result={streamResults.value}
          includeDomains={include_domains}
        />
      );

      // Validate the query parameter
      if (!query || typeof query !== 'string') {
        throw new Error('Query parameter is required and must be a string.');
      }

      // Convert max_results to a number if it's a string
      const maxResults =
        typeof max_results === 'string'
          ? parseInt(max_results, 10)
          : max_results;

      if (isNaN(maxResults)) {
        throw new Error('max_results must be a valid number.');
      }

      // Ensure the query has at least 5 characters
      const filledQuery =
        query.length < 5 ? query + ' '.repeat(5 - query.length) : query;

      // Initialize the search result with default values
      let searchResult: SearchResults = {
        results: [],
        query: filledQuery,
        images: [],
        number_of_results: 0,
        answer: '',
      };

      // Get the search API to use from environment variables or default to 'tavily'
      const searchAPI =
        (process.env.SEARCH_API as 'tavily' | 'exa' | 'searxng') || 'tavily';

      // Set the search depth to 'advanced' by default
      const effectiveSearchDepth: 'basic' | 'advanced' = 'advanced';

      // console.log(
      //   `Using search API: ${searchAPI}, Search Depth: ${effectiveSearchDepth}`
      // );

      try {
        // Handle advanced search with SearXNG API
        if (searchAPI === 'searxng' && effectiveSearchDepth === 'advanced') {
          // Use the advanced search API route
          const baseUrl =
            process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

          // Make a POST request to the advanced search API
          const response = await fetch(`${baseUrl}/api/advanced-search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: filledQuery,
              maxResults: maxResults,
              searchDepth: effectiveSearchDepth,
              includeDomains: include_domains,
              excludeDomains: exclude_domains,
            }),
          });

          if (!response.ok) {
            throw new Error(
              `Advanced search API error: ${response.status} ${response.statusText}`
            );
          }

          const data = await response.json();

          // Validate response structure
          if (data && typeof data === 'object' && Array.isArray(data.results)) {
            searchResult = data;
          } else {
            throw new Error('Invalid data format from advanced search API');
          }
        } else {
          // Choose the appropriate search function based on the API
          switch (searchAPI) {
            case 'tavily':
              searchResult = await tavilySearch(
                filledQuery,
                maxResults,
                effectiveSearchDepth,
                include_domains,
                exclude_domains
              );
              break;
            case 'exa':
              searchResult = await exaSearch(
                filledQuery,
                maxResults,
                effectiveSearchDepth,
                include_domains,
                exclude_domains
              );
              break;
            case 'searxng':
              searchResult = await searxngSearch(
                filledQuery,
                maxResults,
                effectiveSearchDepth,
                include_domains,
                exclude_domains
              );
              break;
            default:
              throw new Error(`Unsupported search API: ${searchAPI}`);
          }
        }
      } catch (error: any) {
        console.error('Search API error:', error);
        hasError = true;
        searchResult = {
          results: [],
          query: filledQuery,
          images: [],
          number_of_results: 0,
          answer: '',
        };
        fullResponse = `An error occurred while searching for "${filledQuery}".`;
        uiStream.update(null); // Clear the UI stream on error
        streamResults.done();
        return searchResult;
      }

      // Process the search results and mark the stream as done
      streamResults.done(JSON.stringify(searchResult));

      // Return the search results
      return searchResult;
    },
  });

// Helper function for Tavily search with added error handling
async function tavilySearch(
  query: string,
  maxResults: number = 10,
  searchDepth: 'basic' | 'advanced' = 'advanced',
  includeDomains: string[] = [],
  excludeDomains: string[] = []
): Promise<SearchResults> {
  // Get the Tavily API key from environment variables
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error('TAVILY_API_KEY is not set in the environment variables');
  }

  // Validate the query parameter
  if (!query || typeof query !== 'string') {
    throw new Error('Query parameter is required and must be a string.');
  }

  const includeImageDescriptions = true;

  // Make a POST request to the Tavily API
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: Math.max(maxResults, 5),
      search_depth: searchDepth,
      include_images: true,
      include_image_descriptions: includeImageDescriptions,
      include_domains: includeDomains,
      exclude_domains: excludeDomains,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Tavily API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  // Validate and process data
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid data format from Tavily API');
  }

  // Process images
  const processedImages: SearchResultImage[] = includeImageDescriptions
    ? (data.images || [])
        .map(({ url, description }: { url: string; description: string }) => ({
          url: sanitizeUrl(url),
          description,
        }))
        .filter(
          (image: any): image is SearchResultImage =>
            typeof image === 'object' &&
            image.description !== undefined &&
            image.description !== ''
        )
    : (data.images || []).map((url: string) => ({
        url: sanitizeUrl(url),
        description: '',
      }));

  // Return the search results
  return {
    results: Array.isArray(data.results) ? data.results : [],
    query: data.query || query,
    images: processedImages,
    number_of_results: data.number_of_results || 0,
    answer: data?.answer,
  };
}

// Helper function for Exa search with added error handling
async function exaSearch(
  query: string,
  maxResults: number = 10,
  _searchDepth: 'basic' | 'advanced',
  includeDomains: string[] = [],
  excludeDomains: string[] = []
): Promise<SearchResults> {
  // Get the Exa API key from environment variables
  const apiKey = process.env.EXA_API_KEY;
  if (!apiKey) {
    throw new Error('EXA_API_KEY is not set in the environment variables');
  }

  // Validate the query parameter
  if (!query || typeof query !== 'string') {
    throw new Error('Query parameter is required and must be a string.');
  }

  // Initialize the Exa client
  const exa = new Exa(apiKey);

  // Perform the search using Exa API
  const exaResults = await exa.searchAndContents(query, {
    highlights: true,
    numResults: maxResults,
    includeDomains,
    excludeDomains,
  });

  // Validate Exa results
  if (!exaResults || !Array.isArray(exaResults.results)) {
    throw new Error('Invalid data format from Exa API');
  }

  // Map Exa results to the expected format
  return {
    answer: '', // Exa API does not provide an 'answer' field
    results: exaResults.results.map((result: any) => ({
      title: result.title,
      url: result.url,
      content: result.highlight || result.text,
    })),
    query,
    images: [],
    number_of_results: exaResults.results.length,
  };
}

// Helper function for SearXNG search with added error handling
async function searxngSearch(
  query: string,
  maxResults: number = 10,
  searchDepth: 'basic' | 'advanced',
  includeDomains: string[] = [],
  excludeDomains: string[] = []
): Promise<SearchResults> {
  // Get the SearXNG API URL from environment variables
  const apiUrl = process.env.SEARXNG_API_URL;
  if (!apiUrl) {
    throw new Error('SEARXNG_API_URL is not set in the environment variables');
  }

  // Validate the query parameter
  if (!query || typeof query !== 'string') {
    throw new Error('Query parameter is required and must be a string.');
  }

  try {
    // Construct the search URL with query parameters
    const url = new URL(`${apiUrl}/search`);
    url.searchParams.append('q', query);
    url.searchParams.append('format', 'json');
    url.searchParams.append('categories', 'general,images');

    // Apply search depth settings
    if (searchDepth === 'advanced') {
      url.searchParams.append('time_range', '');
      url.searchParams.append('safesearch', '0');
      url.searchParams.append('engines', 'google,bing,duckduckgo,wikipedia');
    } else {
      url.searchParams.append('time_range', 'year');
      url.searchParams.append('safesearch', '1');
      url.searchParams.append('engines', 'google,bing');
    }

    // Fetch results from SearXNG
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`SearXNG API error (${response.status}):`, errorText);
      throw new Error(
        `SearXNG API error: ${response.status} ${response.statusText} - ${errorText}`
      );
    }

    const data: SearXNGResponse = await response.json();

    // Validate data structure
    if (!data || typeof data !== 'object' || !Array.isArray(data.results)) {
      throw new Error('Invalid data format from SearXNG API');
    }

    // Separate general results and image results, limiting to maxResults
    const generalResults = data.results
      .filter((result) => !result.img_src)
      .slice(0, maxResults);
    const imageResults = data.results
      .filter((result) => result.img_src)
      .slice(0, maxResults);

    // Map results to the expected format
    return {
      answer: '', // SearXNG API does not provide an 'answer' field
      results: generalResults.map(
        (result: SearXNGResult): SearchResultItem => ({
          title: result.title,
          url: result.url,
          content: result.content,
        })
      ),
      query: data.query,
      images: imageResults
        .map((result) => {
          const imgSrc = result.img_src || '';
          return imgSrc.startsWith('http') ? imgSrc : `${apiUrl}${imgSrc}`;
        })
        .filter(Boolean),
      number_of_results: data.number_of_results,
    };
  } catch (error) {
    console.error('SearXNG API error:', error);
    throw error;
  }
}
