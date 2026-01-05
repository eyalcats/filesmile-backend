import { create } from 'zustand';

export type ViewMode = '1x1' | '2x2' | '3x3' | '4x4' | '5x5';

interface ScannedImage {
  id: string;
  data: string; // Base64 data URL
  width: number;
  height: number;
  timestamp: number;
}

interface ImageState {
  // Image buffer
  images: ScannedImage[];
  selectedIndex: number;

  // View state
  viewMode: ViewMode;
  zoomLevel: number;

  // Actions
  addImage: (image: Omit<ScannedImage, 'id' | 'timestamp'>) => void;
  addImages: (images: Omit<ScannedImage, 'id' | 'timestamp'>[]) => void;
  removeImage: (index: number) => void;
  clearAll: () => void;
  updateImage: (index: number, data: string) => void;

  // Navigation
  selectImage: (index: number) => void;
  goFirst: () => void;
  goPrev: () => void;
  goNext: () => void;
  goLast: () => void;

  // View
  setViewMode: (mode: ViewMode) => void;
  setZoomLevel: (level: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

export const useImageStore = create<ImageState>((set, get) => ({
  // Initial state
  images: [],
  selectedIndex: 0,
  viewMode: '1x1',
  zoomLevel: 1,

  // Actions
  addImage: (image) => {
    const newImage: ScannedImage = {
      ...image,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    };
    set((state) => ({
      images: [...state.images, newImage],
      selectedIndex: state.images.length, // Select the new image
    }));
  },

  addImages: (images) => {
    const newImages: ScannedImage[] = images.map((img) => ({
      ...img,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
    }));
    set((state) => ({
      images: [...state.images, ...newImages],
      selectedIndex: state.images.length, // Select first of new images
    }));
  },

  removeImage: (index) => {
    set((state) => {
      const newImages = state.images.filter((_, i) => i !== index);
      let newIndex = state.selectedIndex;
      if (newIndex >= newImages.length) {
        newIndex = Math.max(0, newImages.length - 1);
      }
      return { images: newImages, selectedIndex: newIndex };
    });
  },

  clearAll: () => set({ images: [], selectedIndex: 0 }),

  updateImage: (index, data) => {
    set((state) => ({
      images: state.images.map((img, i) =>
        i === index ? { ...img, data } : img
      ),
    }));
  },

  // Navigation
  selectImage: (index) => {
    const { images } = get();
    if (index >= 0 && index < images.length) {
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
    const { selectedIndex, images } = get();
    if (selectedIndex < images.length - 1) {
      set({ selectedIndex: selectedIndex + 1 });
    }
  },

  goLast: () => {
    const { images } = get();
    set({ selectedIndex: Math.max(0, images.length - 1) });
  },

  // View
  setViewMode: (viewMode) => set({ viewMode }),

  setZoomLevel: (zoomLevel) => set({ zoomLevel: Math.max(0.1, Math.min(5, zoomLevel)) }),

  zoomIn: () => {
    const { zoomLevel } = get();
    set({ zoomLevel: Math.min(5, zoomLevel + 0.25) });
  },

  zoomOut: () => {
    const { zoomLevel } = get();
    set({ zoomLevel: Math.max(0.1, zoomLevel - 0.25) });
  },
}));

export type { ScannedImage };
