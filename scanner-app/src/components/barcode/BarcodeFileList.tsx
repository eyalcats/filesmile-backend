import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import {
  Clock,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Trash2,
  FileText,
  FileImage,
} from 'lucide-react';
import { useBarcodeStore, type BarcodeFile, type BarcodeStatus } from '@/stores/barcode-store';
import { cn } from '@/lib/utils';

function getStatusIcon(status: BarcodeStatus, _isProcessing: boolean) {
  switch (status) {
    case 'pending':
      return <Clock className="h-5 w-5 text-muted-foreground" />;
    case 'detecting':
      return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
    case 'detected':
      return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
    case 'matched':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'not_found':
      return <AlertCircle className="h-5 w-5 text-amber-500" />;
    case 'error':
      return <XCircle className="h-5 w-5 text-red-500" />;
    default:
      return <Clock className="h-5 w-5 text-muted-foreground" />;
  }
}

function getStatusColor(status: BarcodeStatus): string {
  switch (status) {
    case 'pending':
      return 'border-border';
    case 'detecting':
    case 'detected':
      return 'border-blue-200 bg-blue-50/50 dark:bg-blue-950/20';
    case 'matched':
      return 'border-green-200 bg-green-50/50 dark:bg-green-950/20';
    case 'not_found':
      return 'border-amber-200 bg-amber-50/50 dark:bg-amber-950/20';
    case 'error':
      return 'border-red-200 bg-red-50/50 dark:bg-red-950/20';
    default:
      return 'border-border';
  }
}

interface BarcodeFileItemProps {
  file: BarcodeFile;
  isRTL: boolean;
}

function BarcodeFileItem({ file, isRTL }: BarcodeFileItemProps) {
  const { t } = useTranslation();
  const { removeFile, isProcessing, currentProcessingId } = useBarcodeStore();
  const isCurrentlyProcessing = currentProcessingId === file.id;

  return (
    <div
      className={cn(
        'p-3 rounded-lg border transition-colors',
        getStatusColor(file.status)
      )}
    >
      <div className={cn('flex items-start gap-3', isRTL && 'flex-row-reverse')}>
        {/* Status Icon */}
        <div className="shrink-0 mt-0.5">
          {getStatusIcon(file.status, isCurrentlyProcessing)}
        </div>

        {/* File Info */}
        <div className={cn('flex-1 min-w-0', isRTL ? 'text-right' : 'text-left')}>
          {/* File name and type */}
          <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
            {file.fileType === 'pdf' ? (
              <FileText className="h-4 w-4 text-red-500" />
            ) : (
              <FileImage className="h-4 w-4 text-blue-500" />
            )}
            <span className="font-medium truncate">{file.fileName}</span>
          </div>

          {/* Status message */}
          <div className="text-sm text-muted-foreground mt-1">
            {file.status === 'pending' && t('barcode.status.pending')}
            {file.status === 'detecting' && t('barcode.status.detecting')}
            {file.status === 'detected' && t('barcode.status.matching')}
            {file.status === 'matched' && t('barcode.status.matched')}
            {file.status === 'not_found' && t('barcode.status.notFound')}
            {file.status === 'error' && (file.error || t('barcode.status.error'))}
          </div>

          {/* Barcode info */}
          {file.barcode && (
            <div className={cn('text-sm mt-2 space-y-0.5', isRTL && 'text-right')}>
              <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
                <span className="text-muted-foreground">{t('barcode.barcodeValue')}:</span>
                <span className="font-mono">{file.barcode}</span>
              </div>
            </div>
          )}

          {/* Matched document info */}
          {file.matchedDocument && (
            <div className={cn('text-sm mt-2 p-2 rounded bg-background/50 space-y-1', isRTL && 'text-right')}>
              <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
                <span className="text-muted-foreground">{t('barcode.documentForm')}:</span>
                <span>{file.matchedDocument.FormDesc || file.matchedDocument.Form}</span>
              </div>
              <div className={cn('flex items-center gap-2', isRTL && 'flex-row-reverse')}>
                <span className="text-muted-foreground">{t('barcode.documentNumber')}:</span>
                <span className="font-medium">{file.matchedDocument.DocNo}</span>
              </div>
              {file.matchedDocument.CustName && (
                <div className="text-muted-foreground truncate">
                  {file.matchedDocument.CustName}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Remove button */}
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => removeFile(file.id)}
          disabled={isProcessing}
          title={t('barcode.removeFile')}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function BarcodeFileList() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const isRTL = locale === 'he';
  const { files, clearAll, isProcessing } = useBarcodeStore();

  if (files.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {t('barcode.noFiles')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header with clear button */}
      <div className={cn('flex items-center justify-between', isRTL && 'flex-row-reverse')}>
        <span className="text-sm text-muted-foreground">
          {t('barcode.summary.total')}: {files.length}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={clearAll}
          disabled={isProcessing}
          className="text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-4 w-4 me-1" />
          {t('barcode.clearAll')}
        </Button>
      </div>

      {/* File list */}
      <ScrollArea className="max-h-[400px]">
        <div className="space-y-2">
          {files.map((file) => (
            <BarcodeFileItem key={file.id} file={file} isRTL={isRTL} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
