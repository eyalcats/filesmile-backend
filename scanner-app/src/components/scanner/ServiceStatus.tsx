import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Wifi, WifiOff, Loader2, Download, ExternalLink } from 'lucide-react';
import { useScannerStore } from '@/stores/scanner-store';
import { scannerService } from '@/lib/scanner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// Base path for static assets (must match next.config.ts basePath)
// In development basePath is empty, in production it's '/scanner'
const BASE_PATH = import.meta.env.VITE_BASE_PATH ?? '';

// Installer served from the container
const SCANNER_SERVICE_INSTALLER_PATH = `${BASE_PATH}/downloads/FileSmilesScanner-Setup-1.0.0.exe`;

// .NET 8 Desktop Runtime download URL
const DOTNET_RUNTIME_URL = 'https://dotnet.microsoft.com/en-us/download/dotnet/8.0';

interface ServiceStatusProps {
  className?: string;
}

export function ServiceStatus({ className }: ServiceStatusProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const isRTL = locale === 'he';
  const { serviceStatus, setServiceStatus, setServiceError } = useScannerStore();

  // Check connection on mount and periodically
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const connected = await scannerService.checkConnection();
        setServiceStatus(connected ? 'connected' : 'disconnected');
        setServiceError(null);
      } catch (error) {
        setServiceStatus('error');
        setServiceError(error instanceof Error ? error.message : 'Connection error');
      }
    };

    // Initial check
    checkConnection();

    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, [setServiceStatus, setServiceError]);

  const handleDownloadInstaller = () => {
    window.open(SCANNER_SERVICE_INSTALLER_PATH, '_blank');
  };

  const handleDownloadDotNet = () => {
    window.open(DOTNET_RUNTIME_URL, '_blank');
  };

  const getStatusConfig = () => {
    switch (serviceStatus) {
      case 'connected':
        return {
          icon: Wifi,
          text: t('scanner.serviceStatus.connected'),
          className: 'text-green-600 bg-green-50 border-green-200',
          iconClassName: 'text-green-600',
        };
      case 'disconnected':
      case 'error':
        return {
          icon: WifiOff,
          text: t('scanner.serviceStatus.disconnected'),
          className: 'text-red-600 bg-red-50 border-red-200',
          iconClassName: 'text-red-600',
        };
      case 'checking':
      default:
        return {
          icon: Loader2,
          text: t('scanner.serviceStatus.checking'),
          className: 'text-amber-600 bg-amber-50 border-amber-200',
          iconClassName: 'text-amber-600 animate-spin',
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;
  const isDisconnected = serviceStatus === 'disconnected' || serviceStatus === 'error';

  return (
    <div className={cn('space-y-3', className)}>
      {/* Status badge */}
      <div
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm',
          isRTL && 'flex-row-reverse',
          config.className
        )}
      >
        <Icon className={cn('h-4 w-4', config.iconClassName)} />
        <span>{config.text}</span>
      </div>

      {/* Download/Install section - only shown when disconnected */}
      {isDisconnected && (
        <div
          className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3"
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <div>
            <h4 className="font-medium text-blue-900">{t('scanner.serviceStatus.installTitle')}</h4>
            <p className="text-sm text-blue-700 mt-1">{t('scanner.serviceStatus.installDescription')}</p>
          </div>

          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>{t('scanner.serviceStatus.step1')}</li>
            <li>{t('scanner.serviceStatus.step2')}</li>
            <li>{t('scanner.serviceStatus.step3')}</li>
          </ol>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleDownloadInstaller}
              variant="default"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Download className={cn('h-4 w-4', isRTL ? 'ms-2' : 'me-2')} />
              {t('scanner.serviceStatus.downloadButton')}
            </Button>
            <Button
              onClick={handleDownloadDotNet}
              variant="outline"
              size="sm"
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              <ExternalLink className={cn('h-4 w-4', isRTL ? 'ms-2' : 'me-2')} />
              {t('scanner.serviceStatus.downloadDotNet')}
            </Button>
          </div>

          <p className="text-xs text-blue-600">{t('scanner.serviceStatus.windowsOnly')}</p>
        </div>
      )}
    </div>
  );
}
