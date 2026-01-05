'use client';

import { useTranslations } from 'next-intl';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useScannerStore } from '@/stores/scanner-store';
import { useSettingsStore, Resolution, ColorMode } from '@/stores/settings-store';

const RESOLUTIONS: Resolution[] = [100, 150, 200, 300, 600];

export function ScanSettings() {
  const t = useTranslations('scanner');
  const { serviceStatus } = useScannerStore();
  const {
    resolution,
    colorMode,
    duplex,
    autoFeeder,
    autoSave,
    setResolution,
    setColorMode,
    setDuplex,
    setAutoFeeder,
    setAutoSave,
  } = useSettingsStore();

  const isDisabled = serviceStatus !== 'connected';

  return (
    <div className="space-y-4">
      {/* Resolution */}
      <div className="space-y-2">
        <Label>{t('resolution')}</Label>
        <Select
          value={resolution.toString()}
          onValueChange={(value) => setResolution(parseInt(value) as Resolution)}
          disabled={isDisabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {RESOLUTIONS.map((res) => (
              <SelectItem key={res} value={res.toString()}>
                {res} DPI
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Color Mode */}
      <div className="space-y-2">
        <Label>{t('colorMode')}</Label>
        <Select
          value={colorMode}
          onValueChange={(value) => setColorMode(value as ColorMode)}
          disabled={isDisabled}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gray">{t('gray')}</SelectItem>
            <SelectItem value="bw">{t('bw')}</SelectItem>
            <SelectItem value="rgb">{t('rgb')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Toggle Options */}
      <div className="space-y-3 pt-2">
        {/* Duplex */}
        <div className="flex items-center justify-between">
          <Label htmlFor="duplex" className="cursor-pointer">
            {t('duplex')}
          </Label>
          <Switch
            id="duplex"
            checked={duplex}
            onCheckedChange={setDuplex}
            disabled={isDisabled}
          />
        </div>

        {/* Auto Feeder */}
        <div className="flex items-center justify-between">
          <Label htmlFor="autoFeeder" className="cursor-pointer">
            {t('autoFeeder')}
          </Label>
          <Switch
            id="autoFeeder"
            checked={autoFeeder}
            onCheckedChange={setAutoFeeder}
            disabled={isDisabled}
          />
        </div>

        {/* Auto Save */}
        <div className="flex items-center justify-between">
          <Label htmlFor="autoSave" className="cursor-pointer">
            {t('autoSave')}
          </Label>
          <Switch
            id="autoSave"
            checked={autoSave}
            onCheckedChange={setAutoSave}
            disabled={isDisabled}
          />
        </div>
      </div>
    </div>
  );
}
