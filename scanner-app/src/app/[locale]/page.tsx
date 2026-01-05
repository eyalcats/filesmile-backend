'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Header } from '@/components/layout/Header';
import { ModeToggle } from '@/components/layout/ModeToggle';
import { useSettingsStore } from '@/stores/settings-store';
import { useDocumentStore } from '@/stores/document-store';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Paperclip,
  Loader2,
  Upload,
  FolderOpen,
  X,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import {
  CompanySelector,
  SearchGroupSelector,
  DocumentSearch,
  DocumentList,
  SelectedDocument,
  AttachmentList,
} from '@/components/priority';
import {
  DeviceSelector,
  ScanButton,
} from '@/components/scanner';
import { useImageStore } from '@/stores/image-store';

export default function HomePage() {
  const t = useTranslations();
  const { mode } = useSettingsStore();
  const { isAuthenticated } = useAuthStore();
  const { selectedDocument, attachments, isLoadingAttachments } = useDocumentStore();
  const {
    images,
    selectedIndex,
    removeImage,
    clearAll,
    zoomLevel,
    zoomIn,
    zoomOut,
    goFirst,
    goPrev,
    goNext,
    goLast,
  } = useImageStore();

  // Modal states
  const [showDocumentList, setShowDocumentList] = useState(false);
  const [showAttachmentList, setShowAttachmentList] = useState(false);

  // Remark input
  const [remark, setRemark] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = async () => {
    if (!selectedDocument) return;

    setIsUploading(true);
    try {
      // TODO: Implement upload logic with scanned/selected files
      console.log('Uploading to:', selectedDocument.Form, selectedDocument.FormKey);
      console.log('Remark:', remark);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteCurrent = () => {
    if (images.length > 0) removeImage(selectedIndex);
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <Header />

      <main className="flex-1 container mx-auto p-4 max-w-7xl">
        {/* Mode Toggle - Centered */}
        <div className="flex justify-center mb-6">
          <ModeToggle />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Panel - Search & Document Info */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-4">
            {/* Search Group Box */}
            <div className="bg-white rounded-lg border-2 border-primary/30 shadow-sm overflow-hidden">
              <div className="bg-primary/10 px-4 py-2 border-b border-primary/20">
                <h2 className="text-xs font-bold text-primary uppercase tracking-wide">
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
              <div className="bg-amber-50 rounded-lg border-2 border-primary/50 shadow-sm overflow-hidden relative">
                <div className="bg-primary/20 px-4 py-2 border-b border-primary/30">
                  <h2 className="text-xs font-bold text-primary uppercase tracking-wide">
                    {t('priority.selectedDocument')}
                  </h2>
                </div>
                <button
                  onClick={() => useDocumentStore.getState().setSelectedDocument(null)}
                  className="absolute top-2 right-2 text-gray-500 hover:text-red-500 transition-colors"
                  title={t('common.clear')}
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="p-4">
                  <SelectedDocument />
                </div>
              </div>
            )}

            {/* Attachments Group Box */}
            {selectedDocument && (
              <div className="bg-white rounded-lg border-2 border-primary/30 shadow-sm overflow-hidden">
                <div className="bg-primary/10 px-4 py-2 border-b border-primary/20 flex items-center gap-2">
                  <Paperclip className="h-3 w-3 text-primary" />
                  <h2 className="text-xs font-bold text-primary uppercase tracking-wide">
                    {t('priority.attachments')}
                  </h2>
                  {attachments.length > 0 && (
                    <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                      {attachments.length}
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-primary/50 hover:bg-primary/10"
                    onClick={() => setShowAttachmentList(true)}
                    disabled={isLoadingAttachments}
                  >
                    {isLoadingAttachments ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <FolderOpen className="h-4 w-4 mr-2" />
                    )}
                    {t('priority.viewAttachments')}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Right Panel - Scanner/File Viewer */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-4">
              {mode === 'scan' ? (
                <>
                  {/* Image Viewer - Now takes full space */}
                  <div className="bg-white rounded-lg border-2 border-primary/30 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
                    <div className="bg-primary/10 px-4 py-2 border-b border-primary/20 flex items-center justify-between">
                      <h2 className="text-xs font-bold text-primary uppercase tracking-wide">
                        {t('viewer.title')}
                      </h2>
                      {images.length > 0 && (
                        <span className="text-xs text-gray-600">
                          {images.length} {images.length === 1 ? 'page' : 'pages'}
                        </span>
                      )}
                    </div>

                    {/* Image Display Area - Flex grow to fill space */}
                    <div className="bg-gray-100 flex-1 flex items-center justify-center relative overflow-hidden">
                      {images.length > 0 ? (
                        <div
                          className="h-full w-full overflow-auto flex items-center justify-center p-4"
                          style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center' }}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={images[selectedIndex]?.data}
                            alt={`Scanned page ${selectedIndex + 1}`}
                            className="max-h-full w-auto object-contain shadow-lg border bg-white"
                          />
                        </div>
                      ) : (
                        <div className="text-center text-gray-400 py-20">
                          <div className="text-6xl mb-4">📄</div>
                          <p className="text-sm">{t('viewer.noImages')}</p>
                          <p className="text-xs mt-2 text-gray-300">{t('viewer.scanToStart')}</p>
                        </div>
                      )}

                      {/* Page Indicator Overlay */}
                      {images.length > 0 && (
                        <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                          {selectedIndex + 1} / {images.length}
                        </div>
                      )}

                      {/* Dimensions Overlay */}
                      {images.length > 0 && images[selectedIndex] && (
                        <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                          {images[selectedIndex].width} × {images[selectedIndex].height}
                        </div>
                      )}
                    </div>

                    {/* Enhanced Viewer Toolbar with Scan Controls */}
                    <div className="bg-gray-800 text-white px-3 py-2 flex items-center justify-between gap-2">
                      {/* Left: Scanner Controls */}
                      <div className="flex items-center gap-2">
                        <DeviceSelector compact />
                        <ScanButton compact />
                      </div>

                      {/* Center: Navigation */}
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={goFirst} disabled={images.length === 0 || selectedIndex === 0}>
                          <ChevronsLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={goPrev} disabled={images.length === 0 || selectedIndex === 0}>
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-xs px-2 min-w-[60px] text-center">
                          {images.length > 0 ? `${selectedIndex + 1} / ${images.length}` : '- / -'}
                        </span>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={goNext} disabled={images.length === 0 || selectedIndex === images.length - 1}>
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={goLast} disabled={images.length === 0 || selectedIndex === images.length - 1}>
                          <ChevronsRight className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Right: Zoom & Actions */}
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={zoomOut} disabled={images.length === 0}>
                          <ZoomOut className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" onClick={zoomIn} disabled={images.length === 0}>
                          <ZoomIn className="h-4 w-4" />
                        </Button>
                        <div className="w-px h-6 bg-white/30 mx-1" />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-white/20" disabled={images.length === 0}>
                          <RotateCw className="h-4 w-4" />
                        </Button>
                        <div className="w-px h-6 bg-white/30 mx-1" />
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-red-600" onClick={handleDeleteCurrent} disabled={images.length === 0} title="Delete page">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white hover:bg-red-600" onClick={clearAll} disabled={images.length === 0} title="Clear all">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* File Picker */}
                  <div className="bg-white rounded-lg border-2 border-primary/30 shadow-sm overflow-hidden">
                    <div className="bg-primary/10 px-4 py-2 border-b border-primary/20">
                      <h2 className="text-xs font-bold text-primary uppercase tracking-wide">
                        {t('files.title')}
                      </h2>
                    </div>
                    <div className="p-4">
                      <div className="border-2 border-dashed border-primary/30 rounded-lg p-12 text-center hover:border-primary/50 hover:bg-primary/5 transition-colors cursor-pointer">
                        <Upload className="h-12 w-12 mx-auto text-primary/50 mb-4" />
                        <p className="text-gray-600 font-medium">
                          {t('files.dragDrop')}
                        </p>
                        <p className="text-sm text-gray-400 mt-1">
                          or click to browse
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Selected Files */}
                  <div className="bg-white rounded-lg border-2 border-primary/30 shadow-sm overflow-hidden">
                    <div className="bg-primary/10 px-4 py-2 border-b border-primary/20">
                      <h2 className="text-xs font-bold text-primary uppercase tracking-wide">
                        {t('files.selectedFiles')}
                      </h2>
                    </div>
                    <div className="p-4">
                      <p className="text-muted-foreground text-sm text-center py-8">
                        {t('files.noFiles')}
                      </p>
                    </div>
                  </div>
                </>
              )}
          </div>
        </div>

        {/* Bottom Action Bar */}
        <div className="bg-white rounded-lg border-2 border-primary/30 shadow-sm overflow-hidden mt-4">
          <div className="bg-primary/10 px-4 py-2 border-b border-primary/20">
            <h2 className="text-xs font-bold text-primary uppercase tracking-wide">
              {mode === 'scan' ? t('scanner.save') : t('priority.upload')}
            </h2>
          </div>
          <div className="p-4">
            <div className="flex items-center gap-3">
              <Input
                type="text"
                placeholder={t('common.remark')}
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                className="flex-1 border-primary/30"
                disabled={!selectedDocument}
              />
              <Button
                onClick={handleUpload}
                disabled={!selectedDocument || isUploading || images.length === 0}
                className="bg-primary hover:bg-primary/90 text-primary-foreground min-w-[120px]"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('priority.uploading')}
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {mode === 'scan' ? t('scanner.save') : t('priority.upload')}
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
