'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useDocumentStore } from '@/stores/document-store';

export function CompanySelector() {
  const t = useTranslations('priority');
  const {
    companies,
    selectedCompany,
    isLoadingCompanies,
    setCompanies,
    setSelectedCompany,
    setIsLoadingCompanies,
  } = useDocumentStore();

  // Load companies on mount
  useEffect(() => {
    const loadCompanies = async () => {
      if (companies.length > 0) return; // Already loaded

      setIsLoadingCompanies(true);
      try {
        const data = await api.getCompanies();
        setCompanies(data);

        // Auto-select first company if none selected
        if (data.length > 0 && !selectedCompany) {
          setSelectedCompany(data[0].DNAME);
        }
      } catch (error) {
        console.error('Failed to load companies:', error);
      } finally {
        setIsLoadingCompanies(false);
      }
    };

    loadCompanies();
  }, [companies.length, selectedCompany, setCompanies, setSelectedCompany, setIsLoadingCompanies]);

  return (
    <div className="space-y-2">
      <Label>{t('company')}</Label>
      <Select
        value={selectedCompany || ''}
        onValueChange={setSelectedCompany}
        disabled={isLoadingCompanies}
      >
        <SelectTrigger>
          {isLoadingCompanies ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-muted-foreground">{t('selectCompany')}</span>
            </div>
          ) : (
            <SelectValue placeholder={t('selectCompany')} />
          )}
        </SelectTrigger>
        <SelectContent>
          {companies.map((company) => (
            <SelectItem key={company.DNAME} value={company.DNAME}>
              {company.TITLE}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
