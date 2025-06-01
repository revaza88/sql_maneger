'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/lib/store/auth-store'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Database, LogOut, Moon, Sun, User } from 'lucide-react'
import { useTheme } from 'next-themes'

export function MainNav() {
  const pathname = usePathname()
  const { user, clearAuth } = useAuthStore()
  const { theme, setTheme } = useTheme()

  const handleLogout = () => {
    clearAuth()
  }

  const navigation = [
    { name: 'Databases', href: '/databases' },
    { name: 'SQL Server', href: '/sqlserver' },
    { name: 'Profile', href: '/profile' },
    ...(user?.role?.toLowerCase() === 'admin' ? [{ name: 'Admin Panel', href: '/admin' }] : []),
  ]

  return (
    <nav className="flex items-center space-x-4 lg:space-x-6 mx-6">
      {/* Logo */}
      <Link href="/" className="flex items-center space-x-2">
        <Database className="h-6 w-6" />
        <span className="font-bold">SQL Manager</span>
      </Link>

      {/* Navigation Links */}
      <div className="flex items-center space-x-4 lg:space-x-6">
        {navigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`text-sm font-medium transition-colors hover:text-primary ${
              pathname === item.href
                ? 'text-foreground'
                : 'text-muted-foreground'
            }`}
          >
            {item.name}
          </Link>
        ))}
      </div>

      <div className="ml-auto flex items-center space-x-4">
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* User Menu */}
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {user.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              {user?.role?.toLowerCase() === 'admin' && (
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="flex items-center cursor-pointer">
                    <Database className="mr-2 h-4 w-4" />
                    <span>Admin Panel</span>
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => handleLogout()}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </nav>
  )
}
