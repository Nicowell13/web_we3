const PRODUCTION_ORIGIN = 'https://wetri.shop';

export function getApiBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim().replace(/\/$/, '');
  if (configured) return configured;
  return typeof window === 'undefined' ? PRODUCTION_ORIGIN : '';
}

export const SITE_URL = PRODUCTION_ORIGIN;
