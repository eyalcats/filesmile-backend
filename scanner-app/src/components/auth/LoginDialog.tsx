'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, Building2, ArrowLeft, Lock } from 'lucide-react';
import { api, ApiException, TenantInfo } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

interface LoginDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
}

type AuthStep = 'email' | 'tenant-select' | 'credentials';

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
  const t = useTranslations('auth');
  const { setAuth } = useAuthStore();

  // Form state
  const [email, setEmail] = useState('');
  const [erpUsername, setErpUsername] = useState('');
  const [erpPassword, setErpPassword] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');

  // UI state
  const [step, setStep] = useState<AuthStep>('email');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [resolvedTenantId, setResolvedTenantId] = useState<number | null>(null);
  const [resolvedTenantName, setResolvedTenantName] = useState<string>('');

  // Step 1: Handle email submission
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Resolve tenant from email domain
      const resolveResponse = await api.resolveTenant(email);

      if (resolveResponse.requires_selection && resolveResponse.tenants) {
        // Multiple tenants - show selector
        setTenants(resolveResponse.tenants);
        setStep('tenant-select');
        setIsLoading(false);
        return;
      }

      // Single tenant - try email-only login first
      const tenantId = resolveResponse.tenant_id!;
      const tenantName = resolveResponse.tenant_name || '';
      setResolvedTenantId(tenantId);
      setResolvedTenantName(tenantName);

      await tryEmailOnlyLogin(tenantId, tenantName);
    } catch (err) {
      setIsLoading(false);
      if (err instanceof ApiException) {
        if (err.errorCode === 'TENANT_NOT_FOUND') {
          setError(t('tenantNotFound'));
        } else {
          setError(err.message);
        }
      } else {
        setError(t('loginError'));
      }
    }
  };

  // Step 2: Handle tenant selection
  const handleTenantSelect = async () => {
    if (!selectedTenantId) return;

    setError(null);
    setIsLoading(true);

    const tenantId = parseInt(selectedTenantId);
    const tenant = tenants.find((t) => t.tenant_id === tenantId);
    const tenantName = tenant?.tenant_name || '';

    setResolvedTenantId(tenantId);
    setResolvedTenantName(tenantName);

    await tryEmailOnlyLogin(tenantId, tenantName);
  };

  // Try email-only login (for pre-configured users)
  const tryEmailOnlyLogin = async (tenantId: number, tenantName: string) => {
    try {
      const loginResponse = await api.login(email, tenantId);
      handleLoginSuccess(loginResponse, tenantName);
    } catch (err) {
      setIsLoading(false);
      if (err instanceof ApiException) {
        // Check if credentials are missing or invalid - need to show credentials form
        // Check both errorCode (from header) and message (from response body)
        const credentialErrors = [
          'NO_STORED_CREDENTIALS',
          'STORED_CREDENTIALS_INVALID',
          'USER_NOT_FOUND',
          'CREDENTIAL_DECRYPTION_FAILED',
        ];
        const needsCredentials =
          credentialErrors.includes(err.errorCode || '') ||
          credentialErrors.includes(err.message);

        if (needsCredentials) {
          // Show credentials form
          setStep('credentials');
          return;
        }
        setError(err.message);
      } else {
        setError(t('loginError'));
      }
    }
  };

  // Step 3: Handle credentials submission
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const registerResponse = await api.register(
        email,
        erpUsername,
        erpPassword,
        resolvedTenantId || undefined
      );
      handleLoginSuccess(registerResponse, resolvedTenantName);
    } catch (err) {
      setIsLoading(false);
      if (err instanceof ApiException) {
        if (err.status === 401) {
          setError(t('invalidCredentials'));
        } else {
          setError(err.message);
        }
      } else {
        setError(t('loginError'));
      }
    }
  };

  // Handle successful login
  const handleLoginSuccess = (
    response: { access_token: string; tenant_id: number; user_id: number; email: string },
    tenantName: string
  ) => {
    setAuth({
      jwtToken: response.access_token,
      tenantId: response.tenant_id,
      tenantName: tenantName,
      userEmail: response.email,
      userId: response.user_id,
    });

    setIsLoading(false);
    onOpenChange?.(false);
  };

  // Go back to previous step
  const handleBack = () => {
    setError(null);
    if (step === 'credentials') {
      if (tenants.length > 1) {
        setStep('tenant-select');
      } else {
        setStep('email');
      }
    } else if (step === 'tenant-select') {
      setStep('email');
      setTenants([]);
      setSelectedTenantId('');
    }
  };

  // Render email form (Step 1)
  const renderEmailForm = () => (
    <form onSubmit={handleEmailSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">{t('email')}</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@company.com"
          required
          autoFocus
          dir="ltr"
        />
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {t('loggingIn')}
          </>
        ) : (
          t('loginButton')
        )}
      </Button>
    </form>
  );

  // Render tenant selection (Step 2)
  const renderTenantSelect = () => (
    <div className="space-y-4">
      <div className="text-sm text-muted-foreground">
        <strong>{t('email')}:</strong> {email}
      </div>
      <p className="text-sm text-muted-foreground">{t('selectTenantDescription')}</p>

      <div className="space-y-2">
        <Label>{t('organization')}</Label>
        <Select value={selectedTenantId} onValueChange={setSelectedTenantId}>
          <SelectTrigger>
            <SelectValue placeholder={t('selectAnOrganization')} />
          </SelectTrigger>
          <SelectContent>
            {tenants.map((tenant) => (
              <SelectItem key={tenant.tenant_id} value={tenant.tenant_id.toString()}>
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  {tenant.tenant_name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}

      <div className="flex gap-2">
        <Button variant="outline" onClick={handleBack} disabled={isLoading} className="flex-1">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('back')}
        </Button>
        <Button
          onClick={handleTenantSelect}
          disabled={isLoading || !selectedTenantId}
          className="flex-1"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('loggingIn')}
            </>
          ) : (
            t('continue')
          )}
        </Button>
      </div>
    </div>
  );

  // Render credentials form (Step 3)
  const renderCredentialsForm = () => (
    <form onSubmit={handleCredentialsSubmit} className="space-y-4">
      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm">
        <div className="flex items-start gap-2">
          <Lock className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-amber-700 text-xs">
              <strong>{t('organization')}:</strong> {resolvedTenantName}
              <br />
              <strong>{t('email')}:</strong> {email}
            </p>
          </div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{t('enterErpCredentials')}</p>

      <div className="space-y-2">
        <Label htmlFor="erpUsername">{t('erpUsername')} *</Label>
        <Input
          id="erpUsername"
          type="text"
          value={erpUsername}
          onChange={(e) => setErpUsername(e.target.value)}
          placeholder={t('enterErpUsername')}
          required
          autoFocus
          dir="ltr"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="erpPassword">{t('erpPassword')} *</Label>
        <Input
          id="erpPassword"
          type="password"
          value={erpPassword}
          onChange={(e) => setErpPassword(e.target.value)}
          placeholder={t('enterErpPassword')}
          required
          dir="ltr"
        />
      </div>

      {error && <div className="text-sm text-destructive">{error}</div>}

      <div className="flex gap-2">
        <Button variant="outline" onClick={handleBack} disabled={isLoading} type="button">
          <ArrowLeft className="mr-2 h-4 w-4" />
          {t('back')}
        </Button>
        <Button type="submit" disabled={isLoading} className="flex-1">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('validating')}
            </>
          ) : (
            t('loginButton')
          )}
        </Button>
      </div>
    </form>
  );

  // Get dialog title based on step
  const getDialogTitle = () => {
    switch (step) {
      case 'tenant-select':
        return t('selectTenant');
      case 'credentials':
        return t('erpLoginRequired');
      default:
        return t('login');
    }
  };

  // Get dialog description based on step
  const getDialogDescription = () => {
    switch (step) {
      case 'tenant-select':
        return `${tenants.length} ${t('environmentsAvailable')}`;
      case 'credentials':
        return t('enterErpCredentialsDesc');
      default:
        return t('enterEmailToLogin');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{getDialogTitle()}</DialogTitle>
          <DialogDescription>{getDialogDescription()}</DialogDescription>
        </DialogHeader>

        {step === 'email' && renderEmailForm()}
        {step === 'tenant-select' && renderTenantSelect()}
        {step === 'credentials' && renderCredentialsForm()}
      </DialogContent>
    </Dialog>
  );
}
