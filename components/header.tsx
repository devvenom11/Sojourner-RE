import React from 'react'
import { ModeToggle } from './mode-toggle'
import logo from "@/public/icon.jpg"
import HistoryContainer from './history-container'
import {
  ClerkProvider,
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton
} from '@clerk/nextjs'
import Image from 'next/image'

export const Header: React.FC = async () => {
  return (
    <header className="fixed w-full p-1 md:p-2 flex justify-between items-center z-10 backdrop-blur md:backdrop-blur-none bg-background/80 md:bg-transparent">
      <div>
        <a href="/">
          {/* <IconLogo className={cn('w-5 h-5')} /> */}
          <Image src={logo} width={20} height={20} alt='Logo' className="rounded-full ml-1" />
          <span className="sr-only">Sojourner-RE</span>
        </a>
      </div>
      <div className="flex gap-0.5">
        <SignedOut>
          <SignInButton />
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
        <ModeToggle />
        <HistoryContainer location="header" />
      </div>
    </header>
  )
}

export default Header
