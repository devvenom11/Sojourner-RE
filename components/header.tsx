'use client'

import React from 'react'
import { ModeToggle } from './mode-toggle'
import { cn } from '@/lib/utils'

export const Header: React.FC = () => {
  return (
    <header className="fixed w-full p-1 md:p-2 flex justify-between items-center z-10 backdrop-blur md:backdrop-blur-none bg-background/80 md:bg-transparent">
      <div>
          <a href="https://sojourner.world/?page_id=128" target="_blank" rel="noopener noreferrer">
          <img src="/icon.jpg" alt="Logo" className={cn('w-10 h-13')} />
          <span className="sr-only">Morphic</span>
        </a>
      </div>
      <div className="flex gap-0.5">
        <ModeToggle />
      </div>
    </header>
  )
}

export default Header