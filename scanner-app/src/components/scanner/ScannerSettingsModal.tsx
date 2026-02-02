import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Settings } from 'lucide-react';
import { DeviceSelector } from './DeviceSelector';
import { ScanSettings } from './ScanSettings';
import { ServiceStatus } from './ServiceStatus';
import { BarcodeSettings } from './BarcodeSettings';
import { UserSettings } from '@/components/auth/UserSettings';

interface ScannerSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScannerSettingsModal({ open, onOpenChange }: ScannerSettingsModalProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const isRTL = locale === 'he';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]" dir={isRTL ? 'rtl' : 'ltr'}>
        <DialogHeader>
          <DialogTitle>{t('settings.title')}</DialogTitle>
          <DialogDescription className="sr-only">
            {t('settings.title')}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="account" className="w-full">
          <TabsList className="w-full rtl:flex-row-reverse">
            <TabsTrigger value="account" className="flex-1 rtl:flex-row-reverse">
              <User className="h-4 w-4 me-1.5 rtl:me-0 rtl:ms-1.5" />
              {t('settings.accountTab')}
            </TabsTrigger>
            <TabsTrigger value="scanner" className="flex-1 rtl:flex-row-reverse">
              <Settings className="h-4 w-4 me-1.5 rtl:me-0 rtl:ms-1.5" />
              {t('settings.scannerTab')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="account" className="mt-4">
            <UserSettings />
          </TabsContent>

          <TabsContent value="scanner" className="mt-4 space-y-4">
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
