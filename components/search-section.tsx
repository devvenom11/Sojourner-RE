'use client'

import { SearchResults } from './search-results'
import { DefaultSkeleton } from './default-skeleton'
import { SearchResultsImageSection } from './search-results-image'
import { Section } from './section'
import { ToolBadge } from './tool-badge'
import type { SearchResults as TypeSearchResults } from '@/lib/types'
import { useStreamableValue, StreamableValue } from 'ai/rsc'
import { AnswerSectionGenerated } from './answer-section-generated'

export type SearchSectionProps = {
  result?: StreamableValue<string>
  includeDomains?: string[]
}

export function SearchSection({ result, includeDomains }: SearchSectionProps) {
  const [data, error, pending] = useStreamableValue(result)

  // const uiStream = createStreamableUI()

  const searchResults: TypeSearchResults = data ? JSON.parse(data) : undefined
  const includeDomainsString = includeDomains
    ? ` [${includeDomains.join(', ')}]`
    : ''
  console.log("Result Received", searchResults);


  return (
    <div>
      {!pending && data ? (
        <>
          {console.log("Result Received", searchResults)}

          <Section size="sm" className="pt-2 pb-0">
            <ToolBadge tool="search">{`${searchResults.query}${includeDomainsString}`}</ToolBadge>
          </Section>
          {searchResults.images && searchResults.images.length > 0 && (
            <Section title="Images">
              <SearchResultsImageSection
                images={searchResults.images}
                query={searchResults.query}
              />
            </Section>
          )}
          <Section title="Sources">
            <SearchResults results={searchResults.results} />
          </Section>
          <AnswerSectionGenerated result={searchResults.answer} >
          </AnswerSectionGenerated>

        </>
      ) : (
        <DefaultSkeleton />
      )}
    </div>
  )
}
