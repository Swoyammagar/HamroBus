declare module "*.png";
declare module "*.jpg";
declare module "*.jpeg";
declare module "*.gif";

declare module "expo-print" {
  export function printToFileAsync(options: {
    html?: string;
    width?: number;
    height?: number;
    base64?: boolean;
  }): Promise<{ uri: string; numberOfPages?: number; base64?: string }>;
}

declare module "expo-sharing" {
  export function isAvailableAsync(): Promise<boolean>;
  export function shareAsync(
    url: string,
    options?: {
      mimeType?: string;
      UTI?: string;
      dialogTitle?: string;
    }
  ): Promise<void>;
}
