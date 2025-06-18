'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/auth-store'
import { MainNav } from './main-nav'

interface RootLayoutProps {
  children: React.ReactNode
}

const publicPaths = ['/login', '/register', '/forgot-password']

export function RootLayoutClient({ children }: RootLayoutProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuthStore()

  useEffect(() => {
    if (!user && !publicPaths.includes(pathname)) {
      router.push('/login')
    }
  }, [user, pathname, router])

  const isPublicPage = publicPaths.includes(pathname)

  if (!user && !isPublicPage) {
    return null // or loading state
  }

  return (
    <div className="flex min-h-screen flex-col">
      {!isPublicPage && <MainNav />}
      <main className="flex-1 container mx-auto py-6">
        {children}
      </main>
    </div>
  )
}
