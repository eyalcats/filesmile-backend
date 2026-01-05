'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Settings, LogOut, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSwitch } from './LanguageSwitch';
import { ScannerSettingsModal } from '@/components/scanner';

export function Header() {
  const t = useTranslations();
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-gradient-to-r from-primary via-primary to-yellow-300 shadow-md">
        <div className="container flex h-12 items-center justify-between">
          {/* Logo / Title */}
          <div className="flex items-center gap-2">
            <Smile className="h-6 w-6 text-primary-foreground" />
            <h1 className="text-lg font-bold text-primary-foreground">
              File<span className="font-normal">Smile</span>
            </h1>
            <span className="text-xs text-primary-foreground/70 hidden sm:inline">
              Scanner
            </span>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-1">
            <LanguageSwitch />

            <Button
              variant="ghost"
              size="icon"
              title={t('header.settings')}
              className="text-primary-foreground hover:bg-white/20 h-8 w-8"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="h-4 w-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              title={t('header.logout')}
              className="text-primary-foreground hover:bg-white/20 h-8 w-8"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <ScannerSettingsModal open={showSettings} onOpenChange={setShowSettings} />
    </>
  );
}
