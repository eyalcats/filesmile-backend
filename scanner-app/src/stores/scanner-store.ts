import { create } from 'zustand';

interface TwainDevice {
  id: string;
  name: string;
  type: 'twain' | 'wia' | 'escl';
  isDefault: boolean;
}

type ServiceStatus = 'checking' | 'connected' | 'disconnected' | 'error';

interface ScannerState {
  // Service state
  serviceStatus: ServiceStatus;
  serviceError: string | null;

  // Devices
  devices: TwainDevice[];
  isLoadingDevices: boolean;

  // Scanning
  isScanning: boolean;
  scanProgress: number;
  scanError: string | null;

  // Actions
  setServiceStatus: (status: ServiceStatus) => void;
  setServiceError: (error: string | null) => void;
  setDevices: (devices: TwainDevice[]) => void;
  setIsLoadingDevices: (loading: boolean) => void;
  setIsScanning: (scanning: boolean) => void;
  setScanProgress: (progress: number) => void;
  setScanError: (error: string | null) => void;
  reset: () => void;
}

export const useScannerStore = create<ScannerState>((set) => ({
  // Initial state
  serviceStatus: 'checking',
  serviceError: null,
  devices: [],
  isLoadingDevices: false,
  isScanning: false,
  scanProgress: 0,
  scanError: null,

  // Actions
  setServiceStatus: (serviceStatus) => set({ serviceStatus }),
  setServiceError: (serviceError) => set({ serviceError }),
  setDevices: (devices) => set({ devices }),
  setIsLoadingDevices: (isLoadingDevices) => set({ isLoadingDevices }),
  setIsScanning: (isScanning) => set({ isScanning, scanProgress: 0 }),
  setScanProgress: (scanProgress) => set({ scanProgress }),
  setScanError: (scanError) => set({ scanError }),
  reset: () =>
    set({
      serviceStatus: 'checking',
      serviceError: null,
      devices: [],
      isLoadingDevices: false,
      isScanning: false,
      scanProgress: 0,
      scanError: null,
    }),
}));

export type { TwainDevice, ServiceStatus };
