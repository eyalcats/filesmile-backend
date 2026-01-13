/**
 * Scanner Service
 *
 * Provides an abstraction layer for scanner operations using VintaSoft Web TWAIN SDK.
 * The VintaSoft Web TWAIN service must be running on localhost.
 *
 * @see https://www.vintasoft.com/docs/vstwain-dotnet-web/
 */

import { TwainDevice } from '@/stores/scanner-store';
import { ColorMode, Resolution } from '@/stores/settings-store';

// VintaSoft service URLs
const VINTASOFT_HTTP_URL = 'http://127.0.0.1:25319/api/VintasoftTwainApi';
const VINTASOFT_HTTPS_URL = 'https://127.0.0.1:25329/api/VintasoftTwainApi';

export interface ScanSettings {
  resolution: Resolution;
  colorMode: ColorMode;
  duplex: boolean;
  autoFeeder: boolean;
}

export interface ScannedImage {
  data: string;
  width: number;
  height: number;
}

export interface ScanResult {
  images: ScannedImage[];
}

// VintaSoft SDK global types
declare global {
  interface Window {
    Vintasoft?: VintasoftNamespace;
  }
}

interface VintasoftNamespace {
  Shared: {
    WebServiceControllerJS: new (url: string) => VintasoftServiceController;
  };
  Twain: {
    WebTwainDeviceManagerJS: new (controller: VintasoftServiceController) => VintasoftDeviceManager;
    WebTwainDeviceManagerInitSettingsJS: new () => VintasoftInitSettings;
    WebTwainPixelTypeEnumJS: VintasoftPixelTypeEnum;
    WebTwainGlobalSettingsJS: VintasoftGlobalSettings;
  };
}

interface VintasoftGlobalSettings {
  register(regUser: string, regUrl: string, regCode: string, expirationDate: string): void;
}

interface VintasoftServiceController {
  // Service controller
}

interface VintasoftInitSettings {
  set_Is32BitDevicesSupported(value: boolean): void;
  set_Is64BitDevicesSupported(value: boolean): void;
  set_IsTwain2Compatible(value: boolean): void;
}

interface VintasoftPixelTypeEnum {
  BW: VintasoftEnumValue;
  Gray: VintasoftEnumValue;
  RGB: VintasoftEnumValue;
}

interface VintasoftEnumValue {
  // Enum value
}

interface VintasoftDeviceManager {
  open(initSettings: VintasoftInitSettings): void;
  openAsync(initSettings: VintasoftInitSettings, successFunc: (manager: VintasoftDeviceManager) => void, errorFunc: (manager: VintasoftDeviceManager, errorMessage: string) => void): void;
  close(): void;
  get_IsOpened(): boolean;
  get_Devices(): VintasoftDevice[];
  get_DefaultDevice(): VintasoftDevice | null;
}

interface VintasoftDevice {
  get_DeviceName(): string;
  open(showUI?: boolean, showIndicators?: boolean): void;
  openAsync(showUI: boolean, showIndicators: boolean, successFunc: (device: VintasoftDevice) => void, errorFunc: (device: VintasoftDevice, errorMessage: string) => void): void;
  close(): void;
  set_PixelType(value: VintasoftEnumValue): void;
  set_XResolution(value: number): void;
  set_YResolution(value: number): void;
  set_IsFeederEnabled(value: boolean): void;
  set_IsDuplexEnabled(value: boolean): void;
  acquireModalSync(isProgressEnabled?: boolean): VintasoftAcquireResult;
  acquireModalAsync(successFunc: (device: VintasoftDevice, result: VintasoftAcquireResult) => void, errorFunc: (device: VintasoftDevice, errorMessage: string) => void, isProgressEnabled?: boolean): void;
}

interface VintasoftAcquireResult {
  get_AcquireModalState(): { toString(): string };
  get_AcquiredImage(): VintasoftAcquiredImage | null;
  get_ErrorMessage(): string;
}

interface VintasoftAcquiredImage {
  getAsBase64String(): string;
  get_Width(): number;
  get_Height(): number;
}

// License configuration - get your evaluation license from https://myaccount.vintasoft.com
const VINTASOFT_LICENSE = {
  regUser: process.env.NEXT_PUBLIC_VINTASOFT_REG_USER || '',
  regUrl: process.env.NEXT_PUBLIC_VINTASOFT_REG_URL || '',
  regCode: process.env.NEXT_PUBLIC_VINTASOFT_REG_CODE || '',
  expirationDate: process.env.NEXT_PUBLIC_VINTASOFT_EXPIRATION || '',
};

class ScannerService {
  private serviceUrl: string;
  private isConnected: boolean = false;
  private sdkLoaded: boolean = false;
  private deviceManager: VintasoftDeviceManager | null = null;
  private serviceController: VintasoftServiceController | null = null;
  private isDeviceManagerOpen: boolean = false;
  private licenseRegistered: boolean = false;

  constructor() {
    this.serviceUrl = VINTASOFT_HTTP_URL;
  }

  private registerLicense(): boolean {
    if (this.licenseRegistered) return true;
    if (!window.Vintasoft?.Twain?.WebTwainGlobalSettingsJS) return false;

    const { regUser, regUrl, regCode, expirationDate } = VINTASOFT_LICENSE;

    // Check if license credentials are configured
    if (!regUser || !regCode) {
      console.warn('VintaSoft license not configured. Get evaluation license from https://myaccount.vintasoft.com');
      return false;
    }

    try {
      window.Vintasoft.Twain.WebTwainGlobalSettingsJS.register(
        regUser,
        regUrl,
        regCode,
        expirationDate
      );
      this.licenseRegistered = true;
      console.log('VintaSoft license registered successfully');
      return true;
    } catch (error) {
      console.error('Failed to register VintaSoft license:', error);
      return false;
    }
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.serviceUrl}/Status`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        this.isConnected = true;
        return true;
      }
    } catch {
      // Try HTTPS
    }

    try {
      const response = await fetch(`${VINTASOFT_HTTPS_URL}/Status`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      if (response.ok) {
        this.serviceUrl = VINTASOFT_HTTPS_URL;
        this.isConnected = true;
        return true;
      }
    } catch {
      // Both failed
    }

    this.isConnected = false;
    return false;
  }

  async loadSDK(): Promise<boolean> {
    if (this.sdkLoaded || typeof window === 'undefined') {
      return this.sdkLoaded;
    }

    // Check if SDK is already fully loaded
    if (window.Vintasoft?.Twain?.WebTwainDeviceManagerJS) {
      this.sdkLoaded = true;
      return true;
    }

    try {
      await this.loadScript('/vintasoft/Vintasoft.Shared.js');
      await this.loadScript('/vintasoft/Vintasoft.Twain.js');

      // Wait for SDK to be fully initialized (scripts may need time to execute)
      await this.waitForSDK();

      this.sdkLoaded = !!window.Vintasoft?.Twain?.WebTwainDeviceManagerJS;
      return this.sdkLoaded;
    } catch (error) {
      console.warn('VintaSoft SDK not available:', error);
      return false;
    }
  }

  private waitForSDK(timeout: number = 3000): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();

      const check = () => {
        if (window.Vintasoft?.Twain?.WebTwainDeviceManagerJS) {
          resolve();
        } else if (Date.now() - startTime > timeout) {
          reject(new Error('VintaSoft SDK initialization timeout'));
        } else {
          setTimeout(check, 100);
        }
      };

      check();
    });
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }

  private async initDeviceManager(): Promise<boolean> {
    // Check if VintaSoft SDK is fully loaded
    if (!window.Vintasoft?.Shared?.WebServiceControllerJS || !window.Vintasoft?.Twain?.WebTwainDeviceManagerJS) {
      console.warn('VintaSoft SDK not fully loaded');
      return false;
    }

    // Check if already open using SDK method
    if (this.deviceManager && this.deviceManager.get_IsOpened()) {
      return true;
    }

    // Register license before initializing device manager
    const licenseOk = this.registerLicense();
    if (!licenseOk) {
      console.warn('VintaSoft license not registered - scanning may not work');
    }

    try {
      this.serviceController = new window.Vintasoft.Shared.WebServiceControllerJS(this.serviceUrl);
      this.deviceManager = new window.Vintasoft.Twain.WebTwainDeviceManagerJS(this.serviceController);
      const initSettings = new window.Vintasoft.Twain.WebTwainDeviceManagerInitSettingsJS();

      // Enable both 32-bit and 64-bit device support
      initSettings.set_Is32BitDevicesSupported(true);
      initSettings.set_Is64BitDevicesSupported(true);

      return new Promise((resolve) => {
        this.deviceManager!.openAsync(
          initSettings,
          () => {
            this.isDeviceManagerOpen = true;
            console.log('Device manager opened successfully');
            resolve(true);
          },
          (_manager, errorMessage) => {
            console.error('Failed to open device manager:', errorMessage);
            this.isDeviceManagerOpen = false;
            resolve(false);
          }
        );
      });
    } catch (error) {
      console.error('Failed to init device manager:', error);
      return false;
    }
  }

  async getDevices(): Promise<TwainDevice[]> {
    if (!this.isConnected) {
      return [];
    }

    const sdkLoaded = await this.loadSDK();
    if (sdkLoaded) {
      const initialized = await this.initDeviceManager();
      if (initialized && this.deviceManager) {
        try {
          const devices = this.deviceManager.get_Devices();
          const defaultDevice = this.deviceManager.get_DefaultDevice();
          const defaultName = defaultDevice?.get_DeviceName() || '';

          if (devices && devices.length > 0) {
            return devices.map((device, index) => ({
              id: device.get_DeviceName(),
              name: device.get_DeviceName(),
              type: 'twain' as const,
              isDefault: device.get_DeviceName() === defaultName || index === 0,
            }));
          }
        } catch (error) {
          console.warn('Failed to get devices from SDK:', error);
        }
      }
    }

    // Fallback
    return [
      {
        id: 'default',
        name: 'Default Scanner',
        type: 'twain',
        isDefault: true,
      },
    ];
  }

  async scan(
    deviceId: string,
    settings: ScanSettings,
    onProgress?: (progress: number) => void
  ): Promise<ScanResult> {
    if (!this.isConnected) {
      throw new Error('Scanner service not connected');
    }

    onProgress?.(5);

    const sdkLoaded = await this.loadSDK();
    if (!sdkLoaded || !window.Vintasoft) {
      throw new Error(
        'VintaSoft SDK not loaded. Ensure JS files are in public/vintasoft/'
      );
    }

    const initialized = await this.initDeviceManager();
    if (!initialized || !this.deviceManager) {
      throw new Error('Failed to initialize device manager');
    }

    // Verify device manager is actually open
    if (!this.deviceManager.get_IsOpened()) {
      throw new Error('Device manager is not open');
    }

    onProgress?.(10);

    // Find device
    const devices = this.deviceManager.get_Devices();
    let device: VintasoftDevice | null = null;

    if (deviceId === 'default') {
      device = this.deviceManager.get_DefaultDevice();
    } else {
      device = devices.find((d) => d.get_DeviceName() === deviceId) || null;
    }

    if (!device && devices.length > 0) {
      device = devices[0];
    }

    if (!device) {
      throw new Error('No scanner device found');
    }

    onProgress?.(15);

    // Open device (showUI=false, showIndicators=true)
    await new Promise<void>((resolve, reject) => {
      device!.openAsync(
        false,  // showUI - don't show scanner's native UI
        true,   // showIndicators - show progress
        () => resolve(),
        (_dev, errorMessage) => reject(new Error(errorMessage || 'Failed to open device'))
      );
    });

    onProgress?.(25);

    try {
      // Configure device settings
      const pixelType = this.getPixelType(settings.colorMode);
      if (pixelType) {
        device.set_PixelType(pixelType);
      }
      device.set_XResolution(settings.resolution);
      device.set_YResolution(settings.resolution);
      device.set_IsFeederEnabled(settings.autoFeeder);
      device.set_IsDuplexEnabled(settings.duplex);

      onProgress?.(30);

      // Acquire images using modal loop
      const acquiredImages: ScannedImage[] = [];
      let scanning = true;
      let progressValue = 30;

      while (scanning) {
        const result = await new Promise<VintasoftAcquireResult>((resolve, reject) => {
          device!.acquireModalAsync(
            (_dev, res) => resolve(res),
            (_dev, errorMessage) => reject(new Error(errorMessage)),
            true // Enable progress
          );
        });

        const state = result.get_AcquireModalState().toString();

        switch (state) {
          case 'ImageAcquired': {
            const image = result.get_AcquiredImage();
            if (image) {
              let base64Data = image.getAsBase64String();
              console.log('Base64 data length:', base64Data.length, 'First 50 chars:', base64Data.substring(0, 50));

              // Strip data URL prefix if present (e.g., "data:image/png;base64,")
              if (base64Data.includes(',')) {
                base64Data = base64Data.split(',')[1];
              }

              // Remove any whitespace/newlines that might be in the base64 string
              base64Data = base64Data.replace(/\s/g, '');

              // Detect image format from base64 header
              let mimeType = 'image/png'; // default
              if (base64Data.startsWith('Qk')) {
                mimeType = 'image/bmp';
              } else if (base64Data.startsWith('/9j/')) {
                mimeType = 'image/jpeg';
              } else if (base64Data.startsWith('iVBOR')) {
                mimeType = 'image/png';
              } else if (base64Data.startsWith('R0lGOD')) {
                mimeType = 'image/gif';
              } else if (base64Data.startsWith('SUkq') || base64Data.startsWith('TU0A')) {
                mimeType = 'image/tiff';
              }

              console.log('Detected MIME type:', mimeType, 'Cleaned base64 length:', base64Data.length);

              // Convert base64 to Blob URL for better handling of large images
              try {
                const byteCharacters = atob(base64Data);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                  byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: mimeType });
                const blobUrl = URL.createObjectURL(blob);

                acquiredImages.push({
                  data: blobUrl,
                  width: image.get_Width(),
                  height: image.get_Height(),
                });
                console.log('Acquired image:', mimeType, image.get_Width(), 'x', image.get_Height(), 'Blob URL:', blobUrl);
              } catch (decodeError) {
                console.error('Failed to decode base64:', decodeError);
                // Fallback: use data URL directly
                const dataUrl = `data:${mimeType};base64,${base64Data}`;
                acquiredImages.push({
                  data: dataUrl,
                  width: image.get_Width(),
                  height: image.get_Height(),
                });
                console.log('Using data URL fallback for image');
              }
            }
            progressValue = Math.min(90, progressValue + 10);
            onProgress?.(progressValue);
            break;
          }
          case 'ScanFinished':
          case 'ScanCanceled':
            scanning = false;
            break;
          case 'ScanFailed':
            throw new Error(result.get_ErrorMessage() || 'Scan failed');
          case 'ImageAcquiringProgress':
            // Continue scanning
            break;
          default:
            // Unknown state, continue
            break;
        }
      }

      onProgress?.(100);

      return { images: acquiredImages };
    } finally {
      try {
        device.close();
      } catch {
        // Ignore close errors
      }
    }
  }

  private getPixelType(colorMode: ColorMode): VintasoftEnumValue | null {
    if (!window.Vintasoft) return null;

    const pixelTypes = window.Vintasoft.Twain.WebTwainPixelTypeEnumJS;
    switch (colorMode) {
      case 'bw':
        return pixelTypes.BW;
      case 'gray':
        return pixelTypes.Gray;
      case 'rgb':
        return pixelTypes.RGB;
      default:
        return pixelTypes.Gray;
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
