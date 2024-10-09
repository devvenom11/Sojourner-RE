'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { AI, UIState } from '@/app/actions'
import { useUIState, useActions, useAIState } from 'ai/rsc'
import { cn } from '@/lib/utils'
import { UserMessage } from './user-message'
import { Button } from './ui/button'
import { ArrowRight, Plus } from 'lucide-react'
import { EmptyScreen } from './empty-screen'
import Textarea from 'react-textarea-autosize'
import { generateId } from 'ai'
import { useAppState } from '@/lib/utils/app-state'

interface ChatPanelProps {
  messages: UIState
  query?: string
}

export function ChatPanel({ messages, query }: ChatPanelProps) {
  const [input, setInput] = useState('')
  const [showEmptyScreen, setShowEmptyScreen] = useState(false)
  const [, setMessages] = useUIState<typeof AI>()
  const [aiMessage, setAIMessage] = useAIState<typeof AI>()
  const { isGenerating, setIsGenerating } = useAppState()
  const { submit } = useActions()
  const router = useRouter()
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const isFirstRender = useRef(true) // For development environment

  const [isButtonPressed, setIsButtonPressed] = useState(false)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [viewportHeight, setViewportHeight] = useState<number | undefined>(
    undefined
  )
  const [viewportWidth, setViewportWidth] = useState<number | undefined>(
    undefined
  )
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const iOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    setIsIOS(iOS)
    if (isButtonPressed) {
      inputRef.current?.focus()
      setIsButtonPressed(false)
    }
  }, [isButtonPressed])

  useEffect(() => {
    const updateDimensions = () => {
      const width = window.visualViewport?.width ?? window.innerWidth
      const height = window.visualViewport?.height ?? window.innerHeight
      setViewportHeight(height)
      setViewportWidth(width)
      setIsMobile(width <= 768)
    }

    updateDimensions()
    window.visualViewport?.addEventListener('resize', updateDimensions)
    window.addEventListener('resize', updateDimensions)
    window.addEventListener('orientationchange', updateDimensions)

    return () => {
      window.visualViewport?.removeEventListener('resize', updateDimensions)
      window.removeEventListener('resize', updateDimensions)
      window.removeEventListener('orientationchange', updateDimensions)
    }
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
    if (query) {
      handleQuerySubmit(query)
    }
  }, [query])

  useEffect(() => {
    const lastMessage = aiMessage.messages.slice(-1)[0]
    if (lastMessage?.type === 'followup' || lastMessage?.type === 'inquiry') {
      setIsGenerating(false)
    }
  }, [aiMessage, setIsGenerating])

  const handleQuerySubmit = async (query: string, formData?: FormData) => {
    setInput(query)
    setIsGenerating(true)

    setMessages(currentMessages => [
      ...currentMessages,
      { id: generateId(), component: <UserMessage message={query} /> }
    ])

    const data = formData || new FormData()
    if (!formData) {
      data.append('input', query)
    }

    const responseMessage = await submit(data)
    setMessages(currentMessages => [...currentMessages, responseMessage])
    setInput('')
    setHasSubmitted(true)
    setIsGenerating(false)
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (isButtonPressed) {
      handleClear()
      setIsButtonPressed(false)
    }
    const formData = new FormData(e.currentTarget)
    await handleQuerySubmit(input, formData)
  }

  const handleClear = () => {
    setIsButtonPressed(true)
    setIsGenerating(false)
    setMessages([])
    setAIMessage({ messages: [], chatId: '' })
    setInput('') // Clear the input field
    setHasSubmitted(false)
    // Remove router.push('/') to avoid navigation
  }

  const formPositionClass = isIOS
    ? 'fixed bottom-0 left-0 right-0 mx-auto flex flex-col items-center justify-end'
    : hasSubmitted || messages.length > 0
    ? 'fixed bottom-8 left-0 right-0 mx-auto flex flex-col items-center justify-center'
    : 'fixed bottom-8 left-0 right-0 mx-auto flex flex-col items-center justify-center'

  const imageContainerClass = isIOS
    ? 'absolute bottom-0 left-0 right-0'
    : 'mb-4'

  const imageHeight = isIOS
    ? '90vh'
    : viewportHeight
    ? `${viewportHeight * 0.7}px`
    : '70vh'
  const imageWidth = isIOS
    ? '100vw'
    : viewportWidth
    ? `${viewportWidth * 0.5}px`
    : '50vw'

  if (hasSubmitted || messages.length > 0) {
    return (
      <div className={formPositionClass}>
        <Button
          type="button"
          variant={'secondary'}
          className="rounded-full bg-secondary/80 group transition-all hover:scale-105"
          onClick={() => handleClear()}
          disabled={isGenerating} // Disable button when generating
        >
          <span className="text-sm mr-2 group-hover:block hidden animate-in fade-in duration-300">
            New
          </span>
          <Plus size={18} className="group-hover:rotate-90 transition-all" />
        </Button>
      </div>
    )
  }

  return (
    <div className={formPositionClass}>
      <div
        className={`image-container ${imageContainerClass}`}
        style={{
          height: imageHeight,
          width: imageWidth,
          backgroundImage: 'url(/icon.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center center'
        }}
      ></div>
      <form
        onSubmit={handleSubmit}
        className="w-full px-6"
        style={{ maxWidth: isMobile ? '90vw' : '50vw', width: '100%' }}
      >
        <div
          className="relative flex items-center justify-center w-full"
          style={{ maxWidth: isMobile ? '90vw' : '50vw', width: '100%' }}
        >
          <Textarea
            ref={inputRef}
            name="input"
            placeholder="Ask Sojourner A.I. anything..."
            value={input}
            className="leading-5 resize-none pl-8 sm:pl-10 pr-14 h-12 rounded-full bg-muted flex min-h-[70px] w-full border border-input py-6 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (
                e.key === 'Enter' &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                // Prevent the default action to avoid adding a new line
                if (input.trim().length === 0) {
                  e.preventDefault()
                  return
                }
                e.preventDefault()
                const textarea = e.target as HTMLTextAreaElement
                textarea.form?.requestSubmit()
              }
            }}
            onHeightChange={height => {
              if (!inputRef.current) return
              const initialHeight = 70
              const initialBorder = 32
              const multiple = (height - initialHeight) / 20
              const newBorder = initialBorder - 4 * multiple
              inputRef.current.style.borderRadius =
                Math.max(8, newBorder) + 'px'
            }}
            onFocus={() => setShowEmptyScreen(true)}
            onBlur={() => setShowEmptyScreen(false)}
          />
          <Button
            type="submit"
            size={'icon'}
            variant={'ghost'}
            className="absolute right-2 top-1/2 transform -translate-y-1/2"
            disabled={input.length === 0}
          >
            <ArrowRight size={20} />
          </Button>
        </div>
        <EmptyScreen
          submitMessage={message => setInput(message)}
          className={cn(showEmptyScreen ? 'visible' : 'invisible')}
        />
      </form>
    </div>
  )
}
