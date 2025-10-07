// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import ProtectedRoute from '@/components/auth/ProtectedRoute'

// mock next/navigation to capture pushes
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))

function makeStore(authState: any) {
  const reducer = {
    auth: () => authState,
  }
  return configureStore({ reducer })
}

describe('ProtectedRoute', () => {
  it('renders children when user has allowed role', () => {
    const store = makeStore({
      user: { id: '1', email: 'a@b.com', role: 'interviewee', createdAt: '', updatedAt: '' },
      isInitialized: true,
      isLoading: false,
      token: null,
      error: null,
    })

    render(
      <Provider store={store}>
        <ProtectedRoute allowedRoles={[ 'interviewee' ]}>
          <div>OK</div>
        </ProtectedRoute>
      </Provider>
    )

    expect(screen.getByText('OK')).toBeDefined()
    expect(mockPush).not.toHaveBeenCalled()
  })

  it('redirects to login when no user', async () => {
    const store = makeStore({ user: null, isInitialized: true, isLoading: false })

    render(
      <Provider store={store}>
        <ProtectedRoute allowedRoles={[ 'interviewee' ]}>
          <div>SHOULD NOT SEE</div>
        </ProtectedRoute>
      </Provider>
    )

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/auth/login')
    })
  })

  it('shows access denied for wrong role', () => {
    const store = makeStore({
      user: { id: '2', email: 'x@y.com', role: 'interviewer', createdAt: '', updatedAt: '' },
      isInitialized: true,
      isLoading: false,
    })

    render(
      <Provider store={store}>
        <ProtectedRoute allowedRoles={[ 'interviewee' ]}>
          <div>SHOULD NOT SEE</div>
        </ProtectedRoute>
      </Provider>
    )

    expect(screen.getByText('Access denied')).toBeDefined()
    expect(screen.getByText("You don't have permission to view this page.")).toBeDefined()
  })
})
