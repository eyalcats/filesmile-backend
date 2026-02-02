/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_SCANNER_SERVICE_URL: string;
  readonly VITE_VINTASOFT_REG_USER: string;
  readonly VITE_VINTASOFT_REG_URL: string;
  readonly VITE_VINTASOFT_REG_CODE: string;
  readonly VITE_VINTASOFT_EXPIRATION: string;
  readonly VITE_BASE_PATH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
