import { tool } from 'ai'
import { createStreamableValue } from 'ai/rsc'
import { searchSchema } from '@/lib/schema/search'
import { ToolProps } from '.'
import { VideoSearchSection } from '@/components/video-search-section'

export const videoSearchTool = ({ uiStream, fullResponse }: ToolProps) =>
  tool({
    description: 'Search for videos from YouTube',
    parameters: searchSchema,
    execute: async ({ query, max_results, search_depth }) => {
      let hasError = false

      // Validate and parse max_results
      let maxResults: number
      if (typeof max_results === 'string') {
        maxResults = parseInt(max_results, 10)
        if (isNaN(maxResults)) {
          throw new Error('max_results must be a valid number.')
        }
      } else if (typeof max_results === 'number') {
        maxResults = max_results
      } else {
        maxResults = 10 // Default value if not provided
      }

      // Validate query parameter
      if (!query || typeof query !== 'string') {
        throw new Error('Query parameter is required and must be a string.')
      }

      // Append the search section
      const streamResults = createStreamableValue<string>()
      uiStream.append(<VideoSearchSection result={streamResults.value} />)

      let searchResult
      try {
        const response = await fetch('https://google.serper.dev/videos', {
          method: 'POST',
          headers: {
            'X-API-KEY': process.env.SERPER_API_KEY || '',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            q: query,
            num: maxResults // Use maxResults in the API request
          })
        })
        if (!response.ok) {
          throw new Error(`Network response was not ok: ${response.statusText}`)
        }
        searchResult = await response.json()
      } catch (error) {
        console.error('Video Search API error:', error)
        hasError = true
      }

      if (hasError || !searchResult) {
        fullResponse = `An error occurred while searching for videos with "${query}".`
        uiStream.update(null)
        streamResults.done()
        return null
      }

      // Ensure searchResult is defined and has the expected structure
      if (!searchResult || typeof searchResult !== 'object') {
        throw new Error('Invalid data format from Video Search API')
      }

      streamResults.done(JSON.stringify(searchResult))

      return searchResult
    }
  })
