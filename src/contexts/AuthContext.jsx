import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../supabase/client'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error cargando perfil:', error)
      setProfile(null)
      return
    }

    setProfile(data)
  }

  useEffect(() => {
    const loadSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      setUser(session?.user ?? null)

      if (session?.user) {
        await loadProfile(session.user.id)
      }

      setLoading(false)
    }

    loadSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Si el enlace de recuperación cayó en otra página, se lleva a /restablecer
      if (event === 'PASSWORD_RECOVERY' && window.location.pathname !== '/restablecer') {
        window.location.replace('/restablecer')
        return
      }

      const currentUser = session?.user ?? null

      setUser(currentUser)

      if (currentUser) {
        await loadProfile(currentUser.id)
      } else {
        setProfile(null)
      }

      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        setProfile,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
