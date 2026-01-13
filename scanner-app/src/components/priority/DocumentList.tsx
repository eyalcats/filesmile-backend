'use client';

import { useState, useMemo, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Filter, X } from 'lucide-react';
import { useDocumentStore, Document } from '@/stores/document-store';
import { Button } from '@/components/ui/button';

interface DocumentListProps {
  open: boolean;
  onClose: () => void;
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

export function DocumentList({ open, onClose }: DocumentListProps) {
  const t = useTranslations('priority');
  const locale = useLocale();
  const isRTL = locale === 'he';
  const { searchResults, setSelectedDocument } = useDocumentStore();

  // Filter state
  const [docTypeFilter, setDocTypeFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');

  // Reset filters when dialog opens with new results
  useEffect(() => {
    if (open) {
      setDocTypeFilter('all');
      setCustomerFilter('all');
    }
  }, [open, searchResults]);

  // Extract unique document types and customers
  const { docTypes, customers } = useMemo(() => {
    const types = new Map<string, string>(); // Form -> FormDesc
    const custs = new Set<string>();

    searchResults.forEach((doc) => {
      if (doc.Form) {
        types.set(doc.Form, doc.FormDesc || doc.Form);
      }
      if (doc.CustName) {
        custs.add(doc.CustName);
      }
    });

    return {
      docTypes: Array.from(types.entries()).map(([form, desc]) => ({ form, desc })),
      customers: Array.from(custs).sort(),
    };
  }, [searchResults]);

  // Filter results
  const filteredResults = useMemo(() => {
    return searchResults.filter((doc) => {
      if (docTypeFilter !== 'all' && doc.Form !== docTypeFilter) {
        return false;
      }
      if (customerFilter !== 'all' && doc.CustName !== customerFilter) {
        return false;
      }
      return true;
    });
  }, [searchResults, docTypeFilter, customerFilter]);

  const hasActiveFilters = docTypeFilter !== 'all' || customerFilter !== 'all';

  const clearFilters = () => {
    setDocTypeFilter('all');
    setCustomerFilter('all');
  };

  const handleSelectDocument = (doc: Document) => {
    setSelectedDocument(doc);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle className={isRTL ? 'text-right' : ''}>{t('selectDocument')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('selectDocument')}
          </DialogDescription>
        </DialogHeader>

        {/* Filter Section */}
        {searchResults.length > 0 && (docTypes.length > 1 || customers.length > 1) && (
          <div className="space-y-2 pb-2 border-b">
            <div className={`flex items-center gap-2 text-xs text-muted-foreground ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Filter className="h-3 w-3" />
              <span>{t('filterBy')}</span>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1 text-xs"
                  onClick={clearFilters}
                >
                  <X className="h-3 w-3 me-1" />
                  {t('clearFilters')}
                </Button>
              )}
            </div>
            <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              {/* Document Type Filter */}
              {docTypes.length > 1 && (
                <Select value={docTypeFilter} onValueChange={setDocTypeFilter} dir={isRTL ? 'rtl' : 'ltr'}>
                  <SelectTrigger className={`h-8 text-xs flex-1 ${isRTL ? 'text-right' : ''}`}>
                    <SelectValue placeholder={t('docType')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className={isRTL ? 'text-right' : ''}>{t('allDocTypes')}</SelectItem>
                    {docTypes.map(({ form, desc }) => (
                      <SelectItem key={form} value={form} className={isRTL ? 'text-right' : ''}>
                        {desc}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {/* Customer Filter */}
              {customers.length > 1 && (
                <Select value={customerFilter} onValueChange={setCustomerFilter} dir={isRTL ? 'rtl' : 'ltr'}>
                  <SelectTrigger className={`h-8 text-xs flex-1 ${isRTL ? 'text-right' : ''}`}>
                    <SelectValue placeholder={t('customer')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className={isRTL ? 'text-right' : ''}>{t('allCustomers')}</SelectItem>
                    {customers.map((cust) => (
                      <SelectItem key={cust} value={cust} className={isRTL ? 'text-right' : ''}>
                        {cust}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            {/* Results count */}
            <div className="text-xs text-muted-foreground">
              {filteredResults.length} / {searchResults.length} {t('documents')}
            </div>
          </div>
        )}

        <ScrollArea className="max-h-[350px]" dir={isRTL ? 'rtl' : 'ltr'}>
          <div className="space-y-1">
            {filteredResults.map((doc, index) => (
              <button
                key={`${doc.Form}-${doc.FormKey}-${index}`}
                onClick={() => handleSelectDocument(doc)}
                className={`w-full p-3 rounded-lg border hover:bg-accent transition-colors ${isRTL ? 'text-right' : 'text-start'}`}
              >
                <div className={`flex items-start gap-3 ${isRTL ? 'flex-row-reverse' : ''}`}>
                  <FileText className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div className={`flex-1 min-w-0 ${isRTL ? 'text-right' : 'text-left'}`}>
                    <div className="font-medium truncate">
                      {doc.FormDesc || doc.Form} - {doc.DocNo || 'N/A'}
                    </div>
                    <div className={`text-sm text-muted-foreground flex items-center gap-2 flex-wrap ${isRTL ? 'flex-row-reverse' : ''}`}>
                      {doc.CustName && <span className="truncate max-w-[200px]">{doc.CustName}</span>}
                      {doc.CustName && doc.DocDate && <span>|</span>}
                      {doc.DocDate && <span>{formatShortDate(doc.DocDate)}</span>}
                    </div>
                  </div>
                </div>
              </button>
            ))}

            {filteredResults.length === 0 && searchResults.length > 0 && (
              <div className="text-center py-8 text-muted-foreground">
                {t('noFilteredResults')}
              </div>
            )}

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
