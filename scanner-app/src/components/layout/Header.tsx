import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Settings, LogOut, Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { LanguageSwitch } from './LanguageSwitch';
import { ScannerSettingsModal } from '@/components/scanner';
import { useAuthStore } from '@/stores/auth-store';

export function Header() {
  const { t } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);
  const { logout, isAuthenticated } = useAuthStore();

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-gradient-to-r from-primary via-primary to-yellow-300 shadow-md">
        <div className="container mx-auto px-4 max-w-7xl h-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full items-center">
            {/* Logo / Title - aligned with search panel */}
            <div className="lg:col-span-4 xl:col-span-3 flex items-center gap-2">
              <Smile className="h-6 w-6 text-primary-foreground" />
              <h1 className="text-lg font-bold text-primary-foreground">
                File<span className="font-normal">Smile</span>
              </h1>
            </div>

            {/* Action buttons - aligned with scanner panel */}
            <div className="lg:col-span-8 xl:col-span-9 flex items-center justify-end gap-1">
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

              {isAuthenticated && (
                <Button
                  variant="ghost"
                  size="icon"
                  title={t('header.logout')}
                  className="text-primary-foreground hover:bg-white/20 h-8 w-8"
                  onClick={logout}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <ScannerSettingsModal open={showSettings} onOpenChange={setShowSettings} />
    </>
  );
}
