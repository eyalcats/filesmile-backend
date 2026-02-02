import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, ScanLine } from 'lucide-react';
import { useScannerStore } from '@/stores/scanner-store';
import { useSettingsStore } from '@/stores/settings-store';
import { scannerService } from '@/lib/scanner';

interface DeviceSelectorProps {
  compact?: boolean;
}

export function DeviceSelector({ compact = false }: DeviceSelectorProps) {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const isRTL = locale === 'he';
  const { serviceStatus, devices, isLoadingDevices, setDevices, setIsLoadingDevices } =
    useScannerStore();
  const { selectedDeviceId, setSelectedDeviceId } = useSettingsStore();

  // Load devices when service is connected
  useEffect(() => {
    const loadDevices = async () => {
      if (serviceStatus !== 'connected') return;
      if (devices.length > 0) return; // Already loaded

      setIsLoadingDevices(true);
      try {
        const deviceList = await scannerService.getDevices();
        setDevices(deviceList);

        // Auto-select default device or first device
        if (deviceList.length > 0 && !selectedDeviceId) {
          const defaultDevice = deviceList.find((d) => d.isDefault);
          setSelectedDeviceId(defaultDevice?.id || deviceList[0].id);
        }
      } catch (error) {
        console.error('Failed to load devices:', error);
      } finally {
        setIsLoadingDevices(false);
      }
    };

    loadDevices();
  }, [serviceStatus, devices.length, selectedDeviceId, setDevices, setIsLoadingDevices, setSelectedDeviceId]);

  const isDisabled = serviceStatus !== 'connected' || isLoadingDevices;

  // Get selected device name for compact display
  const selectedDevice = devices.find((d) => d.id === selectedDeviceId);
  const displayName = selectedDevice?.name || t('scanner.selectDevice');
  // Truncate long names in compact mode
  const truncatedName = compact && displayName.length > 25
    ? displayName.substring(0, 22) + '...'
    : displayName;

  if (compact) {
    return (
      <Select
        value={selectedDeviceId || ''}
        onValueChange={setSelectedDeviceId}
        disabled={isDisabled}
      >
        <SelectTrigger className="h-8 w-[180px] bg-gray-700 border-gray-600 text-white text-xs">
          {isLoadingDevices ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-3 w-3 animate-spin" />
            </div>
          ) : (
            <SelectValue placeholder={truncatedName}>
              <span className="truncate">{truncatedName}</span>
            </SelectValue>
          )}
        </SelectTrigger>
        <SelectContent>
          {devices.map((device) => (
            <SelectItem key={device.id} value={device.id}>
              <span className="text-sm">{device.name}</span>
            </SelectItem>
          ))}
          {devices.length === 0 && !isLoadingDevices && (
            <div className="py-2 px-2 text-sm text-muted-foreground">
              {t('scanner.noDevices')}
            </div>
          )}
        </SelectContent>
      </Select>
    );
  }

  return (
    <div className="space-y-2">
      <Label className={`flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <ScanLine className="h-4 w-4" />
        {t('scanner.selectDevice')}
      </Label>
      <Select
        value={selectedDeviceId || ''}
        onValueChange={setSelectedDeviceId}
        disabled={isDisabled}
      >
        <SelectTrigger>
          {isLoadingDevices ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-muted-foreground">{t('scanner.selectDevice')}</span>
            </div>
          ) : (
            <SelectValue placeholder={devices.length === 0 ? t('scanner.noDevices') : t('scanner.selectDevice')} />
          )}
        </SelectTrigger>
        <SelectContent>
          {devices.map((device) => (
            <SelectItem key={device.id} value={device.id}>
              <div className="flex items-center gap-2">
                <span>{device.name}</span>
                {device.isDefault && (
                  <span className="text-xs text-muted-foreground">(Default)</span>
                )}
              </div>
            </SelectItem>
          ))}
          {devices.length === 0 && !isLoadingDevices && (
            <div className="py-2 px-2 text-sm text-muted-foreground">
              {t('scanner.noDevices')}
            </div>
          )}
        </SelectContent>
      </Select>
    </div>
  );
}
