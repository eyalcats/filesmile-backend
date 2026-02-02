import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSettingsStore } from '@/stores/settings-store';

export function BarcodeSettings() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const isRTL = locale === 'he';
  const {
    barcodeTrimPrefix,
    barcodeTrimSuffix,
    setBarcodeTrimPrefix,
    setBarcodeTrimSuffix,
  } = useSettingsStore();

  const handlePrefixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setBarcodeTrimPrefix(Math.max(0, value));
  };

  const handleSuffixChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 0;
    setBarcodeTrimSuffix(Math.max(0, value));
  };

  return (
    <div className="space-y-3">
      <Label className={`text-sm font-medium ${isRTL ? 'block text-right' : ''}`}>{t('barcode.trimChars')}</Label>
      <div className="grid grid-cols-2 gap-4" dir={isRTL ? 'rtl' : 'ltr'}>
        {/* Trim from start (prefix) */}
        <div className={`space-y-1.5 ${isRTL ? 'text-right' : ''}`}>
          <Label htmlFor="trimPrefix" className="text-xs text-muted-foreground">
            {t('barcode.trimFromStart')}
          </Label>
          <Input
            id="trimPrefix"
            type="number"
            min={0}
            max={50}
            value={barcodeTrimPrefix}
            onChange={handlePrefixChange}
            className="h-9"
          />
        </div>

        {/* Trim from end (suffix) */}
        <div className={`space-y-1.5 ${isRTL ? 'text-right' : ''}`}>
          <Label htmlFor="trimSuffix" className="text-xs text-muted-foreground">
            {t('barcode.trimFromEnd')}
          </Label>
          <Input
            id="trimSuffix"
            type="number"
            min={0}
            max={50}
            value={barcodeTrimSuffix}
            onChange={handleSuffixChange}
            className="h-9"
          />
        </div>
      </div>
    </div>
  );
}
