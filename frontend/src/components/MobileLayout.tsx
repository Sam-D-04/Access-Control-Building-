import { ReactNode } from 'react'

interface MobileLayoutProps {
  children: ReactNode
  title?: string
  showBack?: boolean
  onBack?: () => void
}

export default function MobileLayout({ children, title, showBack, onBack }: MobileLayoutProps) {
  return (
    <div className="gradient-bg min-h-screen">
      {/* Mobile Header */}
      <header className="bg-gradient-to-r from-cyan-600 to-red-600 shadow-lg sticky top-0 z-10">
        <div className="px-4 py-4 flex items-center">
          {showBack && (
            <button onClick={onBack} className="mr-3 text-white hover:text-white/80">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          <h1 className="text-xl font-bold text-white flex-1">{title || 'Access Control'}</h1>
          <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="p-4">{children}</main>
    </div>
  )
}
