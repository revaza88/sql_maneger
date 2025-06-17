'use client'

import Image from 'next/image'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/auth-store'

export default function Home() {
  const router = useRouter()
  const { user } = useAuthStore()

  useEffect(() => {
    if (user) {
      router.push('/databases')
    } else {
      router.push('/login')
    }
  }, [user, router])

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <p>Loading...</p>
    </main>
  )
}
