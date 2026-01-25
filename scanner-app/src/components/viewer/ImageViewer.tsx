'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Trash2,
  ZoomIn,
  ZoomOut,
  RotateCw,
  RotateCcw,
  Loader2,
  FileText,
  File,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3];

// Helper functions for MIME type detection
function getMimeType(dataUrl: string): string {
  // Format: data:application/pdf;base64,...
  const match = dataUrl.match(/^data:([^;]+);/);
  return match ? match[1] : '';
}

function isImageMimeType(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

function isPdfMimeType(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}

// Check if data is likely an image (for scanned content without proper MIME type)
function isLikelyImage(dataUrl: string, mimeType: string): boolean {
  // If it has a proper image MIME type, it's definitely an image
  if (isImageMimeType(mimeType)) return true;

  // If no data URL prefix or unknown MIME type, check if it could be raw image data
  // Scanned images often come without proper MIME type
  if (!mimeType || mimeType === 'application/octet-stream') {
    // If it doesn't start with data:, it might be raw base64 image data
    if (!dataUrl.startsWith('data:')) return true;

    // Check common image base64 signatures (first few bytes)
    const base64Part = dataUrl.split(',')[1] || dataUrl;
    if (base64Part) {
      // PNG signature: iVBORw0KGgo
      if (base64Part.startsWith('iVBORw0KGgo')) return true;
      // JPEG signature: /9j/
      if (base64Part.startsWith('/9j/')) return true;
      // GIF signature: R0lGOD
      if (base64Part.startsWith('R0lGOD')) return true;
      // BMP signature: Qk
      if (base64Part.startsWith('Qk')) return true;
      // TIFF signatures
      if (base64Part.startsWith('SUkq') || base64Part.startsWith('TU0A')) return true;
    }
  }

  return false;
}

export interface ViewerImage {
  data: string;
  width?: number;
  height?: number;
  isLoading?: boolean;  // True while loading content on-demand
  fileName?: string;    // For non-previewable file types
}

interface ImageViewerProps {
  // Image data
  images: ViewerImage[];
  currentIndex: number;

  // Navigation callbacks
  onFirst: () => void;
  onPrev: () => void;
  onNext: () => void;
  onLast: () => void;

  // Delete callback
  onDelete?: () => void;

  // Optional: rotation callback (if external rotation is needed)
  onRotate?: () => void;

  // Optional: info bar content
  infoBar?: React.ReactNode;

  // Optional: overlay badges
  topLeftOverlay?: React.ReactNode;
  topRightOverlay?: React.ReactNode;

  // Empty state
  emptyIcon?: string;
  emptyText?: string;
  emptySubtext?: string;

  // Disable controls
  disabled?: boolean;
}

export function ImageViewer({
  images,
  currentIndex,
  onFirst,
  onPrev,
  onNext,
  onLast,
  onDelete,
  onRotate,
  infoBar,
  topLeftOverlay,
  topRightOverlay,
  emptyIcon = '📄',
  emptyText,
  emptySubtext,
  disabled = false,
}: ImageViewerProps) {
  const t = useTranslations('viewer');
  const locale = useLocale();
  const isRTL = locale === 'he';

  // null means "fit to page" mode, number is index into ZOOM_LEVELS
  const [zoomIndex, setZoomIndex] = useState<number | null>(null);
  const [rotation, setRotation] = useState(0);

  const currentImage = images[currentIndex];
  const isFitMode = zoomIndex === null;
  const zoom = isFitMode ? 1 : ZOOM_LEVELS[zoomIndex];

  const handleZoomIn = () => {
    if (isFitMode) {
      setZoomIndex(3); // Start from 100%
    } else {
      setZoomIndex((prev) => Math.min((prev ?? 3) + 1, ZOOM_LEVELS.length - 1));
    }
  };

  const handleZoomOut = () => {
    if (isFitMode) {
      setZoomIndex(2); // Start from 75%
    } else {
      setZoomIndex((prev) => Math.max((prev ?? 3) - 1, 0));
    }
  };

  const handleFitToPage = () => {
    setZoomIndex(null);
  };

  const handleRotateRight = () => {
    if (onRotate) {
      onRotate();
    } else {
      setRotation((prev) => (prev + 90) % 360);
    }
  };

  const handleRotateLeft = () => {
    setRotation((prev) => (prev - 90 + 360) % 360);
  };

  // Reset zoom and rotation when changing images
  useEffect(() => {
    setZoomIndex(null);
    setRotation(0);
  }, [currentIndex]);

  if (images.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 py-20">
        <div className="text-6xl mb-4">{emptyIcon}</div>
        <p className="text-sm">{emptyText || t('noImages')}</p>
        {emptySubtext && <p className="text-xs mt-1 text-gray-300">{emptySubtext}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Image Display Area */}
      <div className="flex-1 bg-gray-100 flex items-center justify-center relative overflow-auto min-h-0">
        {currentImage ? (
          currentImage.isLoading || !currentImage.data ? (
            // Show loading spinner while content is being fetched
            <div className="flex flex-col items-center justify-center text-gray-500">
              <Loader2 className="h-8 w-8 animate-spin text-amber-600 mb-2" />
              <p className="text-sm">{t('loading') || 'Loading...'}</p>
            </div>
          ) : (() => {
            const mimeType = getMimeType(currentImage.data);

            if (isLikelyImage(currentImage.data, mimeType)) {
              // Image preview (includes scanned content without proper MIME type)
              return (
                <>
                  <div className="flex items-center justify-center w-full h-full overflow-auto p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={currentImage.data}
                      alt={`Image ${currentIndex + 1}`}
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

                  {/* Top Left Overlay */}
                  {topLeftOverlay || (
                    <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                      {currentIndex + 1} / {images.length}
                    </div>
                  )}

                  {/* Top Right Overlay */}
                  {topRightOverlay && (
                    <div className="absolute top-2 right-2">
                      {topRightOverlay}
                    </div>
                  )}
                </>
              );
            } else if (isPdfMimeType(mimeType)) {
              // PDF preview using iframe
              return (
                <>
                  <iframe
                    src={currentImage.data}
                    className="w-full h-full border-0"
                    title={`PDF Preview ${currentIndex + 1}`}
                  />

                  {/* Top Left Overlay */}
                  {topLeftOverlay || (
                    <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                      {currentIndex + 1} / {images.length}
                    </div>
                  )}

                  {/* Top Right Overlay */}
                  {topRightOverlay && (
                    <div className="absolute top-2 right-2">
                      {topRightOverlay}
                    </div>
                  )}
                </>
              );
            } else {
              // Other file types - show icon placeholder
              const fileExtension = mimeType.split('/')[1]?.toUpperCase() || 'FILE';
              return (
                <>
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    {mimeType.includes('outlook') || mimeType.includes('msg') ? (
                      <FileText className="h-20 w-20 mb-4 text-blue-500" />
                    ) : (
                      <File className="h-20 w-20 mb-4 text-gray-400" />
                    )}
                    <p className="text-sm font-medium">{currentImage.fileName || 'File'}</p>
                    <p className="text-xs mt-1 text-gray-400">{fileExtension}</p>
                    <p className="text-xs mt-2 text-gray-400">Preview not available</p>
                  </div>

                  {/* Top Left Overlay */}
                  {topLeftOverlay || (
                    <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                      {currentIndex + 1} / {images.length}
                    </div>
                  )}

                  {/* Top Right Overlay */}
                  {topRightOverlay && (
                    <div className="absolute top-2 right-2">
                      {topRightOverlay}
                    </div>
                  )}
                </>
              );
            }
          })()
        ) : (
          <div className="text-center text-gray-400 py-20">
            <div className="text-6xl mb-4">{emptyIcon}</div>
            <p className="text-sm">{emptyText || t('noImages')}</p>
          </div>
        )}
      </div>

      {/* Info Bar (optional) */}
      {infoBar}

      {/* Navigation Toolbar */}
      <div className={cn('bg-gray-800 text-white px-3 py-2 flex items-center justify-between gap-2 flex-shrink-0', isRTL && 'flex-row-reverse')}>
        {/* Delete button */}
        <div className="flex items-center gap-1">
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-red-600"
              onClick={onDelete}
              disabled={images.length === 0 || disabled}
              title={t('deletePage')}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Zoom and Rotate controls */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={handleZoomOut}
            disabled={images.length === 0 || (!isFitMode && zoomIndex === 0) || disabled}
            title={t('zoomOut')}
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
            disabled={images.length === 0 || disabled}
            title={t('fitToPage')}
          >
            {isFitMode ? 'Fit' : `${Math.round(zoom * 100)}%`}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={handleZoomIn}
            disabled={images.length === 0 || (!isFitMode && zoomIndex === ZOOM_LEVELS.length - 1) || disabled}
            title={t('zoomIn')}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="w-px h-5 bg-white/30 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={handleRotateLeft}
            disabled={images.length === 0 || disabled}
            title={t('rotateLeft')}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={handleRotateRight}
            disabled={images.length === 0 || disabled}
            title={t('rotateRight')}
          >
            <RotateCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation */}
        <div className={cn('flex items-center gap-1', isRTL && 'flex-row-reverse')}>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={onFirst}
            disabled={images.length === 0 || currentIndex === 0 || disabled}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={onPrev}
            disabled={images.length === 0 || currentIndex === 0 || disabled}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-xs px-2 min-w-[60px] text-center">
            {images.length > 0 ? `${currentIndex + 1} / ${images.length}` : '- / -'}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={onNext}
            disabled={images.length === 0 || currentIndex === images.length - 1 || disabled}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-white/20"
            onClick={onLast}
            disabled={images.length === 0 || currentIndex === images.length - 1 || disabled}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
