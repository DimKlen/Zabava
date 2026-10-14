import { config } from './config';
import { supabase } from './supabase';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Query = Record<string, string | number | boolean | undefined>;

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Query;
  /** Annulation (TanStack Query passe le sien : requête abandonnée si la clé change). */
  signal?: AbortSignal;
};

let onUnauthorized: () => void | Promise<void> = () => undefined;

/** Action après un 401 suivi d'un échec de rafraîchissement (session.ts : retour à /login). */
export function setUnauthorizedHandler(handler: () => void | Promise<void>): void {
  onUnauthorized = handler;
}

/**
 * Appel de l'API Zabava (`/api/v1…`) avec le JWT Supabase.
 * Un 401 déclenche un rafraîchissement de session et un seul nouvel essai.
 */
export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  let response = await send(path, options, await currentToken());

  if (response.status === 401) {
    const token = await refreshedToken();
    if (token) response = await send(path, options, token);
    if (!token || response.status === 401) {
      await onUnauthorized();
      throw new ApiError(401, 'Session expirée');
    }
  }

  if (!response.ok) throw new ApiError(response.status, `${options.method ?? 'GET'} ${path}`);
  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Au-delà, la requête échoue : l'écran affiche « Impossible de charger » au lieu d'attendre. */
export const REQUEST_TIMEOUT_MS = 15_000;

/** Serveur injoignable dans le délai (réseau sans Internet, serveur arrêté). */
export class TimeoutError extends Error {
  constructor(path: string) {
    super(`Délai dépassé : ${path}`);
    this.name = 'TimeoutError';
  }
}

async function send(
  path: string,
  { method = 'GET', body, query, signal }: RequestOptions,
  token?: string,
) {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  // Un seul signal pour fetch : l'annulation de l'appelant ou le délai dépassé.
  const controller = new AbortController();
  const cancel = () => controller.abort();
  if (signal?.aborted) cancel();
  signal?.addEventListener('abort', cancel);
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    cancel();
  }, REQUEST_TIMEOUT_MS);

  try {
    return await fetch(`${config.apiUrl}/api/v1${path}${queryString(query)}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (error) {
    throw timedOut ? new TimeoutError(path) : error;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

function queryString(query?: Query): string {
  if (!query) return '';
  const parts = Object.entries(query)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
  return parts.length ? `?${parts.join('&')}` : '';
}

async function currentToken(): Promise<string | undefined> {
  const { data } = await supabase().auth.getSession();
  return data.session?.access_token;
}

async function refreshedToken(): Promise<string | undefined> {
  const { data, error } = await supabase().auth.refreshSession();
  return error ? undefined : data.session?.access_token;
}
