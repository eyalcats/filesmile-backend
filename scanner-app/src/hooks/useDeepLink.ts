'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo, useCallback, useState } from 'react';
import {
  parseDeepLink,
  isDeepLinkFormat,
  type DeepLinkParams,
} from '@/lib/deep-link';

interface UseDeepLinkResult {
  /** Parsed deep link parameters, or null if not a deep link URL */
  params: DeepLinkParams | null;
  /** Whether the current URL is a deep link */
  isDeepLink: boolean;
  /** Whether the deep link has been processed */
  isProcessed: boolean;
  /** Mark the deep link as processed */
  markProcessed: () => void;
}

/**
 * Hook to detect and parse Priority ERP deep link URLs
 *
 * Usage:
 * ```tsx
 * const { params, isDeepLink, isProcessed, markProcessed } = useDeepLink();
 *
 * useEffect(() => {
 *   if (params && !isProcessed) {
 *     // Handle deep link
 *     setSelectedCompany(params.company);
 *     setSelectedDocument({ ... });
 *     markProcessed();
 *   }
 * }, [params, isProcessed]);
 * ```
 */
export function useDeepLink(): UseDeepLinkResult {
  const searchParams = useSearchParams();
  const [isProcessed, setIsProcessed] = useState(false);

  // Get the raw query string from searchParams
  // Next.js useSearchParams gives us the parsed params, but we need the raw string
  // We can reconstruct it or access window.location.search
  const params = useMemo(() => {
    // In Next.js App Router, searchParams is a URLSearchParams-like object
    // For our semicolon-delimited format, the entire string becomes a single key
    // with no value, so we check all keys

    // Get all keys - in our format, the deep link string is the first key
    const keys = Array.from(searchParams.keys());

    if (keys.length === 0) {
      return null;
    }

    // Check if any key looks like a deep link (starts with '[')
    for (const key of keys) {
      if (isDeepLinkFormat(key)) {
        // The key itself is our deep link string
        // We need to reconstruct the full query string
        const value = searchParams.get(key);
        const fullQuery = value ? `${key}=${value}` : key;
        return parseDeepLink(fullQuery);
      }
    }

    return null;
  }, [searchParams]);

  const isDeepLink = params !== null;

  const markProcessed = useCallback(() => {
    setIsProcessed(true);
  }, []);

  return {
    params,
    isDeepLink,
    isProcessed,
    markProcessed,
  };
}
