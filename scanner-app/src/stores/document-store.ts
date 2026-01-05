import { create } from 'zustand';

interface Company {
  DNAME: string;
  TITLE: string;
}

interface FormInfo {
  ENAME: string;
  TITLE: string;
}

interface SearchGroup {
  FSGROUP: number;
  FSGROUPNAME: string;
  GROUPFORMS: FormInfo[];
}

interface Document {
  Form: string;
  FormDesc?: string;
  FormKey: string;
  DocNo?: string;
  DocDate?: string;
  CustName?: string;
  Details?: string;
  ExtFilesForm: string;
}

interface Attachment {
  EXTFILENUM: number;
  EXTFILEDES: string;
  EXTFILENAME: string;
  SUFFIX: string;
  FILESIZE?: number;
  CURDATE?: string;
}

interface DocumentState {
  // Companies
  companies: Company[];
  selectedCompany: string | null;
  isLoadingCompanies: boolean;

  // Search groups
  searchGroups: SearchGroup[];
  selectedGroupId: number | null;
  selectedForm: string | null;
  isLoadingGroups: boolean;

  // Search
  searchTerm: string;
  isSearching: boolean;
  searchResults: Document[];
  searchError: string | null;

  // Selected document
  selectedDocument: Document | null;

  // Attachments
  attachments: Attachment[];
  isLoadingAttachments: boolean;

  // Actions
  setCompanies: (companies: Company[]) => void;
  setSelectedCompany: (company: string | null) => void;
  setIsLoadingCompanies: (loading: boolean) => void;

  setSearchGroups: (groups: SearchGroup[]) => void;
  setSelectedGroupId: (groupId: number | null) => void;
  setSelectedForm: (form: string | null) => void;
  setIsLoadingGroups: (loading: boolean) => void;

  setSearchTerm: (term: string) => void;
  setIsSearching: (searching: boolean) => void;
  setSearchResults: (results: Document[]) => void;
  setSearchError: (error: string | null) => void;

  setSelectedDocument: (doc: Document | null) => void;

  setAttachments: (attachments: Attachment[]) => void;
  setIsLoadingAttachments: (loading: boolean) => void;

  clearSearch: () => void;
}

export const useDocumentStore = create<DocumentState>((set) => ({
  // Initial state
  companies: [],
  selectedCompany: null,
  isLoadingCompanies: false,

  searchGroups: [],
  selectedGroupId: null,
  selectedForm: null,
  isLoadingGroups: false,

  searchTerm: '',
  isSearching: false,
  searchResults: [],
  searchError: null,

  selectedDocument: null,

  attachments: [],
  isLoadingAttachments: false,

  // Actions
  setCompanies: (companies) => set({ companies }),
  setSelectedCompany: (selectedCompany) => set({ selectedCompany }),
  setIsLoadingCompanies: (isLoadingCompanies) => set({ isLoadingCompanies }),

  setSearchGroups: (searchGroups) => set({ searchGroups }),
  setSelectedGroupId: (selectedGroupId) => set({ selectedGroupId }),
  setSelectedForm: (selectedForm) => set({ selectedForm }),
  setIsLoadingGroups: (isLoadingGroups) => set({ isLoadingGroups }),

  setSearchTerm: (searchTerm) => set({ searchTerm }),
  setIsSearching: (isSearching) => set({ isSearching }),
  setSearchResults: (searchResults) => set({ searchResults }),
  setSearchError: (searchError) => set({ searchError }),

  setSelectedDocument: (selectedDocument) => set({ selectedDocument }),

  setAttachments: (attachments) => set({ attachments }),
  setIsLoadingAttachments: (isLoadingAttachments) =>
    set({ isLoadingAttachments }),

  clearSearch: () =>
    set({
      searchTerm: '',
      searchResults: [],
      searchError: null,
      selectedDocument: null,
      attachments: [],
    }),
}));

// Export types for use elsewhere
export type { Company, FormInfo, SearchGroup, Document, Attachment };
