'use client';

import { useEffect, useMemo } from 'react';
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

export function SearchGroupSelector() {
  const t = useTranslations('priority');
  const locale = useLocale();
  const isRTL = locale === 'he';
  const {
    searchGroups,
    selectedGroupId,
    selectedForm,
    isLoadingGroups,
    setSearchGroups,
    setSelectedGroupId,
    setSelectedForm,
    setIsLoadingGroups,
  } = useDocumentStore();

  // Load search groups on mount
  useEffect(() => {
    const loadGroups = async () => {
      if (searchGroups.length > 0) return; // Already loaded

      setIsLoadingGroups(true);
      try {
        const data = await api.getSearchGroups();
        setSearchGroups(data);

        // Try to restore from shared preferences first
        const savedGroupId = sharedPreferences.getSearchGroupId();
        const savedDocType = sharedPreferences.getDocType();

        if (savedGroupId && data.some(g => g.FSGROUP === savedGroupId)) {
          setSelectedGroupId(savedGroupId);
          // Also restore doc type if it belongs to this group
          if (savedDocType) {
            const group = data.find(g => g.FSGROUP === savedGroupId);
            if (group?.GROUPFORMS.some(f => f.ENAME === savedDocType)) {
              setSelectedForm(savedDocType);
            }
          }
        } else if (data.length > 0 && !selectedGroupId) {
          // Auto-select first group if none selected
          setSelectedGroupId(data[0].FSGROUP);
          sharedPreferences.setSearchGroupId(data[0].FSGROUP);
        }
      } catch (error) {
        console.error('Failed to load search groups:', error);
      } finally {
        setIsLoadingGroups(false);
      }
    };

    loadGroups();
  }, [searchGroups.length, selectedGroupId, setSearchGroups, setSelectedGroupId, setSelectedForm, setIsLoadingGroups]);

  // Get forms for selected group
  const selectedGroup = useMemo(() => {
    return searchGroups.find((g) => g.FSGROUP === selectedGroupId);
  }, [searchGroups, selectedGroupId]);

  const forms = selectedGroup?.GROUPFORMS || [];

  // Handle group change - reset form selection and save to shared preferences
  const handleGroupChange = (value: string) => {
    const groupId = parseInt(value);
    setSelectedGroupId(groupId);
    setSelectedForm(null); // Reset form when group changes
    sharedPreferences.setSearchGroupId(groupId);
    sharedPreferences.setDocType(null);
  };

  // Handle doc type change - save to shared preferences
  const handleDocTypeChange = (value: string) => {
    const docType = value === '__all__' ? null : value;
    setSelectedForm(docType);
    sharedPreferences.setDocType(docType);
  };

  return (
    <div className="space-y-4" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Search By (Group) */}
      <div className="space-y-2">
        <Label>{t('searchBy')}</Label>
        <Select
          value={selectedGroupId?.toString() || ''}
          onValueChange={handleGroupChange}
          disabled={isLoadingGroups}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <SelectTrigger className={isRTL ? 'text-right' : ''}>
            {isLoadingGroups ? (
              <div className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-muted-foreground">{t('searchBy')}</span>
              </div>
            ) : (
              <SelectValue placeholder={t('searchBy')} />
            )}
          </SelectTrigger>
          <SelectContent>
            {searchGroups.map((group) => (
              <SelectItem key={group.FSGROUP} value={group.FSGROUP.toString()} className={isRTL ? 'text-right' : ''}>
                {group.FSGROUPNAME}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Doc Type (Form) - Only show if group has multiple forms */}
      {forms.length > 0 && (
        <div className="space-y-2">
          <Label>{t('docType')}</Label>
          <Select
            value={selectedForm || '__all__'}
            onValueChange={handleDocTypeChange}
            disabled={isLoadingGroups}
            dir={isRTL ? 'rtl' : 'ltr'}
          >
            <SelectTrigger className={isRTL ? 'text-right' : ''}>
              <SelectValue placeholder={t('selectDocType')} />
            </SelectTrigger>
            <SelectContent>
              {/* "All" option - searches all forms in the group */}
              <SelectItem value="__all__" className={isRTL ? 'text-right' : ''}>
                {t('selectDocType')}
              </SelectItem>
              {forms.map((form) => (
                <SelectItem key={form.ENAME} value={form.ENAME} className={isRTL ? 'text-right' : ''}>
                  {form.TITLE}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
