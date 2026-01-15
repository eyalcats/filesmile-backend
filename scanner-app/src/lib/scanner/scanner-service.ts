/**
 * Scanner Service
 *
 * Provides an abstraction layer for scanner operations using FileSmilesScanner REST API.
 * The FileSmilesScanner service must be running on localhost port 25319.
 */

import { TwainDevice } from '@/stores/scanner-store';
import { ColorMode, Resolution } from '@/stores/settings-store';

// Service URL - HTTP only for local service
const SERVICE_BASE_URL =
  process.env.NEXT_PUBLIC_SCANNER_SERVICE_URL || 'http://127.0.0.1:25319';

export interface ScanSettings {
  resolution: Resolution;
  colorMode: ColorMode;
  duplex: boolean;
  autoFeeder: boolean;
  showUI?: boolean;
}

export interface ScannedImage {
  data: string;
  width: number;
  height: number;
}

export interface ScanResult {
  images: ScannedImage[];
  error?: string;
}

// API Response types (matching C# models)
interface StatusResponse {
  status: string;
  twainAvailable: boolean;
}

interface DevicesResponse {
  devices: Array<{
    id: string;
    name: string;
    type: string;
    isDefault: boolean;
  }>;
}

interface ScanResponse {
  images: Array<{
    data: string;
    width: number;
    height: number;
    mimeType: string;
  }>;
  error?: string;
  success: boolean;
}

class ScannerService {
  private serviceUrl: string;
  private isConnected: boolean = false;

  constructor() {
    this.serviceUrl = SERVICE_BASE_URL;
  }

  /**
   * Check if the scanner service is running and available.
   */
  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.serviceUrl}/api/VintasoftTwainApi/Status`,
        {
          method: 'GET',
          signal: AbortSignal.timeout(3000),
        }
      );

      if (response.ok) {
        const data: StatusResponse = await response.json();
        this.isConnected = data.status === 'ok' && data.twainAvailable;
        return this.isConnected;
      }
    } catch (error) {
      console.warn('Scanner service connection check failed:', error);
    }

    this.isConnected = false;
    return false;
  }

  /**
   * No SDK loading needed with REST API - kept for API compatibility.
   * Components may call this but there's nothing to load.
   */
  async loadSDK(): Promise<boolean> {
    return this.isConnected;
  }

  /**
   * Get list of available scanner devices.
   */
  async getDevices(): Promise<TwainDevice[]> {
    if (!this.isConnected) {
      return [];
    }

    try {
      const response = await fetch(`${this.serviceUrl}/api/scanner/devices`, {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const data: DevicesResponse = await response.json();
        return data.devices.map((device) => ({
          id: device.id,
          name: device.name,
          type: device.type as 'twain' | 'wia' | 'escl',
          isDefault: device.isDefault,
        }));
      }
    } catch (error) {
      console.error('Failed to get devices:', error);
    }

    return [];
  }

  /**
   * Perform a scan operation.
   */
  async scan(
    deviceId: string,
    settings: ScanSettings,
    onProgress?: (progress: number) => void
  ): Promise<ScanResult> {
    if (!this.isConnected) {
      throw new Error('Scanner service not connected');
    }

    // Simulate initial progress
    onProgress?.(10);

    try {
      const requestBody = {
        deviceId: deviceId === 'default' ? null : deviceId,
        settings: {
          resolution: settings.resolution,
          colorMode: settings.colorMode,
          duplex: settings.duplex,
          autoFeeder: settings.autoFeeder,
          showUI: settings.showUI ?? true,
        },
      };

      onProgress?.(20);

      const response = await fetch(`${this.serviceUrl}/api/scanner/scan`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        // Longer timeout for scanning - can take a while
        signal: AbortSignal.timeout(120000),
      });

      onProgress?.(80);

      const data: ScanResponse = await response.json();

      if (!data.success || data.error) {
        throw new Error(data.error || 'Scan failed');
      }

      // Convert base64 images to blob URLs for efficient memory handling
      const images: ScannedImage[] = data.images.map((img) => {
        const blobUrl = this.base64ToBlobUrl(img.data, img.mimeType);
        return {
          data: blobUrl,
          width: img.width,
          height: img.height,
        };
      });

      onProgress?.(100);

      return { images };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Scan failed');
    }
  }

  /**
   * Convert base64 string to blob URL for efficient rendering.
   */
  private base64ToBlobUrl(base64Data: string, mimeType: string): string {
    try {
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Failed to convert base64 to blob URL:', error);
      // Fallback to data URL
      return `data:${mimeType};base64,${base64Data}`;
    }
  }

  get connected(): boolean {
    return this.isConnected;
  }

  get url(): string {
    return this.serviceUrl;
  }
}

export const scannerService = new ScannerService();
export { ScannerService };
