import { create } from 'zustand';

// Types
export type BarcodeStatus = 'pending' | 'detecting' | 'detected' | 'matched' | 'error' | 'not_found';

export interface FormPrefixInfo {
  ENAME: string;
  TITLE: string;
  SUBENAME?: string;
  PREFIX: string;
}

export interface Document {
  Form: string;
  FormDesc?: string;
  FormKey: string;
  DocNo?: string;
  DocDate?: string;
  CustName?: string;
  Details?: string;
  ExtFilesForm: string;
}

export interface BarcodeFile {
  id: string;
  fileName: string;
  fileData: string; // Base64 data URL
  fileType: 'image' | 'pdf';
  status: BarcodeStatus;
  barcode: string | null;
  prefix: string | null;
  docNumber: string | null;
  matchedDocument: Document | null;
  error: string | null;
  timestamp: number;
}

interface BarcodeState {
  // Form prefix cache (loaded once)
  formPrefixes: FormPrefixInfo[];
  prefixMap: Map<string, FormPrefixInfo>;
  isPrefixesLoaded: boolean;
  isPrefixesLoading: boolean;
  prefixError: string | null;

  // File processing state
  files: BarcodeFile[];
  selectedIndex: number;
  isProcessing: boolean;
  currentProcessingId: string | null;

  // Batch upload state
  isUploading: boolean;
  uploadProgress: number;

  // Prefix cache actions
  setFormPrefixes: (prefixes: FormPrefixInfo[]) => void;
  setIsPrefixesLoading: (loading: boolean) => void;
  setPrefixError: (error: string | null) => void;
  getFormByPrefix: (prefix: string) => FormPrefixInfo | undefined;

  // File actions
  addFile: (file: Omit<BarcodeFile, 'id' | 'status' | 'barcode' | 'prefix' | 'docNumber' | 'matchedDocument' | 'error' | 'timestamp'>) => string;
  addFiles: (files: Omit<BarcodeFile, 'id' | 'status' | 'barcode' | 'prefix' | 'docNumber' | 'matchedDocument' | 'error' | 'timestamp'>[]) => void;
  removeFile: (id: string) => void;
  clearAll: () => void;

  // Navigation actions
  selectFile: (index: number) => void;
  goFirst: () => void;
  goPrev: () => void;
  goNext: () => void;
  goLast: () => void;

  // Processing actions
  setFileStatus: (id: string, status: BarcodeStatus) => void;
  setFileBarcode: (id: string, barcode: string, prefix: string, docNumber: string) => void;
  setFileMatchedDocument: (id: string, document: Document) => void;
  setFileError: (id: string, error: string) => void;

  setIsProcessing: (processing: boolean) => void;
  setCurrentProcessingId: (id: string | null) => void;

  // Upload actions
  setIsUploading: (uploading: boolean) => void;
  setUploadProgress: (progress: number) => void;

  // Computed helpers
  getReadyFiles: () => BarcodeFile[];
  getPendingFiles: () => BarcodeFile[];
  getMatchedCount: () => number;
  getErrorCount: () => number;
  getSelectedFile: () => BarcodeFile | null;
}

export const useBarcodeStore = create<BarcodeState>((set, get) => ({
  // Initial state - prefix cache
  formPrefixes: [],
  prefixMap: new Map(),
  isPrefixesLoaded: false,
  isPrefixesLoading: false,
  prefixError: null,

  // Initial state - file processing
  files: [],
  selectedIndex: 0,
  isProcessing: false,
  currentProcessingId: null,

  // Initial state - upload
  isUploading: false,
  uploadProgress: 0,

  // Prefix cache actions
  setFormPrefixes: (prefixes) => {
    const prefixMap = new Map<string, FormPrefixInfo>();
    for (const prefix of prefixes) {
      prefixMap.set(prefix.PREFIX.toUpperCase(), prefix);
    }
    set({
      formPrefixes: prefixes,
      prefixMap,
      isPrefixesLoaded: true,
      isPrefixesLoading: false,
      prefixError: null,
    });
  },

  setIsPrefixesLoading: (isPrefixesLoading) => set({ isPrefixesLoading }),

  setPrefixError: (prefixError) => set({ prefixError, isPrefixesLoading: false }),

  getFormByPrefix: (prefix) => {
    return get().prefixMap.get(prefix.toUpperCase());
  },

  // File actions
  addFile: (file) => {
    const id = crypto.randomUUID();
    const newFile: BarcodeFile = {
      ...file,
      id,
      status: 'pending',
      barcode: null,
      prefix: null,
      docNumber: null,
      matchedDocument: null,
      error: null,
      timestamp: Date.now(),
    };
    set((state) => ({ files: [...state.files, newFile] }));
    return id;
  },

  addFiles: (files) => {
    const newFiles: BarcodeFile[] = files.map((file) => ({
      ...file,
      id: crypto.randomUUID(),
      status: 'pending' as BarcodeStatus,
      barcode: null,
      prefix: null,
      docNumber: null,
      matchedDocument: null,
      error: null,
      timestamp: Date.now(),
    }));
    set((state) => ({ files: [...state.files, ...newFiles] }));
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

  clearAll: () => set({ files: [], selectedIndex: 0, uploadProgress: 0 }),

  // Navigation actions
  selectFile: (index) => {
    const { files } = get();
    if (index >= 0 && index < files.length) {
      set({ selectedIndex: index });
    }
  },

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

  // Processing actions
  setFileStatus: (id, status) => {
    set((state) => ({
      files: state.files.map((f) => (f.id === id ? { ...f, status } : f)),
    }));
  },

  setFileBarcode: (id, barcode, prefix, docNumber) => {
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, barcode, prefix, docNumber, status: 'detected' as BarcodeStatus } : f
      ),
    }));
  },

  setFileMatchedDocument: (id, document) => {
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, matchedDocument: document, status: 'matched' as BarcodeStatus } : f
      ),
    }));
  },

  setFileError: (id, error) => {
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id ? { ...f, error, status: 'error' as BarcodeStatus } : f
      ),
    }));
  },

  setIsProcessing: (isProcessing) => set({ isProcessing }),
  setCurrentProcessingId: (currentProcessingId) => set({ currentProcessingId }),

  // Upload actions
  setIsUploading: (isUploading) => set({ isUploading }),
  setUploadProgress: (uploadProgress) => set({ uploadProgress }),

  // Computed helpers
  getReadyFiles: () => get().files.filter((f) => f.status === 'matched'),
  getPendingFiles: () => get().files.filter((f) => f.status === 'pending'),
  getMatchedCount: () => get().files.filter((f) => f.status === 'matched').length,
  getErrorCount: () => get().files.filter((f) => f.status === 'error' || f.status === 'not_found').length,
  getSelectedFile: () => {
    const { files, selectedIndex } = get();
    return files[selectedIndex] || null;
  },
}));
