import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const isRTL = locale === 'he';
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
      {/* Grid layout for dropdowns and switches */}
      <div className="grid grid-cols-2 gap-4" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Resolution */}
        <div className={`space-y-2 ${isRTL ? 'text-right' : ''}`}>
          <Label>{t('scanner.resolution')}</Label>
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

        {/* Duplex */}
        <div className={`space-y-2 ${isRTL ? 'text-right' : ''}`}>
          <Label htmlFor="duplex" className="cursor-pointer">
            {t('scanner.duplex')}
          </Label>
          <div className={`h-10 flex items-center ${isRTL ? 'justify-end' : ''}`}>
            <Switch
              id="duplex"
              checked={duplex}
              onCheckedChange={setDuplex}
              disabled={isDisabled}
            />
          </div>
        </div>

        {/* Color Mode */}
        <div className={`space-y-2 ${isRTL ? 'text-right' : ''}`}>
          <Label>{t('scanner.colorMode')}</Label>
          <Select
            value={colorMode}
            onValueChange={(value) => setColorMode(value as ColorMode)}
            disabled={isDisabled}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gray">{t('scanner.gray')}</SelectItem>
              <SelectItem value="bw">{t('scanner.bw')}</SelectItem>
              <SelectItem value="rgb">{t('scanner.rgb')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Auto Feeder */}
        <div className={`space-y-2 ${isRTL ? 'text-right' : ''}`}>
          <Label htmlFor="autoFeeder" className="cursor-pointer">
            {t('scanner.autoFeeder')}
          </Label>
          <div className={`h-10 flex items-center ${isRTL ? 'justify-end' : ''}`}>
            <Switch
              id="autoFeeder"
              checked={autoFeeder}
              onCheckedChange={setAutoFeeder}
              disabled={isDisabled}
            />
          </div>
        </div>

        {/* Auto Save */}
        <div className={`space-y-2 ${isRTL ? 'text-right' : ''}`}>
          <Label htmlFor="autoSave" className="cursor-pointer">
            {t('scanner.autoSave')}
          </Label>
          <div className={`h-10 flex items-center ${isRTL ? 'justify-end' : ''}`}>
            <Switch
              id="autoSave"
              checked={autoSave}
              onCheckedChange={setAutoSave}
              disabled={isDisabled}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
