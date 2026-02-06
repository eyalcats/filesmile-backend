'use client';

import * as pdfjsLib from 'pdfjs-dist';
import { barcodeDetector, BarcodeResult } from './detector';

// Configure PDF.js worker - use local worker file from public folder
// BASE_URL is /scanner/ in production, / in development
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}js/pdf.worker.min.mjs?v=2`;
}

export interface PdfExtractionResult {
  barcode: BarcodeResult | null;
  method: 'text' | 'image' | null;
  pageNumber: number;
}

export interface PdfPageInfo {
  pageNumber: number;
  imageData: string; // Base64 data URL of rendered page
  width: number;
  height: number;
}

/**
 * Convert base64 data URL to ArrayBuffer
 */
function dataUrlToArrayBuffer(dataUrl: string): ArrayBuffer {
  const base64 = dataUrl.split(',')[1];
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Extract barcode from a PDF file
 *
 * Strategy:
 * 1. Try text extraction first (faster, works for text-based PDFs)
 * 2. If no barcode found, render pages as images and detect visually
 */
export async function extractBarcodeFromPdf(
  pdfData: string, // Base64 data URL
  onProgress?: (page: number, total: number, phase: 'text' | 'image') => void
): Promise<PdfExtractionResult> {
  try {
    // Convert data URL to ArrayBuffer
    const arrayBuffer = dataUrlToArrayBuffer(pdfData);

    // Load PDF document
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;

    // Strategy 1: Try text extraction (faster)
    for (let pageNum = 1; pageNum <= Math.min(numPages, 3); pageNum++) {
      // Only check first 3 pages for text
      onProgress?.(pageNum, numPages, 'text');

      try {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const text = textContent.items
          .map((item) => ('str' in item ? (item as { str: string }).str : ''))
          .filter((str) => str.length > 0)
          .join(' ');

        const result = barcodeDetector.detectFromText(text);
        if (result) {
          return {
            barcode: result,
            method: 'text',
            pageNumber: pageNum,
          };
        }
      } catch (e) {
        console.warn(`Failed to extract text from page ${pageNum}:`, e);
      }
    }

    // Strategy 2: Render pages as images and detect visually
    for (let pageNum = 1; pageNum <= Math.min(numPages, 3); pageNum++) {
      // Only check first 3 pages for barcodes
      onProgress?.(pageNum, numPages, 'image');

      try {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 }); // Higher resolution for better detection

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        }).promise;

        const result = await barcodeDetector.detectFromImage(canvas);
        if (result) {
          return {
            barcode: result,
            method: 'image',
            pageNumber: pageNum,
          };
        }
      } catch (e) {
        console.warn(`Failed to render page ${pageNum}:`, e);
      }
    }

    return {
      barcode: null,
      method: null,
      pageNumber: 0,
    };
  } catch (error) {
    console.error('PDF extraction error:', error);
    return {
      barcode: null,
      method: null,
      pageNumber: 0,
    };
  }
}

/**
 * Split a multi-page PDF into individual page images
 * Each page is rendered as a PNG image for barcode processing
 */
export async function splitPdfIntoPages(
  pdfData: string, // Base64 data URL
  onProgress?: (page: number, total: number) => void
): Promise<PdfPageInfo[]> {
  try {
    const arrayBuffer = dataUrlToArrayBuffer(pdfData);
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;

    const pages: PdfPageInfo[] = [];

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      onProgress?.(pageNum, numPages);

      try {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2.0 }); // Good resolution for barcode detection

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        await page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        }).promise;

        // Convert canvas to PNG data URL
        const imageData = canvas.toDataURL('image/png');

        pages.push({
          pageNumber: pageNum,
          imageData,
          width: viewport.width,
          height: viewport.height,
        });
      } catch (e) {
        console.warn(`Failed to render page ${pageNum}:`, e);
      }
    }

    return pages;
  } catch (error) {
    console.error('PDF split error:', error);
    return [];
  }
}

/**
 * Get the number of pages in a PDF
 */
export async function getPdfPageCount(pdfData: string): Promise<number> {
  try {
    const arrayBuffer = dataUrlToArrayBuffer(pdfData);
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    return pdf.numPages;
  } catch (error) {
    console.error('PDF page count error:', error);
    return 0;
  }
}
