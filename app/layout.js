import './globals.css'
import { Toaster } from '@/components/ui/sonner'

export const metadata = {
  title: 'UFS — Operations Platform',
  description: 'CRM, Call Center, QA & Commission management for UFS operations',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background font-sans antialiased">
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}
