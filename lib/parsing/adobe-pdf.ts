import { Readable } from 'stream';

declare const __non_webpack_require__: ((modulePath: string) => any) | undefined;

type AdobePDFServicesModule = {
  ServicePrincipalCredentials: new (args: { clientId: string; clientSecret: string }) => any;
  PDFServices: new (args: { credentials: any }) => any;
  MimeType: { PDF: string };
  ExtractPDFJob: new (args: { inputAsset: any; params: any }) => any;
  ExtractPDFParams: new (args: { elementsToExtract: any[] }) => any;
  ExtractElementType: { TEXT: any; TABLES?: any };
  SDKError: new (...args: any[]) => Error;
  ServiceUsageError: new (...args: any[]) => Error;
  ServiceApiError: new (...args: any[]) => Error;
};

const loadAdobeSDK = (): AdobePDFServicesModule | null => {
  const moduleName = '@adobe/pdfservices-node-sdk';

  const runtimeRequire = (() => {
    if (typeof __non_webpack_require__ === 'function') {
      return __non_webpack_require__;
    }

    try {
      return eval('require') as (modulePath: string) => AdobePDFServicesModule;
    } catch {
      return null;
    }
  })();

  if (!runtimeRequire) {
    console.warn('Runtime require is not available to load Adobe PDF Services SDK');
    return null;
  }

  try {
    return runtimeRequire(moduleName);
  } catch (error) {
    console.warn('Adobe PDF Services SDK is not available:', error);
    return null;
  }
};

/**
 * Adobe PDF Services configuration and client
 */
class AdobePDFService {
  private sdk: AdobePDFServicesModule | null = null;
  private pdfServices: any = null;
  private isEnabled: boolean = false;

  constructor() {
    this.initialize();
  }

  private initialize() {
    try {
      const clientId = process.env.ADOBE_CLIENT_ID;
      const useAdobe = process.env.USE_ADOBE_PDF_SERVICES === 'true';

      if (!useAdobe || !clientId) {
        console.log('Adobe PDF Services disabled or not configured');
        return;
      }

      const sdk = loadAdobeSDK();

      if (!sdk) {
        console.warn('Adobe PDF Services SDK could not be loaded. Skipping initialization.');
        return;
      }

      this.sdk = sdk;

      // Initialize credentials with client ID (API key)
      const credentials = new sdk.ServicePrincipalCredentials({
        clientId: clientId,
        clientSecret: '', // Not needed for some API key configurations
      });

      // Create PDF Services instance
      this.pdfServices = new sdk.PDFServices({ credentials });
      this.isEnabled = true;

      console.log('Adobe PDF Services initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Adobe PDF Services:', error);
      this.isEnabled = false;
    }
  }

  /**
   * Check if Adobe PDF Services is available
   */
  public isAvailable(): boolean {
    return this.isEnabled && this.pdfServices !== null;
  }

  /**
   * Extract text content from PDF using Adobe PDF Services
   */
  public async extractTextFromPDF(file: File): Promise<string> {
    if (!this.isAvailable()) {
      throw new Error('Adobe PDF Services not available');
    }

    try {
      console.log(`Extracting text from PDF: ${file.name} using Adobe PDF Services`);

      // Convert File to Buffer and create readable stream
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const readableStream = Readable.from(buffer);

      const inputAsset = await this.pdfServices!.upload({
        readStream: readableStream,
        mimeType: this.sdk!.MimeType.PDF
      });

      // Create parameters for extraction
      const params = new this.sdk!.ExtractPDFParams({
        elementsToExtract: [this.sdk!.ExtractElementType.TEXT]
      });

      // Create extraction job
      const job = new this.sdk!.ExtractPDFJob({ inputAsset, params });

      // Submit job and get the result
      const pollingURL = await this.pdfServices!.submit({ job });
      const pdfServicesResponse = await this.pdfServices!.getJobResult({
        pollingURL,
        resultType: this.sdk!.ExtractPDFJob as any
      });

      // Download the result - handle unknown type
      const result = pdfServicesResponse.result as any;
      const resultAsset = result.resource;
      const streamAsset = await this.pdfServices!.getContent({ asset: resultAsset });
      
      // Convert stream to text
      const resultBuffer = await this.streamToBuffer(streamAsset.readStream);
      const jsonResult = JSON.parse(resultBuffer.toString());
      
      // Extract text from the JSON response
      const extractedText = this.parseExtractedContent(jsonResult);
      
      console.log(`Successfully extracted ${extractedText.length} characters from PDF`);
      return extractedText;

    } catch (error) {
      console.error('Adobe PDF extraction error:', error);
      const err = error as Error;

      if (
        this.sdk &&
        (err instanceof this.sdk.SDKError ||
          err instanceof this.sdk.ServiceUsageError ||
          err instanceof this.sdk.ServiceApiError)
      ) {
        throw new Error(`Adobe PDF Services error: ${err.message}`);
      }

      const fallbackMessage =
        err && typeof err === 'object' && 'message' in err ? String((err as { message: unknown }).message) : 'Unknown error';

      throw new Error(`Failed to extract text from PDF: ${fallbackMessage}`);
    }
  }

  /**
   * Convert readable stream to buffer
   */
  private async streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
    const chunks: Buffer[] = [];
    
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', (err) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  /**
   * Parse the extracted content JSON to get plain text
   */
  private parseExtractedContent(jsonResult: any): string {
    try {
      const elements = jsonResult.elements || [];
      let text = '';
      
      for (const element of elements) {
        if (element.Text) {
          text += element.Text + '\n';
        }
      }
      
      return text.trim();
    } catch (error) {
      console.error('Error parsing extracted content:', error);
      return '';
    }
  }

  /**
   * Get detailed metadata from PDF
   */
  public async extractMetadataFromPDF(file: File): Promise<{
    text: string;
    metadata: {
      pageCount?: number;
      title?: string;
      author?: string;
      subject?: string;
      keywords?: string;
      creator?: string;
      producer?: string;
      creationDate?: string;
      modificationDate?: string;
    };
  }> {
    if (!this.isAvailable()) {
      throw new Error('Adobe PDF Services not available');
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const readableStream = Readable.from(buffer);
      
      const inputAsset = await this.pdfServices!.upload({
        readStream: readableStream,
        mimeType: this.sdk!.MimeType.PDF
      });

      // Extract with more elements including metadata
      const params = new this.sdk!.ExtractPDFParams({
        elementsToExtract: [
          this.sdk!.ExtractElementType.TEXT,
          this.sdk!.ExtractElementType.TABLES,
        ]
      });

      const job = new this.sdk!.ExtractPDFJob({ inputAsset, params });
      const pollingURL = await this.pdfServices!.submit({ job });
      const pdfServicesResponse = await this.pdfServices!.getJobResult({
        pollingURL,
        resultType: this.sdk!.ExtractPDFJob as any
      });

      const result = pdfServicesResponse.result as any;
      const resultAsset = result.resource;
      const streamAsset = await this.pdfServices!.getContent({ asset: resultAsset });
      const resultBuffer = await this.streamToBuffer(streamAsset.readStream);
      const jsonResult = JSON.parse(resultBuffer.toString());
      
      const text = this.parseExtractedContent(jsonResult);
      const metadata = this.parseMetadata(jsonResult);
      
      return { text, metadata };
    } catch (error) {
      console.error('Adobe PDF metadata extraction error:', error);
      throw new Error(`Failed to extract PDF metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse metadata from extracted JSON
   */
  private parseMetadata(jsonResult: any): any {
    try {
      return {
        pageCount: jsonResult.extended_metadata?.page_count,
        title: jsonResult.extended_metadata?.document_metadata?.title,
        author: jsonResult.extended_metadata?.document_metadata?.author,
        subject: jsonResult.extended_metadata?.document_metadata?.subject,
        keywords: jsonResult.extended_metadata?.document_metadata?.keywords,
        creator: jsonResult.extended_metadata?.document_metadata?.creator,
        producer: jsonResult.extended_metadata?.document_metadata?.producer,
        creationDate: jsonResult.extended_metadata?.document_metadata?.creation_date,
        modificationDate: jsonResult.extended_metadata?.document_metadata?.modification_date,
      };
    } catch (error) {
      console.error('Error parsing metadata:', error);
      return {};
    }
  }
}

// Export singleton instance
export const adobePDFService = new AdobePDFService();

/**
 * Enhanced PDF to text conversion using Adobe PDF Services with fallback
 */
export async function pdfToTextWithAdobe(file: File): Promise<{
  text: string;
  source: 'adobe' | 'fallback';
  metadata?: any;
}> {
  // Try Adobe PDF Services first if available
  if (adobePDFService.isAvailable()) {
    try {
      const result = await adobePDFService.extractMetadataFromPDF(file);
      return {
        text: result.text,
        source: 'adobe',
        metadata: result.metadata
      };
    } catch (error) {
      console.warn('Adobe PDF Services failed, falling back to PDF.js:', error);
    }
  }

  // Fallback to existing PDF.js implementation
  const { pdfToText } = await import('./pdf');
  const text = await pdfToText(file);
  
  return {
    text,
    source: 'fallback'
  };
}
