import { Button } from '@/components/ui/button'

const exampleMessages = [
  {
    heading: 'Who is Sojourner Truth?',
    message: 'Who is Sojourner Truth?'
  },
  {
    heading: 'What is the Bodhisattva prayer for humanity?',
    message: 'What is the Bodhisattva prayer for humanity?'
  },
  {
    heading: 'Who is Octavia E. Butler?',
    message: 'Who is Octavia E. Butler?'
  },
  {
    heading: 'Who is Sylvia Wynter?',
    message: 'Who is Sylvia Wynter?'
  }

]
export function EmptyScreen({
  submitMessage,
  className
}: {
  submitMessage: (message: string) => void
  className?: string
}) {
  return (
    <div className={`mx-auto w-full transition-all ${className}`}>
      <div className="bg-background p-2">
        <div className="mt-4 flex flex-row flex-wrap justify-center items-start space-x-2 mb-4">
          {exampleMessages.map((message, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-auto p-2 text-base rounded-md border transition-transform duration-200 ease-in-out transform hover:scale-105"
              name={message.message}
              onClick={async () => {
                submitMessage(message.message)
              }}
            >
              {message.heading}
            </Button>
          ))}
        </div>
      </div>
    </div>
  )
}
