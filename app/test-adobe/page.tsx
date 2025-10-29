'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

interface TestResult {
  success: boolean
  source?: string
  processingTimeMs?: number
  textLength?: number
  textPreview?: string
  metadata?: any
  error?: string
  message?: string
}

export default function TestAdobePDF() {
  const [file, setFile] = useState<File | null>(null)
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<TestResult | null>(null)
  const [serviceStatus, setServiceStatus] = useState<any>(null)

  const checkServiceStatus = async () => {
    try {
      const response = await fetch('/api/test-adobe-pdf')
      const data = await response.json()
      setServiceStatus(data)
    } catch (error) {
      console.error('Failed to check service status:', error)
    }
  }

  const testPdfProcessing = async () => {
    if (!file) return

    setTesting(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/test-adobe-pdf', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()
      setResult(result)
    } catch (error) {
      setResult({
        success: false,
        error: 'Network error',
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Adobe PDF Services Test</h1>
      
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Service Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={checkServiceStatus} className="mb-4">
              Check Status
            </Button>
            {serviceStatus && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Adobe PDF Services:</strong> 
                    <span className={`ml-2 px-2 py-1 rounded ${
                      serviceStatus.adobePdfServices.enabled 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {serviceStatus.adobePdfServices.status}
                    </span>
                  </div>
                  <div>
                    <strong>Client ID:</strong> {serviceStatus.adobePdfServices.clientId}
                  </div>
                  <div>
                    <strong>Use Adobe:</strong> {serviceStatus.adobePdfServices.useAdobe ? 'Yes' : 'No'}
                  </div>
                  <div>
                    <strong>Environment:</strong> {serviceStatus.environment.nodeEnv}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test PDF Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
              
              <Button 
                onClick={testPdfProcessing}
                disabled={!file || testing}
                className="w-full"
              >
                {testing ? 'Processing...' : 'Test PDF Processing'}
              </Button>

              {result && (
                <div className="mt-4 p-4 border rounded">
                  {result.success ? (
                    <div className="space-y-2">
                      <div className="text-green-800 font-semibold">✅ Success!</div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div><strong>Source:</strong> {result.source}</div>
                        <div><strong>Processing Time:</strong> {result.processingTimeMs}ms</div>
                        <div><strong>Text Length:</strong> {result.textLength} chars</div>
                      </div>
                      
                      {result.textPreview && (
                        <div className="mt-4">
                          <strong>Text Preview:</strong>
                          <div className="bg-gray-100 p-2 rounded text-sm mt-1">
                            {result.textPreview}
                          </div>
                        </div>
                      )}
                      
                      {result.metadata && Object.keys(result.metadata).length > 0 && (
                        <div className="mt-4">
                          <strong>PDF Metadata:</strong>
                          <pre className="bg-gray-100 p-2 rounded text-xs mt-1 overflow-auto">
                            {JSON.stringify(result.metadata, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="text-red-800 font-semibold">❌ Failed</div>
                      <div><strong>Error:</strong> {result.error}</div>
                      {result.message && (
                        <div><strong>Message:</strong> {result.message}</div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Integration Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <p><strong>Adobe Client ID:</strong> afba7a8cafe041d083c1c7c35d0b2927</p>
            <p><strong>Fallback:</strong> If Adobe PDF Services fails, the system automatically falls back to PDF.js</p>
            <p><strong>Enhanced Features:</strong> Adobe processing provides metadata, better text extraction, and higher accuracy</p>
            <p><strong>Interview Integration:</strong> Processed resume data feeds directly into the interview question generation</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}