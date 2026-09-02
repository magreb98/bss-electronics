import { toast } from "sonner";

export const API_URL = (import.meta.env["VITE_API_URL"] as string | undefined) ?? "";
export const TOKEN_KEY = "bss_pos_token";

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]>;
  constructor(status: number, message: string, errors?: Record<string, string[]>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

export function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

type Options = {
  method?: string;
  body?: unknown;
  params?: Record<string, string | number | undefined>;
};

/**
 * Appelle le backend BSS. En l'absence de backend joignable, `request`
 * rejette et les hooks de données basculent sur les données de démonstration.
 */
export async function request<T>(path: string, options: Options = {}): Promise<T> {
  if (!API_URL) throw new ApiError(0, "API non configurée");

  const url = new URL(path, API_URL);
  for (const [k, v] of Object.entries(options.params ?? {})) {
    if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  }

  const token = getToken();
  const res = await fetch(url.toString(), {
    method: options.method ?? "GET",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (res.status === 401) {
    setToken(null);
    if (typeof window !== "undefined") window.location.assign("/connexion");
    throw new ApiError(401, "Session expirée");
  }

  if (res.status === 422) {
    const payload = (await res.json().catch(() => ({}))) as { errors?: Record<string, string[]> };
    throw new ApiError(422, "Validation échouée", payload.errors);
  }

  if (res.status >= 500) {
    toast.error("Erreur serveur.", { duration: 6000 });
    throw new ApiError(res.status, "Erreur serveur");
  }

  if (!res.ok) {
    const payload = (await res.json().catch(() => ({}))) as { message?: string };
    throw new ApiError(res.status, payload.message ?? "Requête échouée");
  }

  return (await res.json()) as T;
}

/** Récupère `path` et retombe sur les données de démo si le backend est absent. */
export async function fetchOrDemo<T>(
  path: string,
  fallback: T,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  try {
    const payload = await request<{ data: T }>(path, { params });
    return payload.data;
  } catch {
    return fallback;
  }
}
