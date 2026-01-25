import { create } from 'zustand';

// Types
export type ExportFileStatus = 'pending' | 'uploading' | 'uploaded' | 'error';

export interface ExportFile {
  id: number;           // EXTFILENUM
  fileName: string;     // EXTFILEDES
  source: string;       // MAILFROM
  suffix: string;       // SUFFIX
  dataUrl: string | null;  // EXTFILENAME (base64 data URL) - null until loaded on-demand
  curDate: string;      // CURDATE
  status: ExportFileStatus;
  isLoadingContent?: boolean;  // True while fetching file content
  error?: string;
}

interface ExportState {
  // Data
  files: ExportFile[];
  selectedIndex: number;
  isLoading: boolean;
  isUploading: boolean;

  // Actions
  setFiles: (files: ExportFile[]) => void;
  setIsLoading: (loading: boolean) => void;
  selectFile: (index: number) => void;
  setFileStatus: (id: number, status: ExportFileStatus, error?: string) => void;
  removeFile: (id: number) => void;
  clearAll: () => void;

  // On-demand content loading
  setFileContent: (id: number, dataUrl: string) => void;
  setFileContentLoading: (id: number, loading: boolean) => void;

  // Navigation
  goFirst: () => void;
  goPrev: () => void;
  goNext: () => void;
  goLast: () => void;

  // Upload state
  setIsUploading: (uploading: boolean) => void;

  // Computed helpers
  getSelectedFile: () => ExportFile | null;
  getPendingCount: () => number;
}

export const useExportStore = create<ExportState>((set, get) => ({
  // Initial state
  files: [],
  selectedIndex: 0,
  isLoading: false,
  isUploading: false,

  // Actions
  setFiles: (files) => set({ files, selectedIndex: 0 }),

  setIsLoading: (isLoading) => set({ isLoading }),

  selectFile: (index) => {
    const { files } = get();
    if (index >= 0 && index < files.length) {
      set({ selectedIndex: index });
    }
  },

  setFileStatus: (id, status, error) => {
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, status, error } : f
      ),
    }));
  },

  removeFile: (id) => {
    set((state) => {
      const newFiles = state.files.filter((f) => f.id !== id);
      let newIndex = state.selectedIndex;
      if (newIndex >= newFiles.length) {
        newIndex = Math.max(0, newFiles.length - 1);
      }
      return { files: newFiles, selectedIndex: newIndex };
    });
  },

  clearAll: () => set({ files: [], selectedIndex: 0 }),

  // On-demand content loading
  setFileContent: (id, dataUrl) => {
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, dataUrl, isLoadingContent: false } : f
      ),
    }));
  },

  setFileContentLoading: (id, loading) => {
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, isLoadingContent: loading } : f
      ),
    }));
  },

  // Navigation
  goFirst: () => set({ selectedIndex: 0 }),

  goPrev: () => {
    const { selectedIndex } = get();
    if (selectedIndex > 0) {
      set({ selectedIndex: selectedIndex - 1 });
    }
  },

  goNext: () => {
    const { selectedIndex, files } = get();
    if (selectedIndex < files.length - 1) {
      set({ selectedIndex: selectedIndex + 1 });
    }
  },

  goLast: () => {
    const { files } = get();
    set({ selectedIndex: Math.max(0, files.length - 1) });
  },

  // Upload state
  setIsUploading: (isUploading) => set({ isUploading }),

  // Computed helpers
  getSelectedFile: () => {
    const { files, selectedIndex } = get();
    return files[selectedIndex] || null;
  },

  getPendingCount: () => get().files.filter((f) => f.status === 'pending').length,
}));
