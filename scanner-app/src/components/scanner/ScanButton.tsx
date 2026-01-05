'use client';

import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScanLine, Loader2 } from 'lucide-react';
import { useScannerStore } from '@/stores/scanner-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useImageStore } from '@/stores/image-store';
import { scannerService } from '@/lib/scanner';

interface ScanButtonProps {
  compact?: boolean;
}

export function ScanButton({ compact = false }: ScanButtonProps) {
  const t = useTranslations('scanner');
  const { serviceStatus, isScanning, scanProgress, setIsScanning, setScanProgress, setScanError } =
    useScannerStore();
  const { selectedDeviceId, resolution, colorMode, duplex, autoFeeder } = useSettingsStore();
  const { addImages } = useImageStore();

  const handleScan = async () => {
    if (!selectedDeviceId) {
      setScanError('No scanner selected');
      return;
    }

    setIsScanning(true);
    setScanError(null);
    setScanProgress(0);

    try {
      const result = await scannerService.scan(
        selectedDeviceId,
        { resolution, colorMode, duplex, autoFeeder },
        (progress) => setScanProgress(progress)
      );

      // Add scanned images to the image store
      if (result.images.length > 0) {
        addImages(
          result.images.map((img) => ({
            data: img.data,
            width: img.width,
            height: img.height,
          }))
        );
      }

      setScanProgress(100);
    } catch (error) {
      console.error('Scan failed:', error);
      setScanError(error instanceof Error ? error.message : 'Scan failed');
    } finally {
      setIsScanning(false);
    }
  };

  const isDisabled = serviceStatus !== 'connected' || !selectedDeviceId || isScanning;

  if (compact) {
    return (
      <Button
        onClick={handleScan}
        disabled={isDisabled}
        size="sm"
        className="h-8 bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        {isScanning ? (
          <>
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            <span className="text-xs">{scanProgress}%</span>
          </>
        ) : (
          <>
            <ScanLine className="mr-1 h-4 w-4" />
            <span className="text-xs">{t('scan')}</span>
          </>
        )}
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleScan}
        disabled={isDisabled}
        className="w-full"
        size="lg"
      >
        {isScanning ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            {t('scanning')}
          </>
        ) : (
          <>
            <ScanLine className="mr-2 h-5 w-5" />
            {t('scan')}
          </>
        )}
      </Button>

      {isScanning && (
        <Progress value={scanProgress} className="h-2" />
      )}
    </div>
  );
}
