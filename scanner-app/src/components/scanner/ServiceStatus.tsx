'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';
import { useScannerStore } from '@/stores/scanner-store';
import { scannerService } from '@/lib/scanner';
import { cn } from '@/lib/utils';

interface ServiceStatusProps {
  className?: string;
}

export function ServiceStatus({ className }: ServiceStatusProps) {
  const t = useTranslations('scanner.serviceStatus');
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

  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm',
        config.className,
        className
      )}
    >
      <Icon className={cn('h-4 w-4', config.iconClassName)} />
      <span>{config.text}</span>
    </div>
  );
}
