'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Trash2, FileText, Image as ImageIcon } from 'lucide-react';
import { useImageStore } from '@/stores/image-store';
import { cn } from '@/lib/utils';

export function ImageFileTable() {
  const t = useTranslations();
  const locale = useLocale();
  const isRTL = locale === 'he';

  const {
    fileGroups,
    getSelectedGroupIndex,
    selectGroup,
    removeFileGroup,
  } = useImageStore();

  const selectedGroupIndex = getSelectedGroupIndex();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-amber-50 px-4 py-2 border-b border-amber-100 flex items-center justify-between flex-shrink-0">
        <h2 className="text-xs font-bold text-amber-700 uppercase tracking-wide">
          {t('files.selectedFiles')}
        </h2>
        <span className="text-sm text-gray-600">
          {t('barcode.summary.total')}: {fileGroups.length}
        </span>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 sticky top-0">
            <tr className={isRTL ? 'text-right' : 'text-left'}>
              <th className="px-2 py-2 w-8">#</th>
              <th className="px-2 py-2 w-12"></th>
              <th className="px-2 py-2">{t('priority.docNumber')}</th>
              <th className="px-2 py-2 w-24">{t('priority.pages')}</th>
              <th className="px-2 py-2 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {fileGroups.map((group, index) => (
              <tr
                key={group.id}
                className={cn(
                  'border-b cursor-pointer transition-colors',
                  index !== selectedGroupIndex && 'hover:bg-gray-50',
                  index === selectedGroupIndex && 'bg-blue-100 hover:bg-blue-200 ring-2 ring-inset ring-blue-400'
                )}
                onClick={() => selectGroup(index)}
              >
                <td className="px-2 py-2 text-muted-foreground">{index + 1}</td>
                <td className="px-2 py-1">
                  {/* Thumbnail - show first page */}
                  <div className="w-10 h-10 bg-gray-200 rounded overflow-hidden flex items-center justify-center relative">
                    {group.pages[0] ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={group.pages[0].data}
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        {/* File type indicator */}
                        <div className="absolute bottom-0 right-0 bg-black/60 rounded-tl p-0.5">
                          {group.originalType === 'pdf' ? (
                            <FileText className="h-2.5 w-2.5 text-white" />
                          ) : (
                            <ImageIcon className="h-2.5 w-2.5 text-white" />
                          )}
                        </div>
                      </>
                    ) : (
                      <FileText className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </td>
                <td className="px-2 py-2">
                  <div className="truncate max-w-[150px]" title={group.fileName || `File ${index + 1}`}>
                    {group.fileName || `File ${index + 1}`}
                  </div>
                </td>
                <td className="px-2 py-2 text-xs text-gray-500">
                  {group.pages.length} {group.pages.length === 1 ? t('priority.page') : t('priority.pages')}
                </td>
                <td className="px-2 py-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-gray-400 hover:text-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFileGroup(group.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </td>
              </tr>
            ))}
            {fileGroups.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  {t('files.noFiles')}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
