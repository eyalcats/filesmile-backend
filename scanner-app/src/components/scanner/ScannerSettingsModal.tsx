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
import { BarcodeSettings } from './BarcodeSettings';

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
          <DialogTitle>{t('settings')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Service Status */}
          <ServiceStatus />

          {/* Device Selection */}
          <DeviceSelector />

          {/* Scan Settings */}
          <div className="border-t pt-4">
            <ScanSettings />
          </div>

          {/* Barcode Settings */}
          <div className="border-t pt-4">
            <BarcodeSettings />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
