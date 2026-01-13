'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useScannerStore } from '@/stores/scanner-store';
import { scannerService } from '@/lib/scanner';
import { LoginDialog } from './LoginDialog';

interface AuthProviderProps {
  children: React.ReactNode;
}

/**
 * AuthProvider wraps the application and handles authentication state.
 *
 * - Shows login dialog when not authenticated
 * - Persists auth state in localStorage via Zustand
 * - Initializes scanner service on app load
 * - Children are only rendered when authenticated
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const { isAuthenticated, reauthMode, clearReauthMode } = useAuthStore();
  const { setServiceStatus } = useScannerStore();
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for Zustand to hydrate from localStorage
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Initialize scanner service on app load
  useEffect(() => {
    const initScanner = async () => {
      try {
        // Check connection to the scanner service
        const connected = await scannerService.checkConnection();
        setServiceStatus(connected ? 'connected' : 'disconnected');

        // Load VintaSoft SDK if connected
        if (connected) {
          try {
            await scannerService.loadSDK();
          } catch (sdkError) {
            console.warn('Failed to load VintaSoft SDK:', sdkError);
          }
        }
      } catch (error) {
        console.warn('Scanner initialization failed:', error);
        setServiceStatus('disconnected');
      }
    };

    initScanner();
  }, [setServiceStatus]);

  // Show nothing while hydrating to prevent flash
  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Show login dialog if not authenticated
  if (!isAuthenticated) {
    return (
      <>
        {/* Show a minimal background */}
        <div className="flex min-h-screen items-center justify-center bg-muted/30">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-primary mb-2">FileSmile</h1>
            <p className="text-muted-foreground">Scanner</p>
          </div>
        </div>
        {/* Login dialog always open when not authenticated */}
        <LoginDialog open={true} />
      </>
    );
  }

  // Render children when authenticated
  // Also show login dialog as overlay when in reauth mode
  return (
    <>
      {children}
      {reauthMode !== 'none' && (
        <LoginDialog
          open={true}
          onOpenChange={(open) => {
            if (!open) {
              clearReauthMode();
            }
          }}
        />
      )}
    </>
  );
}
