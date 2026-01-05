'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { ExternalLink, X, FileText } from 'lucide-react';
import { useDocumentStore } from '@/stores/document-store';
import { useAuthStore } from '@/stores/auth-store';

export function SelectedDocument() {
  const t = useTranslations('priority');
  const { selectedDocument, selectedCompany, setSelectedDocument, clearSearch } = useDocumentStore();
  const { tenantName } = useAuthStore();

  if (!selectedDocument) return null;

  const handleOpenInPriority = () => {
    // Format: priority:priform@{Form}:{FormKey}:{company}:{tabula}
    // The tabula.ini is typically the tenant's tabula setting
    const url = `priority:priform@${selectedDocument.Form}:${selectedDocument.FormKey}:${selectedCompany || ''}:tabula.ini`;
    window.location.href = url;
  };

  const handleClear = () => {
    setSelectedDocument(null);
  };

  return (
    <div className="rounded-lg border bg-amber-50 border-amber-200 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <FileText className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="min-w-0">
            <div className="font-medium text-amber-900">
              {selectedDocument.FormDesc || selectedDocument.Form}
            </div>
            <div className="text-sm text-amber-700">
              {t('docNumber')}: {selectedDocument.FormKey}
            </div>
            {selectedDocument.CustName && (
              <div className="text-sm text-amber-700">
                {t('customer')}: {selectedDocument.CustName}
              </div>
            )}
            {selectedDocument.DocDate && (
              <div className="text-sm text-amber-700">
                {t('docDate')}: {selectedDocument.DocDate}
              </div>
            )}
            {selectedDocument.Details && (
              <div className="text-xs text-amber-600 mt-1">
                {selectedDocument.Details}
              </div>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClear}
          className="shrink-0 text-amber-700 hover:text-amber-900 hover:bg-amber-100"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex gap-2 mt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenInPriority}
          className="bg-white"
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          {t('openInPriority')}
        </Button>
      </div>
    </div>
  );
}
