import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScanLine, Loader2 } from 'lucide-react';
import { useScannerStore } from '@/stores/scanner-store';
import { useSettingsStore } from '@/stores/settings-store';
import { useImageStore } from '@/stores/image-store';
import { scannerService, type ScannedImage } from '@/lib/scanner';

interface ScanButtonProps {
  compact?: boolean;
  onScanComplete?: (images: ScannedImage[]) => void;
}

export function ScanButton({ compact = false, onScanComplete }: ScanButtonProps) {
  const { t } = useTranslation();
  const { serviceStatus, isScanning, scanProgress, setIsScanning, setScanProgress, setScanError } =
    useScannerStore();
  const { selectedDeviceId, resolution, colorMode, duplex, autoFeeder, showUI } = useSettingsStore();
  const { addFileGroup } = useImageStore();

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
        { resolution, colorMode, duplex, autoFeeder, showUI },
        (progress) => setScanProgress(progress)
      );

      // If callback provided, use it; otherwise add to image store
      if (result.images.length > 0) {
        if (onScanComplete) {
          onScanComplete(result.images);
        } else {
          // Default behavior: add to image store as separate file groups
          const timestamp = Date.now();
          result.images.forEach((img, index) => {
            addFileGroup({
              fileName: `Scan_${timestamp}_${index + 1}.png`,
              originalData: img.data,
              originalType: 'image',
              mimeType: 'image/png',
              pages: [{
                id: '',
                data: img.data,
                width: img.width,
                height: img.height,
                pageNumber: 1,
              }],
            });
          });
        }
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
            <Loader2 className="me-1 h-4 w-4 animate-spin" />
            <span className="text-xs">{scanProgress}%</span>
          </>
        ) : (
          <>
            <ScanLine className="me-1 h-4 w-4" />
            <span className="text-xs">{t('scanner.scan')}</span>
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
            <Loader2 className="me-2 h-5 w-5 animate-spin" />
            {t('scanner.scanning')}
          </>
        ) : (
          <>
            <ScanLine className="me-2 h-5 w-5" />
            {t('scanner.scan')}
          </>
        )}
      </Button>

      {isScanning && (
        <Progress value={scanProgress} className="h-2" />
      )}
    </div>
  );
}
