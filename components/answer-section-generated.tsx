'use client'

import { Section } from './section'
import { BotMessage } from './message'

export type AnswerSectionProps = {
  result: string
}

export function AnswerSectionGenerated({ result }: AnswerSectionProps | any) {
  return (
    <div>
      <Section title="Answer">
        <BotMessage content={result} />
      </Section>
    </div>
  )
}
