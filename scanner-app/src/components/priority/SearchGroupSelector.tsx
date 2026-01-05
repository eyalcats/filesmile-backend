'use client';

import { useEffect, useMemo } from 'react';
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

export function SearchGroupSelector() {
  const t = useTranslations('priority');
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

        // Auto-select first group if none selected
        if (data.length > 0 && !selectedGroupId) {
          setSelectedGroupId(data[0].FSGROUP);
        }
      } catch (error) {
        console.error('Failed to load search groups:', error);
      } finally {
        setIsLoadingGroups(false);
      }
    };

    loadGroups();
  }, [searchGroups.length, selectedGroupId, setSearchGroups, setSelectedGroupId, setIsLoadingGroups]);

  // Get forms for selected group
  const selectedGroup = useMemo(() => {
    return searchGroups.find((g) => g.FSGROUP === selectedGroupId);
  }, [searchGroups, selectedGroupId]);

  const forms = selectedGroup?.GROUPFORMS || [];

  // Handle group change - reset form selection
  const handleGroupChange = (value: string) => {
    setSelectedGroupId(parseInt(value));
    setSelectedForm(null); // Reset form when group changes
  };

  return (
    <div className="space-y-4">
      {/* Search By (Group) */}
      <div className="space-y-2">
        <Label>{t('searchBy')}</Label>
        <Select
          value={selectedGroupId?.toString() || ''}
          onValueChange={handleGroupChange}
          disabled={isLoadingGroups}
        >
          <SelectTrigger>
            {isLoadingGroups ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-muted-foreground">{t('searchBy')}</span>
              </div>
            ) : (
              <SelectValue placeholder={t('searchBy')} />
            )}
          </SelectTrigger>
          <SelectContent>
            {searchGroups.map((group) => (
              <SelectItem key={group.FSGROUP} value={group.FSGROUP.toString()}>
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
            onValueChange={(value) => setSelectedForm(value === '__all__' ? null : value)}
            disabled={isLoadingGroups}
          >
            <SelectTrigger>
              <SelectValue placeholder={t('selectDocType')} />
            </SelectTrigger>
            <SelectContent>
              {/* "All" option - searches all forms in the group */}
              <SelectItem value="__all__">
                {t('selectDocType')}
              </SelectItem>
              {forms.map((form) => (
                <SelectItem key={form.ENAME} value={form.ENAME}>
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
