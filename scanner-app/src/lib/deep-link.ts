/**
 * Deep Link Parser for Priority ERP URLs
 *
 * URL Format: ?[2656];l;demo;W;admin;AINVOICES;('IN25400004','D','A');EXTFILES:
 *
 * Parsed indices:
 * - 2: company (e.g., "demo")
 * - 5: form (e.g., "AINVOICES")
 * - 6: formKey (e.g., "('IN25400004','D','A')")
 * - 7: extFilesForm (e.g., "EXTFILES")
 */

export interface DeepLinkParams {
  company: string;
  form: string;
  formKey: string;
  extFilesForm: string;
}

/**
 * Parse a deep link query string from Priority ERP
 * @param queryString - The raw query string (everything after '?')
 * @returns Parsed parameters or null if invalid
 */
export function parseDeepLink(queryString: string): DeepLinkParams | null {
  if (!queryString || queryString.trim() === '') {
    return null;
  }

  try {
    // URL decode the query string
    const decoded = decodeURIComponent(queryString);

    // Split by semicolons
    const args = decoded.split(';');

    // We need at least 8 parts (indices 0-7)
    if (args.length < 8) {
      return null;
    }

    const company = args[2]?.trim();
    const form = args[5]?.trim();
    const formKey = args[6]?.trim();
    // Remove trailing colon from extFilesForm if present
    const extFilesForm = args[7]?.trim().replace(/:$/, '');

    // Validate required fields
    if (!company || !form || !formKey || !extFilesForm) {
      return null;
    }

    return {
      company,
      form,
      formKey,
      extFilesForm,
    };
  } catch {
    // URL decode or parsing failed
    return null;
  }
}

/**
 * Extract the document number from a FormKey string
 * FormKey formats:
 * - "('IN25400004','D','A')" -> "IN25400004"
 * - "(IVNUM='IN25400004',IVTYPE='A')" -> "IN25400004"
 *
 * @param formKey - The FormKey string
 * @returns The extracted document number or undefined
 */
export function extractDocNoFromFormKey(formKey: string): string | undefined {
  if (!formKey) {
    return undefined;
  }

  // Try format: ('VALUE1','VALUE2',...)
  // Extract first quoted value
  const simpleMatch = formKey.match(/^\(?\s*'([^']+)'/);
  if (simpleMatch) {
    return simpleMatch[1];
  }

  // Try format: (FIELD='VALUE',...)
  // Extract first value after equals sign
  const keyValueMatch = formKey.match(/^\(?\s*\w+\s*=\s*'([^']+)'/);
  if (keyValueMatch) {
    return keyValueMatch[1];
  }

  return undefined;
}

/**
 * Check if a query string looks like a Priority deep link
 * (contains semicolons and starts with '[')
 */
export function isDeepLinkFormat(queryString: string): boolean {
  if (!queryString) {
    return false;
  }
  // Deep links start with '[' and contain semicolons
  return queryString.startsWith('[') && queryString.includes(';');
}
