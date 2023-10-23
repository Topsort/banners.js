interface ImportMetaEnv {
  readonly PACKAGE_VERSION: string;
  readonly DEV: boolean;
  readonly MODE: string;
  readonly PROD: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
