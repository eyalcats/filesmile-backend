'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ExternalLink, FileText, Paperclip, Loader2 } from 'lucide-react';
import { useDocumentStore } from '@/stores/document-store';

interface SelectedDocumentProps {
  onShowAttachments?: () => void;
  headerMode?: boolean; // When true, only render action buttons
}

// Helper to format date to short format (DD/MM/YY)
function formatShortDate(dateStr?: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('he-IL', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function SelectedDocument({ onShowAttachments, headerMode }: SelectedDocumentProps) {
  const t = useTranslations('priority');
  const { selectedDocument, selectedCompany, attachments, isLoadingAttachments } = useDocumentStore();

  if (!selectedDocument) return null;

  const handleOpenInPriority = () => {
    // Format: priority:priform@{Form}:{DocNo}:{company}:tabula.ini:1
    const url = `priority:priform@${selectedDocument.Form}:${selectedDocument.DocNo}:${selectedCompany || ''}:tabula.ini:1`;
    window.location.href = url;
  };

  // Header mode: only render action buttons
  if (headerMode) {
    return (
      <div className="flex items-center gap-1">
        {onShowAttachments && (
          <button
            onClick={onShowAttachments}
            disabled={isLoadingAttachments}
            className="relative flex items-center justify-center h-6 w-6 rounded text-amber-800 hover:text-amber-900 transition-colors"
            title={t('attachments')}
          >
            {isLoadingAttachments ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Paperclip className="h-3.5 w-3.5" />
            )}
            {attachments.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-amber-700 text-white text-[9px] min-w-[12px] h-3 px-0.5 flex items-center justify-center rounded-full">
                {attachments.length}
              </span>
            )}
          </button>
        )}
        <button
          onClick={handleOpenInPriority}
          className="flex items-center justify-center h-6 w-6 rounded text-amber-800 hover:text-amber-900 transition-colors"
          title={t('openInPriority')}
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  // Normal mode: render document info only
  return (
    <div className="flex items-start gap-2">
      <FileText className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="font-medium text-amber-900 text-sm truncate">
          {selectedDocument.FormDesc || selectedDocument.Form} - {selectedDocument.DocNo || 'N/A'}
        </div>
        <div className="text-xs text-amber-700 truncate">
          {selectedDocument.CustName && <span>{selectedDocument.CustName}</span>}
          {selectedDocument.CustName && selectedDocument.DocDate && <span> | </span>}
          {selectedDocument.DocDate && <span>{formatShortDate(selectedDocument.DocDate)}</span>}
        </div>
        {selectedDocument.Details && selectedDocument.Details.toLowerCase() !== 'none' && (
          <div className="text-xs text-gray-600 line-clamp-2" title={selectedDocument.Details}>
            {selectedDocument.Details.length > 80
              ? `${selectedDocument.Details.substring(0, 80)}...`
              : selectedDocument.Details}
          </div>
        )}
      </div>
    </div>
  );
}
