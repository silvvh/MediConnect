'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserRole } from '@/types'

interface UseUserRoleReturn {
  role: UserRole | null
  loading: boolean
  userId: string | null
  isDoctor: boolean
  isPatient: boolean
  isAdmin: boolean
  isAttendant: boolean
}

export function useUserRole(): UseUserRoleReturn {
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchRole() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setRole(null)
          setUserId(null)
          setLoading(false)
          return
        }

        setUserId(user.id)

        // Buscar role do perfil
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile) {
          setRole(profile.role as UserRole)
        } else {
          setRole(null)
        }
      } catch (error) {
        console.error('Erro ao buscar role:', error)
        setRole(null)
      } finally {
        setLoading(false)
      }
    }

    fetchRole()
  }, [])

  return {
    role,
    loading,
    userId,
    isDoctor: role === 'doctor',
    isPatient: role === 'patient',
    isAdmin: role === 'admin',
    isAttendant: role === 'attendant',
  }
}

