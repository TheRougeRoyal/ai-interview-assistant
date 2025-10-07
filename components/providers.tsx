"use client"

import { store, getPersistor } from '@/store'
import { Provider } from 'react-redux'
import { PersistGate } from 'redux-persist/integration/react'
import { useEffect, useState } from 'react'
import type { Persistor } from 'redux-persist'
import AuthProvider from '@/components/auth/AuthProvider'


function Providers({ children }: { children: React.ReactNode }) {
  const [persistor, setPersistor] = useState<Persistor | null>(null)
  
  useEffect(() => {
    setPersistor(getPersistor())
  }, [])
  
  return (
    <Provider store={store}>
      {persistor ? (
        <PersistGate loading={null} persistor={persistor}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </PersistGate>
      ) : (
        <AuthProvider>
          {children}
        </AuthProvider>
      )}
    </Provider>
  )
}

export default Providers
