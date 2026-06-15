import { supabase } from "./supabase";

interface ApiErrorPayload {
  error?: {
    code?: string;
    message?: string;
    fields?: Record<string, string[]>;
  };
}

export class ClientApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: string,
    public readonly fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}

async function clearInvalidSession() {
  if (!supabase) {
    return;
  }
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!supabase) {
    throw new ClientApiError(
      "Supabase is not configured.",
      503,
      "SUPABASE_NOT_CONFIGURED",
    );
  }

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) {
    await clearInvalidSession();
    throw new ClientApiError(
      "Your session has expired. Sign in again.",
      401,
      "UNAUTHENTICATED",
    );
  }

  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session.access_token}`,
      ...options.headers,
    },
  });
  const payload = (await response.json().catch(() => ({}))) as
    | ApiErrorPayload
    | T;

  if (!response.ok) {
    const errorPayload = payload as ApiErrorPayload;
    const apiError = new ClientApiError(
      errorPayload.error?.message ?? "The request failed.",
      response.status,
      errorPayload.error?.code ?? "REQUEST_FAILED",
      errorPayload.error?.fields,
    );
    if (response.status === 401) {
      await clearInvalidSession();
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("propiq:api-error", { detail: apiError.message }),
      );
    }
    throw apiError;
  }

  return payload as T;
}
