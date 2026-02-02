import { useCallback, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Upload,
  Loader2,
  FileUp,
  CheckCircle2,
  XCircle,
  Trash2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useBarcodeStore } from '@/stores/barcode-store';
import { api } from '@/lib/api/client';
import { barcodeDetector } from '@/lib/barcode';
import { extractBarcodeFromPdf, splitPdfIntoPages } from '@/lib/barcode/pdf-extractor';
import { cn } from '@/lib/utils';
import { ScanButton } from '@/components/scanner';
import type { ScannedImage } from '@/lib/scanner';

interface BarcodeProcessorProps {
  compact?: boolean;
}

export function BarcodeProcessor({ compact = false }: BarcodeProcessorProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const isRTL = locale === 'he';
  const isInitializedRef = useRef(false);

  const {
    files,
    isPrefixesLoaded,
    isPrefixesLoading,
    prefixError,
    isProcessing,
    isUploading,
    uploadProgress,
    setFormPrefixes,
    setIsPrefixesLoading,
    setPrefixError,
    addFiles,
    setFileStatus,
    setFileBarcode,
    setFileMatchedDocument,
    setFileError,
    setIsProcessing,
    setCurrentProcessingId,
    setIsUploading,
    setUploadProgress,
    getFormByPrefix,
    getMatchedCount,
    getErrorCount,
  } = useBarcodeStore();

  const pendingCountRef = useRef(0);
  const processAllFilesRef = useRef<(() => Promise<void>) | null>(null);

  // Load form prefixes when component mounts
  useEffect(() => {
    if (!isPrefixesLoaded && !isPrefixesLoading && !isInitializedRef.current) {
      isInitializedRef.current = true;
      loadFormPrefixes();
    }
  }, [isPrefixesLoaded, isPrefixesLoading]);

  // Auto-process new files when they are added
  useEffect(() => {
    const currentPendingCount = files.filter((f) => f.status === 'pending').length;

    // If we have new pending files and prefixes are loaded and not currently processing
    if (currentPendingCount > pendingCountRef.current && isPrefixesLoaded && !isProcessing) {
      // Use setTimeout to let the UI update first
      setTimeout(() => {
        if (processAllFilesRef.current) {
          processAllFilesRef.current();
        }
      }, 100);
    }

    pendingCountRef.current = currentPendingCount;
  }, [files, isPrefixesLoaded, isProcessing]);

  const loadFormPrefixes = async () => {
    setIsPrefixesLoading(true);
    setPrefixError(null);
    try {
      const prefixes = await api.getAllFormPrefixes();
      setFormPrefixes(prefixes);
    } catch (error) {
      console.error('Failed to load form prefixes:', error);
      const message = error instanceof Error ? error.message : t('barcode.errors.connectionFailed');
      setPrefixError(message);
    }
  };

  const retryLoadPrefixes = () => {
    isInitializedRef.current = false;
    loadFormPrefixes();
  };

  // Handle file drop - split multi-page PDFs into individual pages
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const filesToAdd: { fileName: string; fileData: string; fileType: 'pdf' | 'image' }[] = [];

    for (const file of acceptedFiles) {
      const base64 = await fileToBase64(file);

      if (file.type === 'application/pdf') {
        // Split PDF into individual pages
        const pages = await splitPdfIntoPages(base64);

        if (pages.length === 1) {
          // Single page PDF - keep as PDF
          filesToAdd.push({
            fileName: file.name,
            fileData: base64,
            fileType: 'pdf',
          });
        } else {
          // Multi-page PDF - add each page as separate image
          const baseName = file.name.replace(/\.pdf$/i, '');
          for (const page of pages) {
            filesToAdd.push({
              fileName: `${baseName}_page${page.pageNumber}.png`,
              fileData: page.imageData,
              fileType: 'image',
            });
          }
        }
      } else {
        // Regular image file
        filesToAdd.push({
          fileName: file.name,
          fileData: base64,
          fileType: 'image',
        });
      }
    }

    addFiles(filesToAdd);
  }, [addFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.tif'],
      'application/pdf': ['.pdf'],
    },
    disabled: isProcessing || isUploading,
  });

  // Process all pending files
  const processAllFiles = async () => {
    const pendingFiles = files.filter((f) => f.status === 'pending');
    if (pendingFiles.length === 0) return;

    setIsProcessing(true);

    for (const file of pendingFiles) {
      setCurrentProcessingId(file.id);
      setFileStatus(file.id, 'detecting');

      try {
        // Detect barcode
        let barcode: string;
        if (file.fileType === 'pdf') {
          const pdfResult = await extractBarcodeFromPdf(file.fileData);
          if (!pdfResult.barcode) {
            throw new Error(t('barcode.errors.noBarcode'));
          }
          barcode = pdfResult.barcode.value;
        } else {
          const imageResult = await barcodeDetector.detectFromImage(file.fileData);
          if (!imageResult) {
            throw new Error(t('barcode.errors.noBarcode'));
          }
          barcode = imageResult.value;
        }

        // Parse barcode to extract prefix and document number
        const parsed = barcodeDetector.parseBarcode(barcode);
        if (!parsed) {
          setFileError(file.id, t('barcode.errors.noBarcode'));
          continue;
        }

        setFileBarcode(file.id, barcode, parsed.prefix, parsed.docNumber);

        // Look up form by prefix
        const formInfo = getFormByPrefix(parsed.prefix);
        if (!formInfo) {
          setFileStatus(file.id, 'not_found');
          setFileError(file.id, `${t('barcode.errors.invalidPrefix')}: ${parsed.prefix}`);
          continue;
        }

        // Find document in Priority using full barcode value (e.g., "SH24000047")
        try {
          const document = await api.findDocumentByNumber(formInfo.ENAME, barcode);
          setFileMatchedDocument(file.id, {
            Form: document.Form,
            FormDesc: document.FormDesc,
            FormKey: document.FormKey,
            DocNo: document.DocNo,
            DocDate: document.DocDate,
            CustName: document.CustName,
            Details: document.Details,
            ExtFilesForm: document.ExtFilesForm,
          });
        } catch {
          setFileStatus(file.id, 'not_found');
          setFileError(file.id, t('barcode.errors.documentNotFound'));
        }

        // Rate limiting - small delay between API calls to avoid overloading the server
        await new Promise((resolve) => setTimeout(resolve, 200));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : t('barcode.status.error');
        setFileError(file.id, errorMessage);
      }
    }

    setCurrentProcessingId(null);
    setIsProcessing(false);
  };

  // Keep ref updated for auto-processing
  processAllFilesRef.current = processAllFiles;

  // Upload all matched files
  const uploadAllMatched = async () => {
    const matchedFiles = files.filter((f) => f.status === 'matched' && f.matchedDocument);
    if (matchedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    let uploaded = 0;
    for (const file of matchedFiles) {
      try {
        const doc = file.matchedDocument!;

        // Extract base64 data without data URL prefix
        let base64Data = file.fileData;
        if (base64Data.includes(',')) {
          base64Data = base64Data.split(',')[1];
        }

        // Get file extension
        const ext = file.fileName.split('.').pop()?.toLowerCase() ||
          (file.fileType === 'pdf' ? 'pdf' : 'png');

        await api.uploadAttachment(
          doc.Form,
          doc.FormKey,
          file.fileName,
          base64Data,
          ext,
          doc.ExtFilesForm
        );

        // Mark as uploaded (using error status for now, ideally we'd add an 'uploaded' status)
        useBarcodeStore.getState().removeFile(file.id);
        uploaded++;
      } catch (error) {
        console.error(`Failed to upload ${file.fileName}:`, error);
        setFileError(file.id, t('barcode.errors.uploadFailed'));
      }

      setUploadProgress(Math.round((uploaded / matchedFiles.length) * 100));
    }

    setIsUploading(false);
    setUploadProgress(0);
  };

  // Handle scanned images - convert to base64 and add to barcode store
  const handleScanComplete = useCallback(async (images: ScannedImage[]) => {
    const timestamp = Date.now();
    const filesToAdd: { fileName: string; fileData: string; fileType: 'image' }[] = [];

    for (let i = 0; i < images.length; i++) {
      const img = images[i];
      let imageData = img.data;

      // If it's a blob URL, convert to data URL
      if (imageData.startsWith('blob:')) {
        try {
          const response = await fetch(imageData);
          const blob = await response.blob();
          const reader = new FileReader();
          imageData = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
        } catch (error) {
          console.error('Failed to convert blob URL:', error);
          continue;
        }
      }

      filesToAdd.push({
        fileName: `Scan_${timestamp}_${i + 1}.png`,
        fileData: imageData,
        fileType: 'image',
      });
    }

    if (filesToAdd.length > 0) {
      addFiles(filesToAdd);
    }
  }, [addFiles]);

  const matchedCount = getMatchedCount();
  const errorCount = getErrorCount();
  const pendingCount = files.filter((f) => f.status === 'pending').length;

  // Compact mode - all buttons in one line
  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')} dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Add Files Button */}
        <div {...getRootProps()}>
          <input {...getInputProps()} />
          <Button
            variant="outline"
            size="sm"
            disabled={isProcessing || isUploading}
            className={cn(isDragActive && 'border-primary bg-primary/5')}
          >
            <Upload className="h-4 w-4 me-2" />
            {t('barcode.uploadFiles')}
          </Button>
        </div>

        {/* Scan Button */}
        <ScanButton compact onScanComplete={handleScanComplete} />

        {/* Upload Matched Button */}
        <Button
          size="sm"
          onClick={uploadAllMatched}
          disabled={isProcessing || isUploading || matchedCount === 0}
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 me-2 animate-spin" />
              {uploadProgress}%
            </>
          ) : (
            <>
              <FileUp className="h-4 w-4 me-2" />
              {t('barcode.uploadAll')}
            </>
          )}
        </Button>

        {/* Clear All Button */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => useBarcodeStore.getState().clearAll()}
          disabled={isProcessing || isUploading || files.length === 0}
        >
          <Trash2 className="h-4 w-4 me-2" />
          {t('barcode.clearAll')}
        </Button>

        {/* Processing indicator */}
        {isProcessing && (
          <span className="flex items-center gap-1 text-sm text-blue-600 ms-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('barcode.processing')}
          </span>
        )}

        {/* Connection error indicator */}
        {prefixError && (
          <span className="flex items-center gap-1 text-sm text-red-600 ms-2">
            <AlertCircle className="h-4 w-4" />
            {t('barcode.errors.connectionFailed')}
            <Button
              variant="ghost"
              size="sm"
              onClick={retryLoadPrefixes}
              className="h-6 px-2"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Loading prefixes indicator */}
      {isPrefixesLoading && (
        <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{t('barcode.processing')}</span>
        </div>
      )}

      {/* Connection error */}
      {prefixError && (
        <div className="flex items-center justify-center gap-3 py-4 px-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{t('barcode.errors.connectionFailed')}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={retryLoadPrefixes}
            className="border-red-300 hover:bg-red-100"
          >
            <RefreshCw className="h-4 w-4 me-2" />
            {t('barcode.retry')}
          </Button>
        </div>
      )}

      {/* File drop zone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors',
          isDragActive && 'border-primary bg-primary/5',
          !isDragActive && 'border-muted-foreground/25 hover:border-muted-foreground/50',
          (isProcessing || isUploading) && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
        <p className="text-muted-foreground">{t('barcode.dragDrop')}</p>
        <p className="text-sm text-muted-foreground/75">{t('barcode.orClickToBrowse')}</p>
      </div>

      {/* Summary stats */}
      {files.length > 0 && (
        <div className={cn('flex items-center gap-4 text-sm', isRTL && 'flex-row-reverse')}>
          <span className="text-muted-foreground">
            {t('barcode.summary.total')}: {files.length}
          </span>
          {matchedCount > 0 && (
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              {t('barcode.summary.matched')}: {matchedCount}
            </span>
          )}
          {errorCount > 0 && (
            <span className="flex items-center gap-1 text-red-600">
              <XCircle className="h-4 w-4" />
              {t('barcode.summary.errors')}: {errorCount}
            </span>
          )}
          {pendingCount > 0 && (
            <span className="text-muted-foreground">
              {t('barcode.summary.pending')}: {pendingCount}
            </span>
          )}
        </div>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <div className="flex items-center gap-2 text-blue-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>{t('barcode.processing')}</span>
        </div>
      )}

      {/* Action buttons */}
      {files.length > 0 && (
        <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
          {/* Upload button */}
          <Button
            onClick={uploadAllMatched}
            disabled={isProcessing || isUploading || matchedCount === 0}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 me-2 animate-spin" />
                {uploadProgress}%
              </>
            ) : (
              <>
                <FileUp className="h-4 w-4 me-2" />
                {t('barcode.uploadAllCount', { count: matchedCount })}
              </>
            )}
          </Button>

          {/* Clear All button */}
          <Button
            variant="outline"
            onClick={() => useBarcodeStore.getState().clearAll()}
            disabled={isProcessing || isUploading}
          >
            <Trash2 className="h-4 w-4 me-2" />
            {t('barcode.clearAll')}
          </Button>
        </div>
      )}

      {/* Upload progress */}
      {isUploading && (
        <Progress value={uploadProgress} className="w-full" />
      )}
    </div>
  );
}

// Helper to convert File to base64 data URL
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
