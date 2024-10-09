import type { Metadata, Viewport } from 'next'
import { Inter as FontSans } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'
import { ThemeProvider } from '@/components/theme-provider'
import Header from '@/components/header'
import Footer from '@/components/footer'
import { Sidebar } from '@/components/sidebar'
import { Toaster } from '@/components/ui/sonner'
import { AppStateProvider } from '@/lib/utils/app-state'
import GoogleTagManager from '@/components/GoogleTagManager' // Import the new component

const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans'
})

const title = 'Sojourner'
const description =
  'Sojourner For Peace, Love and Purpose An Autopoetic system aligned with the Beloved Community Pledge and the Beloved Community License.'

export const metadata: Metadata = {
  metadataBase: new URL('https://sojourner.world'),
  title,
  description,
  openGraph: {
    title,
    description
  },
  twitter: {
    title,
    description,
    card: 'summary_large_image',
    creator: '@miiura'
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  minimumScale: 1,
  maximumScale: 1
}

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* No script tags here */}
      </head>
      <body className={cn('font-sans antialiased', fontSans.variable)}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppStateProvider>
            <Header />
            <GoogleTagManager /> {/* Use the new component */}
            {children}
            <Sidebar />
            <Toaster />
          </AppStateProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}