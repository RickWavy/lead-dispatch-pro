import './globals.css'
import { Toaster } from '@/components/ui/sonner'

export const metadata = {
  title: 'Sentinel CRM — SA Insurance Operations',
  description: 'Multi-tenant CRM, Call Center, QA & Commission management for South African operations',
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
