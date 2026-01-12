'use client';

import { useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
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
import { sharedPreferences } from '@/lib/shared-preferences';

export function CompanySelector() {
  const t = useTranslations('priority');
  const locale = useLocale();
  const isRTL = locale === 'he';
  const {
    companies,
    selectedCompany,
    isLoadingCompanies,
    setCompanies,
    setSelectedCompany,
    setIsLoadingCompanies,
  } = useDocumentStore();

  // Handle company change - save to shared preferences
  const handleCompanyChange = (company: string) => {
    setSelectedCompany(company);
    sharedPreferences.setCompany(company);
  };

  // Load companies on mount
  useEffect(() => {
    const loadCompanies = async () => {
      if (companies.length > 0) return; // Already loaded

      setIsLoadingCompanies(true);
      try {
        const data = await api.getCompanies();
        setCompanies(data);

        // Try to restore from shared preferences first
        const savedCompany = sharedPreferences.getCompany();
        if (savedCompany && data.some(c => c.DNAME === savedCompany)) {
          setSelectedCompany(savedCompany);
        } else if (data.length > 0 && !selectedCompany) {
          // Auto-select first company if none selected
          setSelectedCompany(data[0].DNAME);
          sharedPreferences.setCompany(data[0].DNAME);
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
    <div className="space-y-2" dir={isRTL ? 'rtl' : 'ltr'}>
      <Label>{t('company')}</Label>
      <Select
        value={selectedCompany || ''}
        onValueChange={handleCompanyChange}
        disabled={isLoadingCompanies}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        <SelectTrigger className={isRTL ? 'text-right' : ''}>
          {isLoadingCompanies ? (
            <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-muted-foreground">{t('selectCompany')}</span>
            </div>
          ) : (
            <SelectValue placeholder={t('selectCompany')} />
          )}
        </SelectTrigger>
        <SelectContent>
          {companies.map((company) => (
            <SelectItem key={company.DNAME} value={company.DNAME} className={isRTL ? 'text-right' : ''}>
              {company.TITLE}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
