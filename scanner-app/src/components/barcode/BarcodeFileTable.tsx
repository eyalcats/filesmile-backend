'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useBarcodeStore, type BarcodeFile, type BarcodeStatus } from '@/stores/barcode-store';
import { cn } from '@/lib/utils';

function getStatusIcon(status: BarcodeStatus) {
  switch (status) {
    case 'pending':
      return <Clock className="h-4 w-4 text-gray-400" />;
    case 'detecting':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case 'detected':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case 'matched':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'not_found':
      return <AlertCircle className="h-4 w-4 text-amber-500" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return null;
  }
}

interface BarcodeFileTableProps {
  showActionBar?: boolean;
}

export function BarcodeFileTable({ showActionBar = false }: BarcodeFileTableProps) {
  const t = useTranslations('barcode');
  const locale = useLocale();
  const isRTL = locale === 'he';

  const {
    files,
    selectedIndex,
    isProcessing,
    isUploading,
    selectFile,
    removeFile,
    getMatchedCount,
    getErrorCount,
  } = useBarcodeStore();

  const matchedCount = getMatchedCount();
  const errorCount = getErrorCount();

  return (
    <div className="flex flex-col h-full">
      {/* Summary Bar - Prominent and Centered */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center justify-center gap-6 flex-shrink-0">
        <span className="text-base font-semibold text-gray-700">
          {t('summary.total')}: <span className="text-lg">{files.length}</span>
        </span>
        <span className={cn(
          'flex items-center gap-1.5 text-base font-semibold',
          matchedCount > 0 ? 'text-green-600' : 'text-gray-400'
        )}>
          <CheckCircle2 className="h-5 w-5" />
          {t('summary.matched')}: <span className="text-lg">{matchedCount}</span>
        </span>
        {errorCount > 0 && (
          <span className="flex items-center gap-1.5 text-base font-semibold text-red-600">
            <XCircle className="h-5 w-5" />
            {t('summary.errors')}: <span className="text-lg">{errorCount}</span>
          </span>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 sticky top-0">
            <tr className={isRTL ? 'text-right' : 'text-left'}>
              <th className="px-2 py-2 w-8">#</th>
              <th className="px-2 py-2 w-8"></th>
              <th className="px-2 py-2">{t('documentForm')}</th>
              <th className="px-2 py-2">{t('documentNumber')}</th>
              <th className="px-2 py-2 w-24"></th>
            </tr>
          </thead>
          <tbody>
            {files.map((file, index) => (
              <tr
                key={file.id}
                className={cn(
                  'border-b cursor-pointer transition-colors',
                  // Status colors (lower priority)
                  file.status === 'matched' && index !== selectedIndex && 'bg-green-50/50 hover:bg-green-100/50',
                  (file.status === 'error' || file.status === 'not_found') && index !== selectedIndex && 'bg-red-50/50 hover:bg-red-100/50',
                  // Default hover
                  index !== selectedIndex && file.status !== 'matched' && file.status !== 'error' && file.status !== 'not_found' && 'hover:bg-gray-50',
                  // Selection color (highest priority)
                  index === selectedIndex && 'bg-blue-100 hover:bg-blue-200 ring-2 ring-inset ring-blue-400'
                )}
                onClick={() => selectFile(index)}
              >
                <td className="px-2 py-2 text-muted-foreground">{index + 1}</td>
                <td className="px-2 py-2">{getStatusIcon(file.status)}</td>
                <td className="px-2 py-2">
                  {file.matchedDocument?.FormDesc || file.matchedDocument?.Form || '-'}
                </td>
                <td className="px-2 py-2">
                  <div className="font-mono">
                    {file.barcode || '-'}
                  </div>
                  {file.error && (
                    <div className="text-xs text-red-600 truncate max-w-[200px]" title={file.error}>
                      {file.error}
                    </div>
                  )}
                </td>
                <td className="px-2 py-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-gray-400 hover:text-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(file.id);
                    }}
                    disabled={isProcessing || isUploading}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
            {files.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  {t('noFiles')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
