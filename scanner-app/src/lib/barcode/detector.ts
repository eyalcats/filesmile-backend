'use client';

import { BrowserMultiFormatReader, BarcodeFormat, DecodeHintType } from '@zxing/library';

export interface BarcodeResult {
  value: string;
  prefix: string;
  docNumber: string;
  format: string;
}

export interface DetectionOptions {
  formats?: BarcodeFormat[];
  prefixPatterns?: RegExp[];
}

const DEFAULT_FORMATS = [
  BarcodeFormat.CODE_128,
  BarcodeFormat.CODE_39,
];

// Default pattern: 2-4 letter prefix followed by numbers and optional dashes
// Examples: SH25001367, INV-2024-001, PO12345
const DEFAULT_PREFIX_PATTERN = /^([A-Z]{2,4})[-]?(\d+[-]?\d*)$/i;

class BarcodeDetector {
  private reader: BrowserMultiFormatReader;
  private prefixPatterns: RegExp[];

  constructor(options: DetectionOptions = {}) {
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, options.formats || DEFAULT_FORMATS);
    hints.set(DecodeHintType.TRY_HARDER, true);

    this.reader = new BrowserMultiFormatReader(hints);
    this.prefixPatterns = options.prefixPatterns || [DEFAULT_PREFIX_PATTERN];
  }

  /**
   * Parse a barcode value to extract prefix and document number
   */
  parseBarcode(value: string): BarcodeResult | null {
    const trimmed = value.trim().toUpperCase();

    for (const pattern of this.prefixPatterns) {
      const match = trimmed.match(pattern);
      if (match && match.length >= 3) {
        return {
          value: trimmed,
          prefix: match[1],
          docNumber: match[2].replace(/-/g, ''), // Remove dashes from doc number
          format: 'matched',
        };
      }
    }

    return null;
  }

  /**
   * Detect barcode from an image element or canvas
   */
  async detectFromImage(imageSource: HTMLImageElement | HTMLCanvasElement | string): Promise<BarcodeResult | null> {
    try {
      let element: HTMLImageElement | HTMLCanvasElement;

      if (typeof imageSource === 'string') {
        // Create image from data URL or blob URL
        element = await this.loadImage(imageSource);
      } else {
        element = imageSource;
      }

      const result = await this.reader.decodeFromImageElement(element as HTMLImageElement);

      if (result) {
        const parsed = this.parseBarcode(result.getText());
        if (parsed) {
          parsed.format = result.getBarcodeFormat().toString();
          return parsed;
        }
      }

      return null;
    } catch (error) {
      // No barcode found is not an error
      const errorMessage = (error as Error).message || '';
      if (errorMessage.includes('No MultiFormat Readers') || errorMessage.includes('NotFoundException')) {
        return null;
      }
      console.error('Barcode detection error:', error);
      return null;
    }
  }

  /**
   * Detect barcode from PDF text content
   */
  detectFromText(text: string): BarcodeResult | null {
    // Look for barcode patterns in text
    const lines = text.split(/[\n\r]+/);

    for (const line of lines) {
      // Check each word/token in the line
      const tokens = line.split(/\s+/);

      for (const token of tokens) {
        const parsed = this.parseBarcode(token);
        if (parsed) {
          parsed.format = 'text';
          return parsed;
        }
      }
    }

    return null;
  }

  /**
   * Load an image from a URL
   */
  private loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = src;
    });
  }

  /**
   * Reset the reader for reuse
   */
  reset(): void {
    this.reader.reset();
  }
}

// Singleton instance
export const barcodeDetector = new BarcodeDetector();
export { BarcodeDetector };
