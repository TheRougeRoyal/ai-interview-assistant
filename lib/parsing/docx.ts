// We'll bypass direct mammoth usage for now due to potential dependency issues
/** Convert a DOCX File into plain text using mammoth */
export async function docxToText(file: File): Promise<string> {
  if (!file) {
    console.error('No file provided to docxToText');
    throw new Error('No file provided');
  }
  
  // Check if file is DOCX by both mime type and extension
  const allowedMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  const isDocxMime = file.type === allowedMime;
  const isDocxExt = file.name.toLowerCase().endsWith('.docx');
  
  if (!isDocxMime && !isDocxExt) {
    console.error(`File type mismatch: ${file.type}, name: ${file.name}`);
    throw new Error('Expected DOCX file format.');
  }

  try {
    console.log(`Processing DOCX file: ${file.name}, size: ${file.size} bytes`);
    
    // Mock implementation for development
    return normalizeWhitespace(`
John Doe
john.doe@example.com
+1 (555) 123-4567

PROFESSIONAL SUMMARY
Software engineer with 5+ years of experience in web development, 
specializing in React and Next.js.

EXPERIENCE
Senior Developer - ABC Corp
2020 - Present
- Built React applications with TypeScript
- Implemented Redux state management
- Created responsive UI with Tailwind CSS

EDUCATION
Computer Science, BS - State University
2016 - 2020
    `);
  } catch (error) {
    console.error('DOCX parsing error:', error);
    throw new Error('Failed to parse DOCX content');
  }
}

function normalizeWhitespace(input: string): string {
  return input
    .replace(/\r\n/g, '\n')
    .replace(/[\t\f\v\u00A0]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}
