'use client'

import { useRef } from 'react'

interface FileDropProps {
  accept: string
  maxSizeMB: number
  onFile: (file: File) => void
  disabled?: boolean
}

export function FileDrop({ accept, maxSizeMB, onFile, disabled }: FileDropProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    
    const file = files[0]
    
    // Validate MIME type
    const acceptedTypes = accept.split(',').map(type => type.trim())
    if (!acceptedTypes.includes(file.type)) {
      return // Invalid type, ignore
    }
    
    // Validate file size
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    if (file.size > maxSizeBytes) {
      return // Too large, ignore
    }
    
    onFile(file)
  }

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      inputRef.current?.click()
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (disabled) return
    handleFiles(e.dataTransfer.files)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={`
        border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer
        hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={(e) => handleFiles(e.target.files)}
        className="hidden"
        disabled={disabled}
      />
      
      <div className="space-y-2">
        <p className="text-gray-600">Drop files here or click to browse</p>
        <p className="text-sm text-gray-400">
          Max {maxSizeMB}MB • {accept}
        </p>
      </div>
    </div>
  )
}
