'use client';

import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, Building2 } from 'lucide-react';
import { TenantInfo } from '@/lib/api';

interface TenantSelectorProps {
  open: boolean;
  tenants: TenantInfo[];
  onSelect: (tenantId: number) => void;
  onBack: () => void;
  isLoading: boolean;
  error: string | null;
}

export function TenantSelector({
  open,
  tenants,
  onSelect,
  onBack,
  isLoading,
  error,
}: TenantSelectorProps) {
  const t = useTranslations('auth');

  return (
    <Dialog open={open}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{t('selectTenant')}</DialogTitle>
          <DialogDescription>
            {tenants.length} environments available
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {tenants.map((tenant) => (
            <Button
              key={tenant.tenant_id}
              variant="outline"
              className="w-full justify-start gap-3 h-auto py-3"
              onClick={() => onSelect(tenant.tenant_id)}
              disabled={isLoading}
            >
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <span className="flex-1 text-start">{tenant.tenant_name}</span>
              {isLoading && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
            </Button>
          ))}
        </div>

        {error && (
          <div className="text-sm text-destructive">{error}</div>
        )}

        <Button
          variant="ghost"
          onClick={onBack}
          disabled={isLoading}
          className="w-full"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </DialogContent>
    </Dialog>
  );
}
