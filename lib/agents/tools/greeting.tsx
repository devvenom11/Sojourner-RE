import { tool } from 'ai'
import { createStreamableValue } from 'ai/rsc'
import { searchSchema } from '@/lib/schema/search'
import { ToolProps } from '.'
import { VideoSearchSection } from '@/components/video-search-section'

export const greetingTool = ({ uiStream, fullResponse }: ToolProps) =>
  tool({
    description: 'Use to Greeting or casual conversation',
    parameters: searchSchema,
    execute: async ({ query }) => {
      let hasError = false
      return query
    }
  })
