/**
 * Toast hook for notifications
 */

import React from 'react'

export interface Toast {
  id: string
  title?: string
  description?: string
  action?: React.ReactNode
  variant?: 'default' | 'destructive'
}

interface ToastState {
  toasts: Toast[]
}

const toastState: ToastState = {
  toasts: []
}

const listeners: Array<(state: ToastState) => void> = []

function dispatch(action: { type: string; payload?: any }) {
  switch (action.type) {
    case 'ADD_TOAST':
      toastState.toasts.push(action.payload)
      break
    case 'REMOVE_TOAST':
      toastState.toasts = toastState.toasts.filter(t => t.id !== action.payload)
      break
    case 'CLEAR_TOASTS':
      toastState.toasts = []
      break
  }
  
  listeners.forEach(listener => listener(toastState))
}

export function useToast() {
  const [state, setState] = React.useState(toastState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [])

  const toast = React.useCallback((props: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    dispatch({
      type: 'ADD_TOAST',
      payload: { ...props, id }
    })

    // Auto remove after 5 seconds
    setTimeout(() => {
      dispatch({ type: 'REMOVE_TOAST', payload: id })
    }, 5000)

    return id
  }, [])

  const dismiss = React.useCallback((id: string) => {
    dispatch({ type: 'REMOVE_TOAST', payload: id })
  }, [])

  return {
    toasts: state.toasts,
    toast,
    dismiss
  }
}