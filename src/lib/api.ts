import axios, { type AxiosError } from "axios";
import { toast } from "sonner";

export const TOKEN_KEY = "bss_pos_token";

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string[]> | undefined;
  code?: string | undefined;
  constructor(status: number, message: string, errors?: Record<string, string[]>, code?: string) {
    super(message);
    this.status = status;
    this.errors = errors;
    this.code = code;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

// VITE_API_URL vide → requêtes relatives → proxy Vite ajoute le Host tenant
export const API_URL =
  (import.meta.env["VITE_API_URL"] as string | undefined) ?? "";

export const api = axios.create({
  baseURL: API_URL,
  headers: { Accept: "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (err: AxiosError<{ message?: string; errors?: Record<string, string[]>; code?: string }>) => {
    const status = err.response?.status ?? 0;

    if (status === 401) {
      setToken(null);
      if (typeof window !== "undefined") window.location.assign("/connexion");
      return Promise.reject(new ApiError(401, "Session expirée"));
    }

    if (status === 422) {
      const errors = err.response?.data?.errors;
      const code = err.response?.data?.code;
      // Not every 422 is a field-validation failure (e.g. a wrong-current-password
      // check returns {code, message} with no `errors` record) — keep the
      // backend's own message and code so callers can distinguish the two.
      return Promise.reject(
        new ApiError(422, err.response?.data?.message ?? "Validation échouée", errors, code),
      );
    }

    if (status >= 500) {
      toast.error("Erreur serveur.", { duration: 6000 });
      return Promise.reject(new ApiError(status, "Erreur serveur"));
    }

    const message = err.response?.data?.message ?? err.message ?? "Requête échouée";
    return Promise.reject(new ApiError(status, message));
  },
);

type RequestOptions = {
  method?: string;
  body?: unknown;
  params?: Record<string, string | number | undefined>;
};

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const filteredParams: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(options.params ?? {})) {
    if (v !== undefined && v !== "") filteredParams[k] = v;
  }

  const res = await api.request<T>({
    url: path,
    method: options.method ?? "GET",
    params: Object.keys(filteredParams).length ? filteredParams : undefined,
    data: options.body,
  });

  return res.data;
}

export async function fetchOrDemo<T>(
  path: string,
  fallback: T,
  params?: Record<string, string | number | undefined>,
): Promise<T> {
  try {
    const payload = await request<{ data: T }>(path, params ? { params } : {});
    return payload.data;
  } catch {
    return fallback;
  }
}

export async function fetchOrDemoAdapted<TBackend, TFrontend>(
  path: string,
  fallback: TFrontend,
  adapter: (raw: TBackend) => TFrontend,
  params?: Record<string, string | number | undefined>,
): Promise<TFrontend> {
  try {
    const payload = await request<{ data: TBackend }>(path, params ? { params } : {});
    return adapter(payload.data);
  } catch {
    return fallback;
  }
}
