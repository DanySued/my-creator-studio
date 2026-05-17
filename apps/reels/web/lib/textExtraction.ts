/**
 * Text extraction utilities for PDF, DOCX, and TXT files.
 * Runs entirely client-side using pdfjs-dist and mammoth.
 */

import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';

// Set up PDF.js worker — v4.x ships .mjs workers
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

/**
 * Extract text from a PDF file.
 */
export async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const textContent = await page.getTextContent();

    const pageText = textContent.items
      .map((item: any) => item.str)
      .join(' ');

    fullText += pageText + '\n';
  }

  return fullText.trim();
}

/**
 * Extract text from a DOCX file.
 */
export async function extractDocxText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.trim();
}

/**
 * Extract text from a plain text file.
 */
export async function extractTxtText(file: File): Promise<string> {
  const text = await file.text();
  return text.trim();
}

/**
 * Main extraction function - routes to correct method based on file type.
 */
export async function extractText(file: File): Promise<string> {
  const mimeType = file.type;
  const fileName = file.name.toLowerCase();

  if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
    return extractPdfText(file);
  } else if (
    mimeType ===
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName.endsWith('.docx')
  ) {
    return extractDocxText(file);
  } else if (mimeType === 'text/plain' || fileName.endsWith('.txt')) {
    return extractTxtText(file);
  } else {
    throw new Error(`Unsupported file type: ${mimeType}`);
  }
}
