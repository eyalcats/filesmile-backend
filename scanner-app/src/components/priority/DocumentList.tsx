'use client';

import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText } from 'lucide-react';
import { useDocumentStore, Document } from '@/stores/document-store';

interface DocumentListProps {
  open: boolean;
  onClose: () => void;
}

export function DocumentList({ open, onClose }: DocumentListProps) {
  const t = useTranslations('priority');
  const { searchResults, setSelectedDocument } = useDocumentStore();

  const handleSelectDocument = (doc: Document) => {
    setSelectedDocument(doc);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('selectDocument')}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[400px]">
          <div className="space-y-1">
            {searchResults.map((doc, index) => (
              <button
                key={`${doc.Form}-${doc.FormKey}-${index}`}
                onClick={() => handleSelectDocument(doc)}
                className="w-full text-start p-3 rounded-lg border hover:bg-accent transition-colors"
              >
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {doc.FormDesc || doc.Form} - {doc.FormKey}
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2 flex-wrap">
                      {doc.CustName && <span>{doc.CustName}</span>}
                      {doc.CustName && doc.DocDate && <span>|</span>}
                      {doc.DocDate && <span>{doc.DocDate}</span>}
                    </div>
                    {doc.Details && (
                      <div className="text-xs text-muted-foreground mt-1 truncate">
                        {doc.Details}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}

            {searchResults.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {t('noResults')}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
