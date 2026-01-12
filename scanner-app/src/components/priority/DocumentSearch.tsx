'use client';

import { useTranslations, useLocale } from 'next-intl';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search, Loader2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useDocumentStore } from '@/stores/document-store';

interface DocumentSearchProps {
  onResultsFound?: () => void;
}

export function DocumentSearch({ onResultsFound }: DocumentSearchProps) {
  const t = useTranslations('priority');
  const locale = useLocale();
  const isRTL = locale === 'he';
  const {
    selectedGroupId,
    selectedForm,
    searchTerm,
    isSearching,
    setSearchTerm,
    setIsSearching,
    setSearchResults,
    setSearchError,
  } = useDocumentStore();

  const handleSearch = async () => {
    if (!searchTerm.trim() || !selectedGroupId) return;

    setIsSearching(true);
    setSearchError(null);

    try {
      const response = await api.searchDocuments(
        selectedGroupId,
        searchTerm.trim(),
        selectedForm || undefined
      );

      setSearchResults(response.documents);

      if (response.documents.length === 0) {
        setSearchError(t('noResults'));
      } else {
        onResultsFound?.();
      }
    } catch (error) {
      console.error('Search failed:', error);
      setSearchError(error instanceof Error ? error.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const clearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setSearchError(null);
  };

  return (
    <div className="space-y-2" dir={isRTL ? 'rtl' : 'ltr'}>
      <Label>{t('searchTerm')}</Label>
      <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <div className="relative flex-1">
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('searchTerm')}
            disabled={isSearching}
            dir="ltr"
            className={isRTL ? 'text-right' : ''}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={clearSearch}
              className={`absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground ${isRTL ? 'left-2' : 'right-2'}`}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <Button
          onClick={handleSearch}
          disabled={isSearching || !searchTerm.trim() || !selectedGroupId}
        >
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Search className="h-4 w-4" />
          )}
          <span className={isRTL ? 'mr-2' : 'ml-2'}>{isSearching ? t('searching') : t('search')}</span>
        </Button>
      </div>
    </div>
  );
}
