import { NextRequest } from 'next/server'
import { json, handleApiError } from '@/lib/http/errors'
import { adobePDFService } from '@/lib/parsing/adobe-pdf'

/**
 * Test endpoint for Adobe PDF Services integration
 */
export async function GET(req: NextRequest) {
  try {
    const isAvailable = adobePDFService.isAvailable()
    
    return json(200, {
      adobePdfServices: {
        enabled: isAvailable,
        clientId: process.env.ADOBE_CLIENT_ID ? 'configured' : 'missing',
        useAdobe: process.env.USE_ADOBE_PDF_SERVICES === 'true',
        status: isAvailable ? 'ready' : 'disabled'
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        aiVendor: process.env.AI_VENDOR || 'mock'
      }
    })
  } catch (err) {
    return handleApiError(err)
  }
}

/**
 * Process a test PDF to verify Adobe PDF Services integration
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return json(400, { error: 'No file provided' })
    }

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return json(400, { error: 'Only PDF files are supported for this test' })
    }

    const startTime = Date.now()
    
    if (adobePDFService.isAvailable()) {
      try {
        const result = await adobePDFService.extractMetadataFromPDF(file)
        const processingTime = Date.now() - startTime
        
        return json(200, {
          success: true,
          source: 'adobe',
          processingTimeMs: processingTime,
          textLength: result.text.length,
          textPreview: result.text.substring(0, 200) + '...',
          metadata: result.metadata,
          file: {
            name: file.name,
            size: file.size,
            type: file.type
          }
        })
      } catch (error) {
        return json(500, {
          error: 'Adobe PDF processing failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    } else {
      return json(503, {
        error: 'Adobe PDF Services not available',
        reason: 'Service not configured or disabled'
      })
    }
  } catch (err) {
    return handleApiError(err)
  }
}