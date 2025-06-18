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
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Database, 
  LogOut, 
  Moon, 
  Sun, 
  User, 
  Server,
  BarChart3,
  Shield,
  ChevronDown,
  Home
} from 'lucide-react'
import { useTheme } from 'next-themes'

export function MainNav() {
  const pathname = usePathname()
  const { user, clearAuth } = useAuthStore()
  const { theme, setTheme } = useTheme()

  const handleLogout = () => {
    clearAuth()
    window.location.href = '/login'
  }

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Databases', href: '/databases', icon: Database },
    { name: 'SQL Server', href: '/sqlserver', icon: Server },
    { name: 'Profile', href: '/profile', icon: User },
  ]

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-gray-950/95 dark:supports-[backdrop-filter]:bg-gray-950/60">
      <div className="container flex h-16 items-center justify-between px-4">
        {/* Left side - Logo and Navigation */}
        <div className="flex items-center space-x-8">
          {/* Logo with enhanced styling */}
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-200"></div>
              <div className="relative bg-white dark:bg-gray-950 rounded-lg p-2">
                <Database className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-lg bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                SQL Manager
              </span>
              <span className="text-xs text-muted-foreground -mt-1">
                Database Management
              </span>
            </div>
          </Link>

          {/* Navigation Links with enhanced styling */}
          <div className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.name}</span>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Right side - Theme toggle and User menu */}
        <div className="flex items-center space-x-3">
          {/* Theme Toggle with enhanced styling */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="relative h-9 w-9 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* User Menu with enhanced styling */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="relative h-9 rounded-lg px-3 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-7 w-7 border-2 border-white shadow-md dark:border-gray-800">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                        {user.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:flex flex-col items-start">
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {user.name}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                        {user.role}
                      </span>
                    </div>
                    <ChevronDown className="h-3 w-3 text-gray-400" />
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 p-2" align="end" forceMount>
                <DropdownMenuLabel className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 rounded-lg mb-2">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10 border-2 border-white shadow-md dark:border-gray-800">
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                        {user.name
                          .split(' ')
                          .map((n) => n[0])
                          .join('')
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{user.name}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">{user.email}</p>
                      <p className="text-xs text-blue-600 dark:text-blue-400 capitalize font-medium">
                        {user.role} User
                      </p>
                    </div>
                  </div>
                </DropdownMenuLabel>
                
                <DropdownMenuItem asChild>
                  <Link href="/profile" className="flex items-center cursor-pointer p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <User className="mr-3 h-4 w-4 text-gray-500" />
                    <span>Profile Settings</span>
                  </Link>
                </DropdownMenuItem>
                
                {user?.role?.toLowerCase() === 'admin' && (
                  <>
                    <DropdownMenuSeparator className="my-2" />
                    <DropdownMenuLabel className="px-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Admin Tools
                    </DropdownMenuLabel>
                    <DropdownMenuItem asChild>
                      <Link href="/admin" className="flex items-center cursor-pointer p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors">
                        <Shield className="mr-3 h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span>Admin Panel</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/dashboard" className="flex items-center cursor-pointer p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors">
                        <BarChart3 className="mr-3 h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span>Dashboard</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/databases" className="flex items-center cursor-pointer p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors">
                        <Database className="mr-3 h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span>Manage Databases</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href="/admin/sql-server" className="flex items-center cursor-pointer p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors">
                        <Server className="mr-3 h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span>SQL Server Management</span>
                      </Link>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem asChild>
                      <Link href="/admin/backup" className="flex items-center cursor-pointer p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors">
                        <Database className="mr-3 h-4 w-4 text-green-600 dark:text-green-400" />
                        <span>Backup Management</span>
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
                
                <DropdownMenuSeparator className="my-2" />
                <DropdownMenuItem 
                  onClick={() => handleLogout()}
                  className="flex items-center cursor-pointer p-2 rounded-lg text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 transition-colors"
                >
                  <LogOut className="mr-3 h-4 w-4" />
                  <span>Sign Out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            /* Enhanced login button when user is not authenticated */
            <Link href="/login">
              <Button 
                variant="default" 
                size="sm"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-200"
              >
                <User className="mr-2 h-4 w-4" />
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
