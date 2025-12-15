'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useUserRole } from '@/hooks/use-user-role'
import type { UserRole } from '@/types'
import { Loader2 } from 'lucide-react'

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles: UserRole[]
  fallbackPath?: string
}

export function RoleGuard({ children, allowedRoles, fallbackPath = '/dashboard' }: RoleGuardProps) {
  const { role, loading } = useUserRole()
  const router = useRouter()

  useEffect(() => {
    if (!loading && role) {
      if (!allowedRoles.includes(role)) {
        // Redirecionar para dashboard específico do role
        const rolePath: Record<UserRole, string> = {
          patient: '/dashboard/patient',
          doctor: '/dashboard/doctor',
          admin: '/dashboard/admin',
          attendant: '/dashboard/attendant',
        }
        router.push(rolePath[role] || fallbackPath)
      }
    } else if (!loading && !role) {
      // Se não tem role, redirecionar para login
      router.push('/login')
    }
  }, [role, loading, allowedRoles, fallbackPath, router])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
      </div>
    )
  }

  if (!role || !allowedRoles.includes(role)) {
    return null
  }

  return <>{children}</>
}

