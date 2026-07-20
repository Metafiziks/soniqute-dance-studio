"use client";

import { WagmiConfig } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { config } from '@/lib/wagmi.config'
import { AuthProvider } from '@/lib/auth/clientAuth'

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <WagmiConfig config={config}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
      </WagmiConfig>
    </AuthProvider>
  )
}
