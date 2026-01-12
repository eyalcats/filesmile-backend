'use client';

import { useTranslations } from 'next-intl';
import { FileText, Barcode } from 'lucide-react';
import { useSettingsStore, type AppMode } from '@/stores/settings-store';
import { cn } from '@/lib/utils';

export function ModeToggle() {
  const t = useTranslations('header');
  const { mode, setMode } = useSettingsStore();

  const modes: { value: AppMode; label: string; icon: React.ReactNode }[] = [
    {
      value: 'document',
      label: t('documentMode'),
      icon: <FileText className="h-4 w-4" />,
    },
    {
      value: 'barcode',
      label: t('barcodeMode'),
      icon: <Barcode className="h-4 w-4" />,
    },
  ];

  return (
    <div className="inline-flex rounded-lg border bg-muted p-1">
      {modes.map((m) => (
        <button
          key={m.value}
          onClick={() => setMode(m.value)}
          className={cn(
            'inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all',
            mode === m.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {m.icon}
          {m.label}
        </button>
      ))}
    </div>
  );
}
