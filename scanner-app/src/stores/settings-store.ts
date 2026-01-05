import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AppMode = 'scan' | 'file';
export type ColorMode = 'gray' | 'bw' | 'rgb';
export type OutputFormat = 'pdf' | 'tiff';
export type Resolution = 100 | 150 | 200 | 300 | 600;

interface SettingsState {
  // App mode
  mode: AppMode;

  // Scanner settings
  selectedDeviceId: string | null;
  resolution: Resolution;
  colorMode: ColorMode;
  duplex: boolean;
  autoFeeder: boolean;
  autoSave: boolean;
  outputFormat: OutputFormat;

  // Priority defaults
  defaultCompany: string | null;
  defaultSearchGroupId: number | null;

  // Actions
  setMode: (mode: AppMode) => void;
  setSelectedDeviceId: (deviceId: string | null) => void;
  setResolution: (resolution: Resolution) => void;
  setColorMode: (colorMode: ColorMode) => void;
  setDuplex: (duplex: boolean) => void;
  setAutoFeeder: (autoFeeder: boolean) => void;
  setAutoSave: (autoSave: boolean) => void;
  setOutputFormat: (format: OutputFormat) => void;
  setDefaultCompany: (company: string | null) => void;
  setDefaultSearchGroupId: (groupId: number | null) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Default values
      mode: 'scan',
      selectedDeviceId: null,
      resolution: 150,
      colorMode: 'gray',
      duplex: false,
      autoFeeder: false,
      autoSave: false,
      outputFormat: 'pdf',
      defaultCompany: null,
      defaultSearchGroupId: null,

      // Actions
      setMode: (mode) => set({ mode }),
      setSelectedDeviceId: (selectedDeviceId) => set({ selectedDeviceId }),
      setResolution: (resolution) => set({ resolution }),
      setColorMode: (colorMode) => set({ colorMode }),
      setDuplex: (duplex) => set({ duplex }),
      setAutoFeeder: (autoFeeder) => set({ autoFeeder }),
      setAutoSave: (autoSave) => set({ autoSave }),
      setOutputFormat: (outputFormat) => set({ outputFormat }),
      setDefaultCompany: (defaultCompany) => set({ defaultCompany }),
      setDefaultSearchGroupId: (defaultSearchGroupId) =>
        set({ defaultSearchGroupId }),
    }),
    {
      name: 'filesmile-settings',
    }
  )
);
