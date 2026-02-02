import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Loader2,
  FileText,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
} from 'lucide-react';
import { useBarcodeStore, type BarcodeStatus } from '@/stores/barcode-store';
import { cn } from '@/lib/utils';

function getStatusBadge(status: BarcodeStatus, t: (key: string) => string) {
  const baseClasses = 'px-2 py-1 rounded text-xs font-medium flex items-center gap-1';

  switch (status) {
    case 'pending':
      return (
        <span className={cn(baseClasses, 'bg-gray-100 text-gray-600')}>
          <Clock className="h-3 w-3" />
          {t('barcode.status.pending')}
        </span>
      );
    case 'detecting':
      return (
        <span className={cn(baseClasses, 'bg-blue-100 text-blue-600')}>
          <Loader2 className="h-3 w-3 animate-spin" />
          {t('barcode.status.detecting')}
        </span>
      );
    case 'detected':
      return (
        <span className={cn(baseClasses, 'bg-blue-100 text-blue-600')}>
          <Loader2 className="h-3 w-3 animate-spin" />
          {t('barcode.status.matching')}
        </span>
      );
    case 'matched':
      return (
        <span className={cn(baseClasses, 'bg-green-100 text-green-600')}>
          <CheckCircle2 className="h-3 w-3" />
          {t('barcode.status.matched')}
        </span>
      );
    case 'not_found':
      return (
        <span className={cn(baseClasses, 'bg-amber-100 text-amber-600')}>
          <AlertCircle className="h-3 w-3" />
          {t('barcode.status.notFound')}
        </span>
      );
    case 'error':
      return (
        <span className={cn(baseClasses, 'bg-red-100 text-red-600')}>
          <XCircle className="h-3 w-3" />
          {t('barcode.status.error')}
        </span>
      );
    default:
      return null;
  }
}

const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3];

export function BarcodeViewer() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const isRTL = locale === 'he';

  // null means "fit to page" mode, number is index into ZOOM_LEVELS
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);

  const {
    files,
    selectedIndex,
    isProcessing,
    goFirst,
    goPrev,
    goNext,
    goLast,
    removeFile,
    getSelectedFile,
  } = useBarcodeStore();

  const selectedFile = getSelectedFile();
  const isFitMode = zoomIndex === null;
  const zoom = isFitMode ? 1 : ZOOM_LEVELS[zoomIndex];

  const handleZoomIn = () => {
    if (isFitMode) {
      // Start from 100% when leaving fit mode
      setZoomIndex(3);
    } else {
      setZoomIndex((prev) => Math.min((prev ?? 3) + 1, ZOOM_LEVELS.length - 1));
    }
  };

  const handleZoomOut = () => {
    if (isFitMode) {
      // Start from 75% when zooming out from fit mode
      setZoomIndex(2);
    } else {
      setZoomIndex((prev) => Math.max((prev ?? 3) - 1, 0));
    }
  };

  const handleFitToPage = () => {
    setZoomIndex(null);
  };

  const handleRotateRight = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleRotateLeft = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  };

  const resetView = () => {
    setZoomIndex(null); // Start in fit mode
    setRotation(0);
  };

  // Reset zoom and rotation when changing files
  useEffect(() => {
    resetView();
  }, [selectedIndex]);

  if (files.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 py-20">
        <div className="text-6xl mb-4">📄</div>
        <p className="text-sm">{t('barcode.noFiles')}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* File Display Area */}
      <div className="flex-1 bg-gray-100 flex items-center justify-center relative overflow-auto min-h-0">
        {selectedFile ? (
          <>
            {selectedFile.fileType === 'pdf' ? (
              <iframe
                src={selectedFile.fileData}
                className="w-full h-full border-0"
                title={selectedFile.fileName}
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full overflow-auto p-2">
                <img
                  src={selectedFile.fileData}
                  alt={selectedFile.fileName}
                  className={isFitMode ? 'max-h-full max-w-full object-contain' : 'max-w-none'}
                  style={isFitMode ? {
                    transform: `rotate(${rotation}deg)`,
                    transition: 'transform 0.2s ease-out',
                  } : {
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transformOrigin: 'center center',
                    transition: 'transform 0.2s ease-out',
                  }}
                />
              </div>
            )}

            {/* File Info Overlay - Top Left */}
            <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded flex items-center gap-2">
              <span>{selectedIndex + 1} / {files.length}</span>
              {selectedFile.fileType === 'pdf' && (
                <FileText className="h-3 w-3 text-red-400" />
              )}
            </div>

            {/* Status Badge - Top Right */}
            <div className="absolute top-2 right-2">
              {getStatusBadge(selectedFile.status, t)}
            </div>
          </>
        ) : (
          <div className="text-center text-gray-400 py-20">
            <div className="text-6xl mb-4">📄</div>
            <p className="text-sm">{t('barcode.noFiles')}</p>
          </div>
        )}
      </div>

      {/* File Info Bar */}
      {selectedFile && (
        <div className={cn(
          'bg-gray-50 border-t px-3 py-2 flex-shrink-0',
          selectedFile.status === 'error' || selectedFile.status === 'not_found'
            ? 'bg-red-50 border-red-200'
            : selectedFile.status === 'matched'
              ? 'bg-green-50 border-green-200'
              : ''
        )}>
          <div className={cn('flex items-center justify-between text-sm', isRTL && 'flex-row-reverse')}>
            <div className={cn('flex-1 min-w-0', isRTL && 'text-right')}>
              <div className="font-medium truncate">{selectedFile.fileName}</div>
              {selectedFile.barcode && (
                <div className="text-muted-foreground">
                  <span className="font-mono">{selectedFile.barcode}</span>
                  {selectedFile.matchedDocument && (
                    <span className="mx-2">→</span>
                  )}
                  {selectedFile.matchedDocument && (
                    <span>
                      {selectedFile.matchedDocument.FormDesc || selectedFile.matchedDocument.Form}: {selectedFile.matchedDocument.DocNo}
                    </span>
                  )}
                </div>
              )}
              {selectedFile.error && (
                <div className="text-red-600 text-xs mt-1">
                  {selectedFile.error}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Toolbar */}
      <div className={cn('bg-gray-800 text-white px-3 py-2 flex items-center justify-between gap-2 flex-shrink-0', isRTL && 'flex-row-reverse')}>
        {/* Delete button */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-red-600"
            onClick={() => selectedFile && removeFile(selectedFile.id)}
            disabled={files.length === 0 || isProcessing}
            title={t('viewer.deletePage')}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>

        {/* Zoom and Rotate controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={handleZoomOut}
            disabled={files.length === 0 || (!isFitMode && zoomIndex === 0) || selectedFile?.fileType === 'pdf'}
            title={t('viewer.zoomOut')}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-2 text-white text-xs min-w-[50px]",
              isFitMode ? "bg-white/20" : "hover:bg-white/20"
            )}
            onClick={handleFitToPage}
            disabled={files.length === 0 || selectedFile?.fileType === 'pdf'}
            title={t('viewer.fitToPage')}
          >
            {isFitMode ? 'Fit' : `${Math.round(zoom * 100)}%`}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={handleZoomIn}
            disabled={files.length === 0 || (!isFitMode && zoomIndex === ZOOM_LEVELS.length - 1) || selectedFile?.fileType === 'pdf'}
            title={t('viewer.zoomIn')}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="w-px h-5 bg-white/30 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={handleRotateLeft}
            disabled={files.length === 0 || selectedFile?.fileType === 'pdf'}
            title={t('viewer.rotateLeft')}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={handleRotateRight}
            disabled={files.length === 0 || selectedFile?.fileType === 'pdf'}
            title={t('viewer.rotateRight')}
          >
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation - arrows visually reversed for RTL */}
        <div className={cn('flex items-center gap-1', isRTL && 'flex-row-reverse')}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={goFirst}
            disabled={files.length === 0 || selectedIndex === 0}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={goPrev}
            disabled={files.length === 0 || selectedIndex === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs px-2 min-w-[60px] text-center">
            {files.length > 0 ? `${selectedIndex + 1} / ${files.length}` : '- / -'}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={goNext}
            disabled={files.length === 0 || selectedIndex === files.length - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={goLast}
            disabled={files.length === 0 || selectedIndex === files.length - 1}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
