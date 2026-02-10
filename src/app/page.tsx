'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function Home() {
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'error'>('checking')
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    async function testConnection() {
      try {
        // Test connection with a simple query to a system table
        const { data, error } = await supabase
          .from('_supabase_migrations')
          .select('version')
          .limit(1)

        if (error) {
          // If migrations table doesn't exist yet, that's still a valid connection
          // The error would be about the table not existing, not a connection issue
          if (error.message.includes('does not exist') || error.code === 'PGRST204') {
            setConnectionStatus('connected')
          } else {
            setConnectionStatus('error')
            setErrorMessage(error.message)
          }
        } else {
          setConnectionStatus('connected')
        }
      } catch (err) {
        setConnectionStatus('error')
        setErrorMessage(err instanceof Error ? err.message : 'Unknown error')
      }
    }

    testConnection()
  }, [])

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-primary">
      <h1 className="text-4xl font-bold text-white mb-8">
        Pierce Land & Cattle
      </h1>
      <div className="bg-white/10 px-6 py-4 rounded-lg">
        <p className="text-white text-lg">
          <span className="font-semibold">Supabase: </span>
          {connectionStatus === 'checking' && 'Checking connection...'}
          {connectionStatus === 'connected' && (
            <span className="text-green">Connected ✓</span>
          )}
          {connectionStatus === 'error' && (
            <span className="text-red-400">Error - {errorMessage}</span>
          )}
        </p>
      </div>
    </main>
  );
}
