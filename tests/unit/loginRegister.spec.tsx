// @vitest-environment jsdom
import React from 'react'
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { configureStore } from '@reduxjs/toolkit'
import LoginForm from '@/components/auth/LoginForm'
import RegisterForm from '@/components/auth/RegisterForm'

const mockPush = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))

function makeStore(authState: any) {
  const reducer = {
    auth: () => authState,
  }
  return configureStore({ reducer })
}

describe('Login/Register redirects', () => {
  it('LoginForm redirects when user present', () => {
    const store = makeStore({ user: { id: '1', email: 'a@b.com', role: 'interviewer', createdAt: '', updatedAt: '' }, isLoading: false, error: null })

    render(
      <Provider store={store}>
        <LoginForm />
      </Provider>
    )

    // The LoginForm useEffect will run and call router.push
    expect(mockPush).toHaveBeenCalledWith('/interviewer')
  })

  it('RegisterForm redirects when user present', () => {
    const store = makeStore({ user: { id: '2', email: 'u@v.com', role: 'interviewee', createdAt: '', updatedAt: '' }, isLoading: false, error: null })

    render(
      <Provider store={store}>
        <RegisterForm />
      </Provider>
    )

    expect(mockPush).toHaveBeenCalledWith('/interviewee')
  })
})
