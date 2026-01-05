'use client';

import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DeviceSelector } from './DeviceSelector';
import { ScanSettings } from './ScanSettings';
import { ServiceStatus } from './ServiceStatus';

interface ScannerSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScannerSettingsModal({ open, onOpenChange }: ScannerSettingsModalProps) {
  const t = useTranslations('scanner');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{t('settings')}</span>
            <ServiceStatus />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Device Selection */}
          <DeviceSelector />

          {/* Scan Settings */}
          <div className="border-t pt-4">
            <ScanSettings />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
