'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Wifi, WifiOff, Loader2, Download, RefreshCw } from 'lucide-react';
import { useScannerStore } from '@/stores/scanner-store';
import { scannerService } from '@/lib/scanner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const VINTASOFT_DOWNLOAD_URL =
  process.env.NEXT_PUBLIC_VINTASOFT_SERVICE_URL ||
  'https://www.vintasoft.com/zip/VintasoftWebTwainService-15.3.3.zip';

interface ServiceStatusProps {
  className?: string;
}

export function ServiceStatus({ className }: ServiceStatusProps) {
  const t = useTranslations('scanner.serviceStatus');
  const { serviceStatus, setServiceStatus, setServiceError } = useScannerStore();
  const [isRetrying, setIsRetrying] = useState(false);

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

  const handleRetryConnection = async () => {
    setIsRetrying(true);
    setServiceStatus('checking');
    try {
      const connected = await scannerService.checkConnection();
      setServiceStatus(connected ? 'connected' : 'disconnected');
      setServiceError(null);
    } catch (error) {
      setServiceStatus('error');
      setServiceError(error instanceof Error ? error.message : 'Connection error');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDownload = () => {
    window.open(VINTASOFT_DOWNLOAD_URL, '_blank');
  };

  const getStatusConfig = () => {
    switch (serviceStatus) {
      case 'connected':
        return {
          icon: Wifi,
          text: t('connected'),
          className: 'text-green-600 bg-green-50 border-green-200',
          iconClassName: 'text-green-600',
        };
      case 'disconnected':
      case 'error':
        return {
          icon: WifiOff,
          text: t('disconnected'),
          className: 'text-red-600 bg-red-50 border-red-200',
          iconClassName: 'text-red-600',
        };
      case 'checking':
      default:
        return {
          icon: Loader2,
          text: t('checking'),
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
          config.className
        )}
      >
        <Icon className={cn('h-4 w-4', config.iconClassName)} />
        <span>{config.text}</span>
      </div>

      {/* Download/Install section - only shown when disconnected */}
      {isDisconnected && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <div>
            <h4 className="font-medium text-blue-900">{t('installTitle')}</h4>
            <p className="text-sm text-blue-700 mt-1">{t('installDescription')}</p>
          </div>

          <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
            <li>{t('step1')}</li>
            <li>{t('step2')}</li>
            <li>{t('step3')}</li>
          </ol>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handleDownload}
              variant="default"
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Download className="h-4 w-4 mr-2" />
              {t('downloadButton')}
            </Button>
            <Button
              onClick={handleRetryConnection}
              variant="outline"
              size="sm"
              disabled={isRetrying}
              className="border-blue-300 text-blue-700 hover:bg-blue-100"
            >
              <RefreshCw className={cn('h-4 w-4 mr-2', isRetrying && 'animate-spin')} />
              {isRetrying ? t('retrying') : t('retryButton')}
            </Button>
          </div>

          <p className="text-xs text-blue-600">{t('windowsOnly')}</p>
        </div>
      )}
    </div>
  );
}
