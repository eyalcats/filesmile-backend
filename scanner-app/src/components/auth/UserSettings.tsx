import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { User, Building2, KeyRound, RefreshCw, LogOut, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';
import { api, ApiException } from '@/lib/api';

export function UserSettings() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language;
  const isRTL = locale === 'he';
  const {
    userEmail,
    tenantName,
    logout,
    triggerReauthentication,
    triggerTenantChange,
  } = useAuthStore();

  const [isCheckingTenants, setIsCheckingTenants] = useState(false);
  const [hasMultipleTenants, setHasMultipleTenants] = useState<boolean | null>(null);
  const [tenantCheckError, setTenantCheckError] = useState<string | null>(null);

  // Check if user's domain has multiple tenants (for showing/hiding change tenant button)
  const checkMultipleTenants = async () => {
    if (!userEmail || hasMultipleTenants !== null) return;

    setIsCheckingTenants(true);
    setTenantCheckError(null);

    try {
      const response = await api.resolveTenant(userEmail);
      setHasMultipleTenants(
        Boolean(response.requires_selection && response.tenants && response.tenants.length > 1)
      );
    } catch (err) {
      if (err instanceof ApiException) {
        setTenantCheckError(err.message);
      }
      setHasMultipleTenants(false);
    } finally {
      setIsCheckingTenants(false);
    }
  };

  // Check on first render
  if (hasMultipleTenants === null && !isCheckingTenants && userEmail) {
    checkMultipleTenants();
  }

  return (
    <div className="space-y-4">
      {/* Section Title */}
      <h3 className={`text-sm font-medium flex items-center gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
        <User className="h-4 w-4" />
        {t('account.title')}
      </h3>

      {/* Current User Info */}
      <div className="rounded-lg bg-muted/50 p-3 space-y-2">
        <div className={`flex items-center gap-2 text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
          <User className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">{t('account.currentUser')}:</span>
          <span className="font-medium truncate" dir="ltr">{userEmail}</span>
        </div>
        <div className={`flex items-center gap-2 text-sm ${isRTL ? 'flex-row-reverse' : ''}`}>
          <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-muted-foreground">{t('account.organization')}:</span>
          <span className="font-medium truncate">{tenantName || '-'}</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        {/* Re-enter Credentials */}
        <Button
          variant="outline"
          className="w-full !justify-start"
          onClick={triggerReauthentication}
        >
          <div className={`flex items-center gap-2 w-full ${isRTL ? 'flex-row-reverse' : ''}`}>
            <KeyRound className="h-4 w-4 shrink-0" />
            <div className={`flex flex-col ${isRTL ? 'items-end' : 'items-start'}`}>
              <span>{t('account.reenterCredentials')}</span>
              <span className="text-xs text-muted-foreground font-normal">
                {t('account.reenterCredentialsDesc')}
              </span>
            </div>
          </div>
        </Button>

        {/* Change Tenant (only if multiple tenants available) */}
        {isCheckingTenants ? (
          <Button variant="outline" className="w-full !justify-start" disabled>
            <div className={`flex items-center gap-2 w-full ${isRTL ? 'flex-row-reverse' : ''}`}>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-muted-foreground">...</span>
            </div>
          </Button>
        ) : hasMultipleTenants ? (
          <Button
            variant="outline"
            className="w-full !justify-start"
            onClick={triggerTenantChange}
          >
            <div className={`flex items-center gap-2 w-full ${isRTL ? 'flex-row-reverse' : ''}`}>
              <RefreshCw className="h-4 w-4 shrink-0" />
              <div className={`flex flex-col ${isRTL ? 'items-end' : 'items-start'}`}>
                <span>{t('account.changeTenant')}</span>
                <span className="text-xs text-muted-foreground font-normal">
                  {t('account.changeTenantDesc')}
                </span>
              </div>
            </div>
          </Button>
        ) : null}

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full !justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={logout}
        >
          <div className={`flex items-center gap-2 w-full ${isRTL ? 'flex-row-reverse' : ''}`}>
            <LogOut className="h-4 w-4 shrink-0" />
            <div className={`flex flex-col ${isRTL ? 'items-end' : 'items-start'}`}>
              <span>{t('account.logout')}</span>
              <span className="text-xs text-muted-foreground font-normal">
                {t('account.logoutDesc')}
              </span>
            </div>
          </div>
        </Button>
      </div>

      {/* Error display */}
      {tenantCheckError && (
        <div className="text-xs text-destructive">{tenantCheckError}</div>
      )}
    </div>
  );
}
