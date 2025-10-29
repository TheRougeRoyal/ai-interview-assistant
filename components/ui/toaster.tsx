/**
 * Toaster component for displaying toast notifications
 */

import React from 'react'
import { X } from 'lucide-react'
import { useToast } from './use-toast'
import { Button } from './button'
import { Card, CardContent } from './card'

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Card
          key={toast.id}
          className={`w-80 shadow-lg ${
            toast.variant === 'destructive'
              ? 'border-red-200 bg-red-50'
              : 'border-gray-200 bg-white'
          }`}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {toast.title && (
                  <h4 className={`font-medium ${
                    toast.variant === 'destructive' ? 'text-red-900' : 'text-gray-900'
                  }`}>
                    {toast.title}
                  </h4>
                )}
                {toast.description && (
                  <p className={`text-sm ${
                    toast.variant === 'destructive' ? 'text-red-700' : 'text-gray-600'
                  } ${toast.title ? 'mt-1' : ''}`}>
                    {toast.description}
                  </p>
                )}
                {toast.action && (
                  <div className="mt-2">
                    {toast.action}
                  </div>
                )}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => dismiss(toast.id)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}