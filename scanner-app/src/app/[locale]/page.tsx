'use client';

import { useState, useRef, useCallback, useEffect, Suspense } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { Header } from '@/components/layout/Header';
import { ModeToggle } from '@/components/layout/ModeToggle';
import { useSettingsStore } from '@/stores/settings-store';
import { useDocumentStore } from '@/stores/document-store';
import { useAuthStore } from '@/stores/auth-store';
import { useDeepLink } from '@/hooks/useDeepLink';
import { extractDocNoFromFormKey } from '@/lib/deep-link';
import type { Document } from '@/lib/api/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Loader2,
  Upload,
  X,
  Trash2,
} from 'lucide-react';
import {
  CompanySelector,
  SearchGroupSelector,
  DocumentSearch,
  DocumentList,
  SelectedDocument,
  AttachmentList,
} from '@/components/priority';
import { ScanButton } from '@/components/scanner';
import { BarcodeProcessor, BarcodeFileList, BarcodeViewer, BarcodeFileTable } from '@/components/barcode';
import { ImageFileTable } from '@/components/document';
import { ImageViewer } from '@/components/viewer';
import { useBarcodeStore } from '@/stores/barcode-store';
import { useImageStore } from '@/stores/image-store';
import { api } from '@/lib/api';
import { splitPdfIntoPages } from '@/lib/barcode/pdf-extractor';
import { cn } from '@/lib/utils';

function HomePageContent() {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === 'he';
  const router = useRouter();
  const pathname = usePathname();
  const { mode } = useSettingsStore();
  const { isAuthenticated } = useAuthStore();
  const {
    selectedDocument,
    companies,
    searchGroups,
    setSelectedCompany,
    setSelectedDocument,
    setSelectedGroupId,
    setSelectedForm,
    setSearchTerm,
  } = useDocumentStore();

  // Deep link handling
  const { params: deepLinkParams, isDeepLink, isProcessed, markProcessed } = useDeepLink();

  // Handle deep link navigation
  useEffect(() => {
    if (!deepLinkParams || isProcessed || !isAuthenticated) {
      return;
    }

    // Wait for companies and search groups to be loaded
    if (companies.length === 0 || searchGroups.length === 0) {
      return;
    }

    // Check if the company exists in user's available companies
    const companyExists = companies.some(
      (c) => c.DNAME.toLowerCase() === deepLinkParams.company.toLowerCase()
    );

    if (!companyExists) {
      console.warn(`Deep link company not found: ${deepLinkParams.company}`);
      alert(t('deepLink.companyNotFound', { company: deepLinkParams.company }));
      markProcessed();
      return;
    }

    // Mark as processed immediately to prevent re-processing
    markProcessed();

    // Set the company
    setSelectedCompany(deepLinkParams.company);

    // Find a search group that contains the form and set it
    const matchingGroup = searchGroups.find((group) =>
      group.GROUPFORMS.some(
        (form) => form.ENAME.toLowerCase() === deepLinkParams.form.toLowerCase()
      )
    );

    if (matchingGroup) {
      setSelectedGroupId(matchingGroup.FSGROUP);
      setSelectedForm(deepLinkParams.form);
    }

    // Extract document number from FormKey to fetch full details
    const docNo = extractDocNoFromFormKey(deepLinkParams.formKey);

    // Set the search term to the document number
    if (docNo) {
      setSearchTerm(docNo);
    }

    // Fetch full document details from API
    const fetchDocumentDetails = async () => {
      try {
        if (docNo) {
          // Try to fetch full document details
          const fullDocument = await api.findDocumentByNumber(deepLinkParams.form, docNo);
          // Use the FormKey from URL params (it may have more complete key info)
          setSelectedDocument({
            ...fullDocument,
            FormKey: deepLinkParams.formKey,
            ExtFilesForm: deepLinkParams.extFilesForm,
          });
        } else {
          // Fallback: create minimal document object from URL params
          const document: Document = {
            Form: deepLinkParams.form,
            FormDesc: deepLinkParams.form,
            FormKey: deepLinkParams.formKey,
            ExtFilesForm: deepLinkParams.extFilesForm,
          };
          setSelectedDocument(document);
        }
      } catch (error) {
        console.warn('Failed to fetch document details, using URL params:', error);
        // Fallback: create minimal document object from URL params
        const document: Document = {
          Form: deepLinkParams.form,
          FormDesc: deepLinkParams.form,
          FormKey: deepLinkParams.formKey,
          DocNo: docNo,
          ExtFilesForm: deepLinkParams.extFilesForm,
        };
        setSelectedDocument(document);
      }

      // Clear the URL query string for cleaner UX
      router.replace(pathname, { scroll: false });
    };

    fetchDocumentDetails();
  }, [
    deepLinkParams,
    isProcessed,
    isAuthenticated,
    companies,
    searchGroups,
    setSelectedCompany,
    setSelectedDocument,
    setSelectedGroupId,
    setSelectedForm,
    setSearchTerm,
    markProcessed,
    router,
    pathname,
    t,
  ]);
  const {
    fileGroups,
    selectedPageIndex,
    getFlatPages,
    getCurrentPage,
    getSelectedGroupIndex,
    removeFileGroup,
    goFirst,
    goPrev,
    goNext,
    goLast,
  } = useImageStore();

  // Get flattened pages for display
  const flatPages = getFlatPages();
  const currentPage = getCurrentPage();
  const selectedGroupIndex = getSelectedGroupIndex();

  // Modal states
  const [showDocumentList, setShowDocumentList] = useState(false);
  const [showAttachmentList, setShowAttachmentList] = useState(false);

  // Remark input
  const [remark, setRemark] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file selection (from input or drop)
  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const { addFileGroup } = useImageStore.getState();

    for (const file of Array.from(files)) {
      // Handle PDF files - convert to images for display but keep original for upload
      if (file.type === 'application/pdf') {
        const reader = new FileReader();
        const originalDataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        if (!originalDataUrl) continue;

        // Convert PDF pages to images for display
        const pages = await splitPdfIntoPages(originalDataUrl);

        // Create a file group with original PDF data and rendered pages
        addFileGroup({
          fileName: file.name,
          originalData: originalDataUrl, // Keep original PDF for upload
          originalType: 'pdf',
          mimeType: 'application/pdf',
          pages: pages.map((page) => ({
            id: '', // Will be assigned by store
            data: page.imageData,
            width: page.width,
            height: page.height,
            pageNumber: page.pageNumber,
          })),
        });
        continue;
      }

      // Handle image files
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        if (!dataUrl) continue;

        // Get image dimensions
        const dimensions = await new Promise<{ width: number; height: number }>((resolve) => {
          const img = new Image();
          img.onload = () => resolve({ width: img.width, height: img.height });
          img.onerror = () => resolve({ width: 0, height: 0 });
          img.src = dataUrl;
        });

        // Create a file group with single image
        addFileGroup({
          fileName: file.name,
          originalData: dataUrl, // Original image data
          originalType: 'image',
          mimeType: file.type,
          pages: [{
            id: '', // Will be assigned by store
            data: dataUrl,
            width: dimensions.width,
            height: dimensions.height,
            pageNumber: 1,
          }],
        });
      }
    }
  }, []);

  // Helper to convert blob URL or data URL to base64
  const getImageBase64 = async (imageData: string): Promise<{ base64: string; mimeType: string }> => {
    // Handle blob URLs (from scanner service)
    if (imageData.startsWith('blob:')) {
      const response = await fetch(imageData);
      const blob = await response.blob();
      const mimeType = blob.type || 'image/png';

      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          const base64 = dataUrl.split(',')[1];
          resolve({ base64, mimeType });
        };
        reader.onerror = () => reject(new Error('Failed to read blob'));
        reader.readAsDataURL(blob);
      });
    }

    // Handle data URLs
    if (imageData.startsWith('data:')) {
      const mimeMatch = imageData.match(/^data:([^;]+);/);
      const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
      const base64 = imageData.split(',')[1];
      return { base64, mimeType };
    }

    throw new Error('Unsupported image format');
  };

  const handleUpload = async () => {
    if (!selectedDocument || fileGroups.length === 0) return;

    setIsUploading(true);
    try {
      // Upload each file group as an attachment
      for (let i = 0; i < fileGroups.length; i++) {
        const group = fileGroups[i];

        if (!group.originalData) {
          throw new Error(`No file data for ${group.fileName}`);
        }

        // Extract base64 from data URL or blob URL
        let base64Data: string;
        let mimeType = group.mimeType;

        if (group.originalData.startsWith('blob:')) {
          // Convert blob URL to base64
          const result = await getImageBase64(group.originalData);
          base64Data = result.base64;
          mimeType = result.mimeType;
        } else if (group.originalData.startsWith('data:')) {
          // Extract base64 from data URL
          base64Data = group.originalData.split(',')[1];
          if (!base64Data) {
            throw new Error(`Failed to extract base64 data for ${group.fileName}`);
          }
        } else {
          throw new Error(`Unsupported data format for ${group.fileName}`);
        }

        // Get extension from filename or mime type
        const extension = group.originalType === 'pdf'
          ? 'pdf'
          : (mimeType.split('/')[1] || 'png');

        // Create description with remark
        const description = remark
          ? `${remark}${fileGroups.length > 1 ? ` (${i + 1}/${fileGroups.length})` : ''}`
          : group.fileName;

        console.log(`Uploading file ${i + 1}:`, {
          form: selectedDocument.Form,
          formKey: selectedDocument.FormKey,
          description,
          extension,
          mimeType,
          base64Length: base64Data.length,
          extFilesForm: selectedDocument.ExtFilesForm || 'EXTFILES',
          originalType: group.originalType,
        });

        await api.uploadAttachment(
          selectedDocument.Form,
          selectedDocument.FormKey,
          description,
          base64Data,
          extension,
          selectedDocument.ExtFilesForm || 'EXTFILES',
          mimeType
        );
      }

      // Clear files after successful upload
      useImageStore.getState().clearAll();
      setRemark('');

      // Refresh attachments list
      const files = await api.getAttachments(
        selectedDocument.Form,
        selectedDocument.FormKey,
        selectedDocument.ExtFilesForm || 'EXTFILES'
      );
      useDocumentStore.getState().setAttachments(
        files.map((f) => ({
          EXTFILENUM: f.EXTFILENUM || 0,
          EXTFILEDES: f.EXTFILEDES || '',
          EXTFILENAME: f.EXTFILENAME || '',
          SUFFIX: f.SUFFIX || '',
          FILESIZE: f.FILESIZE,
          CURDATE: f.CURDATE,
        }))
      );

      alert(t('priority.uploadSuccess'));
    } catch (error) {
      console.error('Upload failed:', error);
      // Show detailed error message
      const errorMsg = error instanceof Error ? error.message : JSON.stringify(error);
      alert(`${t('priority.uploadError')}: ${errorMsg}`);
    } finally {
      setIsUploading(false);
    }
  };

  // Delete the current file group (not individual page)
  const handleDeleteCurrentGroup = () => {
    if (currentPage) {
      removeFileGroup(currentPage.groupId);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-gray-50 overflow-hidden">
      <Header />

      {/* Mode Toggle - Centered above content */}
      <div className="w-full flex justify-center py-3 bg-gray-50 border-b">
        <ModeToggle />
      </div>

      <main className={`flex-1 container mx-auto p-4 max-w-7xl ${mode === 'barcode' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto'}`}>
        {mode === 'barcode' ? (
          /* Barcode Mode - Fixed height layout with internal scrolling
             RTL: File table on left, viewer on right */
          <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
            {/* File Table - appears on left in RTL, right in LTR */}
            <div className={`lg:w-7/12 min-h-0 flex flex-col ${isRTL ? 'order-1' : 'order-2'}`}>
              <div className="bg-white rounded-lg border-2 border-amber-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
                <div className="bg-amber-50 px-4 py-2 border-b border-amber-100 flex-shrink-0" dir={isRTL ? 'rtl' : 'ltr'}>
                  <h2 className={`text-xs font-bold text-amber-700 uppercase tracking-wide ${isRTL ? 'text-right' : ''}`}>
                    {t('files.selectedFiles')}
                  </h2>
                </div>
                <div className="flex-1 min-h-0 overflow-auto">
                  <BarcodeFileTable />
                </div>
                {/* Action Bar - Add Files + Scan + Upload + Clear */}
                <div className="bg-gray-100 px-3 py-2 border-t border-gray-200 flex-shrink-0">
                  <BarcodeProcessor compact />
                </div>
              </div>
            </div>

            {/* Document Viewer - appears on right in RTL, left in LTR */}
            <div className={`lg:w-5/12 flex flex-col min-h-0 ${isRTL ? 'order-2' : 'order-1'}`}>
              <div className="bg-white rounded-lg border-2 border-amber-200 shadow-sm overflow-hidden flex flex-col flex-1 min-h-0">
                <div className="bg-amber-50 px-4 py-2 border-b border-amber-100 flex-shrink-0" dir={isRTL ? 'rtl' : 'ltr'}>
                  <h2 className={`text-xs font-bold text-amber-700 uppercase tracking-wide ${isRTL ? 'text-right' : ''}`}>
                    {t('barcode.title')}
                  </h2>
                </div>
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                  <BarcodeViewer />
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Scan/File Mode - Standard layout with search panel */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[calc(100vh-180px)]">
            {/* Left Panel - Search & Document Info */}
            <div className="lg:col-span-4 xl:col-span-3 space-y-4 overflow-auto">
              {/* Search Group Box */}
              <div className="bg-white rounded-lg border-2 border-amber-200 shadow-sm overflow-hidden">
                <div className="bg-amber-50 px-4 py-2 border-b border-amber-100">
                  <h2 className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                    {t('priority.searchBy')}
                  </h2>
                </div>
                <div className="p-4 space-y-3">
                  {isAuthenticated ? (
                    <>
                      <CompanySelector />
                      <SearchGroupSelector />
                      <DocumentSearch onResultsFound={() => setShowDocumentList(true)} />
                    </>
                  ) : (
                    <p className="text-muted-foreground text-sm text-center py-4">
                      {t('common.loading')}
                    </p>
                  )}
                </div>
              </div>

              {/* Selected Document Group Box */}
              {selectedDocument && (
                <div className="bg-amber-50 rounded-lg border-2 border-amber-300 shadow-sm overflow-hidden relative">
                  <div className="bg-amber-100 px-4 py-2 border-b border-amber-200 flex items-center justify-between">
                    <h2 className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                      {t('priority.selectedDocument')}
                    </h2>
                    <div className="flex items-center gap-1">
                      <SelectedDocument
                        headerMode
                        onShowAttachments={() => setShowAttachmentList(true)}
                      />
                      <button
                        onClick={() => useDocumentStore.getState().setSelectedDocument(null)}
                        className="text-gray-500 hover:text-red-500 transition-colors"
                        title={t('common.clear')}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="p-3">
                    <SelectedDocument />
                  </div>
                </div>
              )}
            </div>

            {/* Right Panel - File List + Viewer */}
            <div className="lg:col-span-8 xl:col-span-9 flex flex-col gap-4 h-[calc(100vh-180px)]">
              {/* Top Section: File List + Viewer side by side */}
              <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-0">
                {/* File List Panel - 5/12 width */}
                <div className="lg:w-5/12 bg-white rounded-lg border-2 border-amber-200 shadow-sm overflow-hidden flex flex-col">
                  <ImageFileTable />

                  {/* Action Bar with Add Files + Scan + Clear */}
                  <div className={cn(
                    "bg-gray-100 px-3 py-2 border-t border-gray-200 flex items-center gap-2",
                    isRTL && "flex-row-reverse"
                  )}>
                    {/* Add Files Button */}
                    <div className="relative">
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*,application/pdf"
                        multiple
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        onChange={(e) => {
                          handleFiles(e.target.files);
                          e.target.value = '';
                        }}
                      />
                      <Button variant="outline" size="sm" className="h-8">
                        <Upload className="h-4 w-4 me-1" />
                        {t('files.selectFile')}
                      </Button>
                    </div>
                    <ScanButton compact />
                    <div className="flex-1" />
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => useImageStore.getState().clearAll()}
                      disabled={flatPages.length === 0}
                    >
                      <Trash2 className="h-4 w-4 me-1" />
                      {t('viewer.deleteAll')}
                    </Button>
                  </div>
                </div>

                {/* Viewer Panel - 7/12 width */}
                <div className="lg:w-7/12 bg-white rounded-lg border-2 border-amber-200 shadow-sm overflow-hidden flex flex-col">
                  <div className="bg-amber-50 px-4 py-2 border-b border-amber-100 flex items-center justify-between">
                    <h2 className="text-xs font-bold text-amber-700 uppercase tracking-wide">
                      {t('viewer.title')}
                    </h2>
                    {currentPage && (
                      <span className="text-xs text-gray-600">
                        {currentPage.page.width} × {currentPage.page.height}
                      </span>
                    )}
                  </div>

                  {/* Reusable ImageViewer Component */}
                  <div className="flex-1 min-h-0 flex flex-col">
                    <ImageViewer
                      images={flatPages.map(fp => ({ data: fp.page.data, width: fp.page.width, height: fp.page.height }))}
                      currentIndex={selectedPageIndex}
                      onFirst={goFirst}
                      onPrev={goPrev}
                      onNext={goNext}
                      onLast={goLast}
                      onDelete={currentPage ? handleDeleteCurrentGroup : undefined}
                      emptyText={t('viewer.noImages')}
                      emptySubtext={t('viewer.scanToStart')}
                    />
                  </div>
                </div>
              </div>

            {/* Save/Upload Action Bar */}
            <div className="bg-amber-50 rounded-lg border-2 border-amber-300 shadow-sm overflow-hidden" dir={isRTL ? 'rtl' : 'ltr'}>
              <div className="bg-amber-100 px-4 py-2 border-b border-amber-200">
                <h2 className={`text-xs font-bold text-amber-800 uppercase tracking-wide ${isRTL ? 'text-right' : ''}`}>
                  {t('priority.upload')}
                </h2>
              </div>
              <div className="p-3">
                <div className="flex items-center gap-3">
                  <Input
                    type="text"
                    placeholder={t('common.remark')}
                    value={remark}
                    onChange={(e) => setRemark(e.target.value)}
                    className="flex-1 border-amber-300 bg-white"
                    disabled={!selectedDocument}
                  />
                  <Button
                    onClick={handleUpload}
                    disabled={!selectedDocument || isUploading || fileGroups.length === 0}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[100px]"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className={`h-4 w-4 animate-spin ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        {t('priority.uploading')}
                      </>
                    ) : (
                      <>
                        <Upload className={`h-4 w-4 ${isRTL ? 'ml-2' : 'mr-2'}`} />
                        {t('priority.upload')}
                      </>
                    )}
                  </Button>
                </div>
                {!selectedDocument && (
                  <p className="text-xs text-amber-600 mt-2">
                    {t('priority.selectDocumentFirst')}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
        )}
      </main>

      {/* Document List Modal */}
      <DocumentList
        open={showDocumentList}
        onClose={() => setShowDocumentList(false)}
      />

      {/* Attachment List Modal */}
      <AttachmentList
        open={showAttachmentList}
        onClose={() => setShowAttachmentList(false)}
      />
    </div>
  );
}

// Wrapper component with Suspense boundary for useSearchParams
export default function HomePage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading...</div>}>
      <HomePageContent />
    </Suspense>
  );
}
