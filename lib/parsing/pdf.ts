const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const os = require('os');
const path = require('path');

const execFileAsync = promisify(execFile);

// Type alias for File to ensure compatibility with both browser and Node.js
// In Next.js server components, File is available from the global scope
export type PDFFile = File;

export interface PDFMetadata {
  pageCount: number;
  title?: string;
  author?: string;
  subject?: string;
  keywords?: string;
  creator?: string;
  producer?: string;
  creationDate?: string;
  modificationDate?: string;
  pdfVersion?: string;
}

export interface PDFParseResult {
  text: string;
  metadata: PDFMetadata;
  pageTexts: string[]; // Individual page texts
}

/**
 * Convert a PDF File into plain text using pdftotext
 */
export async function pdfToText(file: PDFFile): Promise<string> {
  const result = await pdfToTextWithMetadata(file);
  return result.text;
}

/**
 * Extract text and metadata from PDF file using pdftotext
 */
export async function pdfToTextWithMetadata(file: PDFFile): Promise<PDFParseResult> {
  if (!file) {
    console.error('No file provided to pdfToTextWithMetadata');
    throw new Error('No file provided');
  }
  
  // Check if file is PDF by both mime type and extension
  // Use duck typing instead of instanceof for better compatibility
  const isPdfMime = file.type === 'application/pdf';
  const isPdfExt = file.name?.toLowerCase().endsWith('.pdf');
  
  if (!isPdfMime && !isPdfExt) {
    console.error(`File type mismatch: ${file.type}, name: ${file.name}`);
    throw new Error('Expected PDF file format.');
  }

  try {
    console.log(`Processing PDF file: ${file.name}, size: ${file.size} bytes`);
    
    // Convert File to Buffer - handle both browser File and Node.js buffer.File
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    let text: string;
    let metadata: PDFMetadata;
    
    // Try pdftotext first
    try {
      const result = await extractWithPdftotext(buffer);
      text = result.text;
      metadata = result.metadata;
      
      // If pdftotext extracted very little content, try pdf-parse as fallback
      if (text.trim().length < 10) {
        console.log('pdftotext extracted minimal content, trying pdf-parse fallback...');
        const fallbackResult = await extractWithPdfParse(buffer);
        if (fallbackResult.text.trim().length > text.trim().length) {
          text = fallbackResult.text;
          metadata = fallbackResult.metadata;
          console.log('Used pdf-parse fallback for better extraction');
        }
      }
    } catch (pdftotextError) {
      console.log('pdftotext failed, trying pdf-parse fallback...', pdftotextError instanceof Error ? pdftotextError.message : String(pdftotextError));
      try {
        const fallbackResult = await extractWithPdfParse(buffer);
        text = fallbackResult.text;
        metadata = fallbackResult.metadata;
      } catch (pdfParseError) {
        console.log('pdf-parse also failed, returning minimal result...', pdfParseError instanceof Error ? pdfParseError.message : String(pdfParseError));
        // Return minimal result when both methods fail
        text = '';
        metadata = {
          pageCount: 1,
        };
      }
    }
    
    console.log(`Successfully extracted ${text.length} characters`);
    
    return {
      text: text,
      metadata,
      pageTexts: text.split('\f').filter(page => page.trim()), // Split by form feed if available
    };
    
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error(`Failed to parse PDF content: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse pdfinfo output into metadata
 */
function parsePdfInfo(infoOutput: string): PDFMetadata {
  const metadata: PDFMetadata = {
    pageCount: 0,
  };

  const lines = infoOutput.split('\n');
  for (const line of lines) {
    const [key, ...valueParts] = line.split(':');
    const value = valueParts.join(':').trim();

    switch (key.trim()) {
      case 'Pages':
        metadata.pageCount = parseInt(value) || 0;
        break;
      case 'Title':
        metadata.title = value || undefined;
        break;
      case 'Author':
        metadata.author = value || undefined;
        break;
      case 'Subject':
        metadata.subject = value || undefined;
        break;
      case 'Keywords':
        metadata.keywords = value || undefined;
        break;
      case 'Creator':
        metadata.creator = value || undefined;
        break;
      case 'Producer':
        metadata.producer = value || undefined;
        break;
      case 'CreationDate':
        metadata.creationDate = value || undefined;
        break;
      case 'ModDate':
        metadata.modificationDate = value || undefined;
        break;
      case 'PDF version':
        metadata.pdfVersion = value || undefined;
        break;
    }
  }

  return metadata;
}

/**
 * Extract text and metadata using pdftotext
 */
async function extractWithPdftotext(buffer: Buffer): Promise<{ text: string; metadata: PDFMetadata }> {
  const tempDir = os.tmpdir();
  const tempInputPath = path.join(tempDir, `pdf-input-${Date.now()}.pdf`);
  const tempOutputPath = path.join(tempDir, `pdf-output-${Date.now()}.txt`);

  try {
    // Write PDF buffer to temporary file
    fs.writeFileSync(tempInputPath, buffer);
    
    // Extract text using pdftotext
    await execFileAsync('pdftotext', [
      '-layout',  // Preserve layout
      '-enc', 'UTF-8',  // UTF-8 encoding
      tempInputPath,
      tempOutputPath
    ]);
    
    // Read extracted text
    const text = fs.readFileSync(tempOutputPath, 'utf8');
    
    // Get basic metadata using pdfinfo if available
    let metadata: PDFMetadata;
    try {
      const { stdout: infoOutput } = await execFileAsync('pdfinfo', [tempInputPath]);
      metadata = parsePdfInfo(infoOutput);
    } catch (infoError) {
      // If pdfinfo fails, create basic metadata
      console.warn('Could not extract PDF metadata:', infoError);
      metadata = {
        pageCount: (text.match(/\f/g) || []).length + 1, // Rough page count based on form feeds
      };
    }

    return { text, metadata };
    
  } finally {
    // Clean up temporary files
    try {
      if (fs.existsSync(tempInputPath)) fs.unlinkSync(tempInputPath);
      if (fs.existsSync(tempOutputPath)) fs.unlinkSync(tempOutputPath);
    } catch (cleanupError) {
      console.warn('Failed to clean up temporary files:', cleanupError);
    }
  }
}

/**
 * Extract text and metadata using pdf-parse as fallback
 */
async function extractWithPdfParse(buffer: Buffer): Promise<{ text: string; metadata: PDFMetadata }> {
  // Import pdf-parse dynamically to avoid top-level DOMMatrix issues
  const pdfParse = require('pdf-parse');
  
  const data = await pdfParse(buffer);
  
  const metadata: PDFMetadata = {
    pageCount: data.numpages,
    title: data.info?.Title || undefined,
    author: data.info?.Author || undefined,
    subject: data.info?.Subject || undefined,
    keywords: data.info?.Keywords || undefined,
    creator: data.info?.Creator || undefined,
    producer: data.info?.Producer || undefined,
    creationDate: data.info?.CreationDate || undefined,
    modificationDate: data.info?.ModDate || undefined,
    pdfVersion: data.info?.PDFFormatVersion || undefined,
  };

  return { text: data.text, metadata };
}
