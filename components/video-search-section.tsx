'use client'

import { DefaultSkeleton } from './default-skeleton'
import { Section } from './section'
import type { SerperSearchResults } from '@/lib/types'
import { StreamableValue, useStreamableValue } from 'ai/rsc'
import { VideoSearchResults } from './video-search-results'
import { ToolBadge } from './tool-badge'
import { AnswerSectionGenerated } from './answer-section-generated'


export type VideoSearchSectionProps = {
  result?: StreamableValue<string>
}

export function VideoSearchSection({ result }: VideoSearchSectionProps) {
  const [data, error, pending] = useStreamableValue(result)
  const searchResults: SerperSearchResults = data ? JSON.parse(data) : undefined
  console.log("Data :", data);

  return (
    <div>
      {!pending && data ? (
        <>
          <Section size="sm" className="pt-2 pb-0">
            <ToolBadge tool="search">{`${searchResults.searchParameters.q}`}</ToolBadge>
          </Section>
          <Section title="Videos">
            <VideoSearchResults results={searchResults} />
          </Section>
          {/* <Section title="Answer">
            <AnswerSectionGenerated result={searchResults} />
          </Section> */}
        </>
      ) : (
        <Section className="pt-2 pb-0">
          <DefaultSkeleton />
        </Section>
      )}
    </div>
  )
}
