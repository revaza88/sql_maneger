'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/store/auth-store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { 
  Database, 
  Server, 
  Shield, 
  Zap, 
  Users, 
  BarChart3,
  ArrowRight,
  CheckCircle,
  Globe
} from 'lucide-react'
import Link from 'next/link'

export default function Home() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted && user) {
      // Delay redirect slightly to show the page
      const timer = setTimeout(() => {
        router.push('/databases')
      }, 1000)
      return () => clearTimeout(timer)
    }
  }, [user, router, mounted])

  if (!mounted) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </main>
    )
  }

  return (
    <main className="flex-1 overflow-hidden">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
        <div className="absolute inset-0 opacity-30"></div>
        
        <div className="relative max-w-7xl mx-auto text-center">
          <div className="floating">
            <div className="inline-flex items-center space-x-3 mb-8">
              <div className="relative">
                <div className="absolute -inset-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur opacity-25 pulse-glow"></div>
                <div className="relative bg-white dark:bg-gray-900 rounded-full p-4 shadow-lg">
                  <Database className="h-12 w-12 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight mb-6">
            <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 bg-clip-text text-transparent">
              SQL Manager V4
            </span>
          </h1>
          
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            Professional database management platform with advanced security, 
            real-time monitoring, and intuitive administration tools.
          </p>
          
          {user ? (
            <div className="space-y-4">
              <p className="text-lg text-green-600 dark:text-green-400 font-medium">
                Welcome back, {user.name}! 
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                Redirecting to your dashboard...
              </p>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/login">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
                >
                  Get Started
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/register">
                <Button 
                  variant="outline" 
                  size="lg"
                  className="border-2 border-gray-300 hover:border-blue-500 hover:text-blue-600 transition-all duration-300"
                >
                  Create Account
                </Button>
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Powerful Database Management
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Everything you need to manage your SQL Server databases efficiently and securely
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature Cards */}
            {[
              {
                icon: Database,
                title: "Database Management",
                description: "Create, backup, restore, and manage multiple databases with ease",
                color: "blue"
              },
              {
                icon: Server,
                title: "SQL Server Integration",
                description: "Direct integration with SQL Server for seamless operations",
                color: "purple"
              },
              {
                icon: Shield,
                title: "Advanced Security",
                description: "Role-based access control and secure authentication",
                color: "green"
              },
              {
                icon: BarChart3,
                title: "Real-time Analytics",
                description: "Monitor performance and usage with beautiful charts",
                color: "orange"
              },
              {
                icon: Users,
                title: "User Management",
                description: "Admin tools for managing users and permissions",
                color: "red"
              },
              {
                icon: Zap,
                title: "High Performance",
                description: "Optimized for speed and reliability",
                color: "yellow"
              }
            ].map((feature, index) => (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-2 border-0 shadow-md bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm">
                <CardHeader className="text-center pb-4">
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-lg bg-${feature.color}-100 dark:bg-${feature.color}-900/30 mb-4 mx-auto group-hover:scale-110 transition-transform duration-300`}>
                    <feature.icon className={`h-6 w-6 text-${feature.color}-600 dark:text-${feature.color}-400`} />
                  </div>
                  <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-gray-600 dark:text-gray-300 text-center">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            {[
              { number: "99.9%", label: "Uptime", icon: CheckCircle },
              { number: "10K+", label: "Databases Managed", icon: Database },
              { number: "24/7", label: "Support", icon: Globe }
            ].map((stat, index) => (
              <div key={index} className="space-y-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 mb-4">
                  <stat.icon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                  {stat.number}
                </div>
                <div className="text-lg text-gray-600 dark:text-gray-300">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 sm:px-6 lg:px-8 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto text-center">
          <div className="flex items-center justify-center space-x-2 mb-4">
            <Database className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              SQL Manager V4
            </span>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            Professional Database Management Platform
          </p>
        </div>
      </footer>
    </main>
  )
}
