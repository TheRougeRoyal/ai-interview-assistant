/**
 * Create a simple test PDF file for resume parsing tests
 * Uses PDFKit to generate a properly formatted PDF
 */

const fs = require('fs');
const path = require('path');

// We'll create a simple text-based PDF by hand-crafting the PDF structure
// This is a minimal PDF that pdftotext can parse

const resumeText = `John Doe
john.doe@example.com
+1 (555) 123-4567

PROFESSIONAL SUMMARY
Experienced software engineer with 5+ years in full-stack development.
Specializing in React, Node.js, and cloud technologies.

EXPERIENCE
Senior Software Engineer - Tech Corp
2020 - Present
- Led development of microservices architecture
- Implemented CI/CD pipelines
- Mentored junior developers

Junior Developer - StartupXYZ
2018 - 2020
- Built React applications
- Worked with REST APIs
- Collaborated in agile teams

EDUCATION
Bachelor of Science in Computer Science
State University, 2018

SKILLS
JavaScript, TypeScript, React, Node.js, Python, AWS, Docker, Kubernetes`;

// Create a simple PDF with minimal structure
const createSimplePDF = (text) => {
  const lines = text.split('\n');
  let yPos = 750;
  const pageHeight = 792;
  const pageWidth = 612;
  
  // Build PDF content stream
  let contentStream = 'BT\n';  // Begin text
  contentStream += '/F1 12 Tf\n';  // Set font
  contentStream += '50 750 Td\n';  // Set position
  contentStream += '14 TL\n';  // Set leading (line height)
  
  lines.forEach(line => {
    // Escape special characters in PDF
    const escapedLine = line
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/\r/g, '');
    contentStream += `(${escapedLine}) '\n`;
  });
  
  contentStream += 'ET\n';  // End text
  
  // Calculate stream length
  const streamLength = Buffer.byteLength(contentStream);
  
  // Build PDF structure
  const pdf = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/Resources <<
/Font <<
/F1 <<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
>>
>>
/MediaBox [0 0 ${pageWidth} ${pageHeight}]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length ${streamLength}
>>
stream
${contentStream}
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000317 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
${400 + streamLength}
%%EOF
`;

  return pdf;
};

const pdfContent = createSimplePDF(resumeText);
const outputPath = path.join(__dirname, '..', 'public', 'samples', 'test-resume.pdf');

// Ensure directory exists
const dir = path.dirname(outputPath);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

fs.writeFileSync(outputPath, pdfContent);
console.log(`✓ Created test PDF: ${outputPath}`);
console.log(`  File size: ${fs.statSync(outputPath).size} bytes`);

// Test with pdftotext
const { execSync } = require('child_process');
try {
  const extracted = execSync(`pdftotext "${outputPath}" -`, { encoding: 'utf8' });
  console.log(`✓ PDF extraction test passed`);
  console.log(`  Extracted ${extracted.length} characters`);
  console.log(`  First 100 chars: ${extracted.substring(0, 100)}...`);
} catch (error) {
  console.error('✗ PDF extraction test failed:', error.message);
}
