'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Trash2,
  Upload,
  RefreshCw,
} from 'lucide-react';
import { useExportStore, type ExportFile, type ExportFileStatus } from '@/stores/export-store';
import { cn } from '@/lib/utils';

function getStatusIcon(status: ExportFileStatus) {
  switch (status) {
    case 'pending':
      return <Clock className="h-4 w-4 text-gray-400" />;
    case 'uploading':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    case 'uploaded':
      return <CheckCircle2 className="h-4 w-4 text-green-500" />;
    case 'error':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return null;
  }
}

interface ExportFileTableProps {
  onExport: (file: ExportFile) => void;
  onDelete: (file: ExportFile) => void;
  disabled?: boolean;
}

export function ExportFileTable({ onExport, onDelete, disabled }: ExportFileTableProps) {
  const t = useTranslations('export');
  const locale = useLocale();
  const isRTL = locale === 'he';

  const { files, selectedIndex, selectFile, isUploading } = useExportStore();

  const pendingCount = files.filter((f) => f.status === 'pending').length;

  return (
    <div className="flex flex-col h-full">
      {/* Summary Bar */}
      <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center justify-center gap-6 flex-shrink-0">
        <span className="text-base font-semibold text-gray-700">
          {t('summary.total')}: <span className="text-lg">{files.length}</span>
        </span>
        {pendingCount > 0 && (
          <span className="flex items-center gap-1.5 text-base font-semibold text-amber-600">
            <Clock className="h-5 w-5" />
            {t('summary.pending')}: <span className="text-lg">{pendingCount}</span>
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
              <th className="px-2 py-2">{t('fileName')}</th>
              <th className="px-2 py-2">{t('source')}</th>
              <th className="px-2 py-2 w-24">{t('actions')}</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file, index) => (
              <tr
                key={file.id}
                className={cn(
                  'border-b cursor-pointer transition-colors',
                  file.status === 'uploaded' && index !== selectedIndex && 'bg-green-50/50',
                  file.status === 'error' && index !== selectedIndex && 'bg-red-50/50',
                  index !== selectedIndex && file.status === 'pending' && 'hover:bg-gray-50',
                  index === selectedIndex && 'bg-blue-100 hover:bg-blue-200 ring-2 ring-inset ring-blue-400'
                )}
                onClick={() => selectFile(index)}
              >
                <td className="px-2 py-2 text-muted-foreground">{index + 1}</td>
                <td className="px-2 py-2">{getStatusIcon(file.status)}</td>
                <td className="px-2 py-2 truncate max-w-[200px]" title={file.fileName}>
                  {file.fileName}
                  {file.error && (
                    <div className="text-xs text-red-600 truncate" title={file.error}>
                      {file.error}
                    </div>
                  )}
                </td>
                <td className="px-2 py-2 truncate max-w-[150px]" title={file.source}>
                  {file.source}
                </td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-6 w-6",
                        file.status === 'error'
                          ? "text-red-400 hover:text-red-600"
                          : "text-gray-400 hover:text-green-600"
                      )}
                      onClick={(e) => { e.stopPropagation(); onExport(file); }}
                      disabled={disabled || isUploading || file.status === 'uploading' || file.status === 'uploaded'}
                      title={file.status === 'error' ? t('retry') : t('export')}
                    >
                      {file.status === 'error' ? (
                        <RefreshCw className="h-3 w-3" />
                      ) : (
                        <Upload className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-gray-400 hover:text-red-600"
                      onClick={(e) => { e.stopPropagation(); onDelete(file); }}
                      disabled={disabled || isUploading}
                      title={t('delete')}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
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
