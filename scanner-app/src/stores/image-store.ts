import { create } from 'zustand';

export type ViewMode = '1x1' | '2x2' | '3x3' | '4x4' | '5x5';
export type FileType = 'image' | 'pdf';

// A single page/image for display
interface PageImage {
  id: string;
  data: string; // Rendered image data URL for display
  width: number;
  height: number;
  pageNumber: number;
}

// A file group (single image or multi-page PDF)
interface FileGroup {
  id: string;
  fileName: string;
  originalData: string; // Original file data (PDF or image) for upload
  originalType: FileType;
  mimeType: string;
  pages: PageImage[]; // Rendered pages for display
  timestamp: number;
}

// Flattened page with group reference (for viewer navigation)
interface FlatPage {
  groupId: string;
  groupIndex: number;
  pageIndex: number;
  page: PageImage;
  fileName: string;
  totalPagesInGroup: number;
}

interface ImageState {
  // File groups
  fileGroups: FileGroup[];
  selectedPageIndex: number; // Index in flattened pages array

  // View state
  viewMode: ViewMode;
  zoomLevel: number;

  // Computed helpers
  getFlatPages: () => FlatPage[];
  getCurrentPage: () => FlatPage | null;
  getSelectedGroupIndex: () => number;

  // Actions
  addFileGroup: (group: Omit<FileGroup, 'id' | 'timestamp'>) => void;
  removeFileGroup: (groupId: string) => void;
  clearAll: () => void;
  rotateCurrentPage: () => Promise<void>;

  // Navigation
  selectPage: (index: number) => void;
  selectGroup: (groupIndex: number) => void;
  goFirst: () => void;
  goPrev: () => void;
  goNext: () => void;
  goLast: () => void;

  // View
  setViewMode: (mode: ViewMode) => void;
  setZoomLevel: (level: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;

  // Legacy compatibility - flat images array
  get images(): FlatPage[];
  get selectedIndex(): number;
}

export const useImageStore = create<ImageState>((set, get) => ({
  // Initial state
  fileGroups: [],
  selectedPageIndex: 0,
  viewMode: '1x1',
  zoomLevel: 1,

  // Computed: Get flattened pages array
  getFlatPages: () => {
    const { fileGroups } = get();
    const flatPages: FlatPage[] = [];

    fileGroups.forEach((group, groupIndex) => {
      group.pages.forEach((page, pageIndex) => {
        flatPages.push({
          groupId: group.id,
          groupIndex,
          pageIndex,
          page,
          fileName: group.fileName,
          totalPagesInGroup: group.pages.length,
        });
      });
    });

    return flatPages;
  },

  // Computed: Get current page
  getCurrentPage: () => {
    const { selectedPageIndex } = get();
    const flatPages = get().getFlatPages();
    return flatPages[selectedPageIndex] || null;
  },

  // Computed: Get selected group index
  getSelectedGroupIndex: () => {
    const currentPage = get().getCurrentPage();
    return currentPage?.groupIndex ?? -1;
  },

  // Legacy compatibility getters
  get images() {
    return get().getFlatPages();
  },

  get selectedIndex() {
    return get().selectedPageIndex;
  },

  // Actions
  addFileGroup: (group) => {
    const newGroup: FileGroup = {
      ...group,
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      pages: group.pages.map((page, idx) => ({
        ...page,
        id: crypto.randomUUID(),
        pageNumber: idx + 1,
      })),
    };

    set((state) => {
      const newGroups = [...state.fileGroups, newGroup];
      // Calculate new selected index (first page of new group)
      let newSelectedIndex = 0;
      for (let i = 0; i < state.fileGroups.length; i++) {
        newSelectedIndex += state.fileGroups[i].pages.length;
      }
      return {
        fileGroups: newGroups,
        selectedPageIndex: newSelectedIndex,
      };
    });
  },

  removeFileGroup: (groupId) => {
    set((state) => {
      const groupIndex = state.fileGroups.findIndex((g) => g.id === groupId);
      if (groupIndex === -1) return state;

      // Calculate pages before this group
      let pagesBefore = 0;
      for (let i = 0; i < groupIndex; i++) {
        pagesBefore += state.fileGroups[i].pages.length;
      }

      const newGroups = state.fileGroups.filter((g) => g.id !== groupId);

      // Adjust selected index
      let newSelectedIndex = state.selectedPageIndex;
      const removedGroupPages = state.fileGroups[groupIndex].pages.length;

      if (state.selectedPageIndex >= pagesBefore + removedGroupPages) {
        // Selected page was after the removed group
        newSelectedIndex -= removedGroupPages;
      } else if (state.selectedPageIndex >= pagesBefore) {
        // Selected page was in the removed group
        newSelectedIndex = Math.max(0, pagesBefore - 1);
      }

      // Make sure index is valid
      let totalPages = 0;
      newGroups.forEach((g) => (totalPages += g.pages.length));
      if (newSelectedIndex >= totalPages) {
        newSelectedIndex = Math.max(0, totalPages - 1);
      }

      return {
        fileGroups: newGroups,
        selectedPageIndex: newSelectedIndex,
      };
    });
  },

  clearAll: () => set({ fileGroups: [], selectedPageIndex: 0 }),

  rotateCurrentPage: async () => {
    const currentPage = get().getCurrentPage();
    if (!currentPage) return;

    const { fileGroups } = get();
    const group = fileGroups[currentPage.groupIndex];
    if (!group) return;

    return new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve();
          return;
        }

        // Swap width and height for 90-degree rotation
        canvas.width = img.height;
        canvas.height = img.width;

        // Rotate 90 degrees clockwise
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);

        // Get the rotated image data
        const rotatedData = canvas.toDataURL('image/png');

        // Update the page in the group
        set((state) => ({
          fileGroups: state.fileGroups.map((g, gi) =>
            gi === currentPage.groupIndex
              ? {
                  ...g,
                  pages: g.pages.map((p, pi) =>
                    pi === currentPage.pageIndex
                      ? { ...p, data: rotatedData, width: canvas.width, height: canvas.height }
                      : p
                  ),
                }
              : g
          ),
        }));

        resolve();
      };
      img.onerror = () => resolve();
      img.src = currentPage.page.data;
    });
  },

  // Navigation
  selectPage: (index) => {
    const flatPages = get().getFlatPages();
    if (index >= 0 && index < flatPages.length) {
      set({ selectedPageIndex: index });
    }
  },

  selectGroup: (groupIndex) => {
    const { fileGroups } = get();
    if (groupIndex < 0 || groupIndex >= fileGroups.length) return;

    // Calculate the first page index for this group
    let pageIndex = 0;
    for (let i = 0; i < groupIndex; i++) {
      pageIndex += fileGroups[i].pages.length;
    }

    set({ selectedPageIndex: pageIndex });
  },

  goFirst: () => set({ selectedPageIndex: 0 }),

  goPrev: () => {
    const { selectedPageIndex } = get();
    if (selectedPageIndex > 0) {
      set({ selectedPageIndex: selectedPageIndex - 1 });
    }
  },

  goNext: () => {
    const { selectedPageIndex } = get();
    const flatPages = get().getFlatPages();
    if (selectedPageIndex < flatPages.length - 1) {
      set({ selectedPageIndex: selectedPageIndex + 1 });
    }
  },

  goLast: () => {
    const flatPages = get().getFlatPages();
    set({ selectedPageIndex: Math.max(0, flatPages.length - 1) });
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

export type { PageImage, FileGroup, FlatPage };

// Legacy compatibility type
export interface ScannedImage {
  id: string;
  data: string;
  width: number;
  height: number;
  timestamp: number;
  fileType?: FileType;
  fileName?: string;
}
