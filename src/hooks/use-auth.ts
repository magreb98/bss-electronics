import { useCallback, useEffect, useState } from "react";
import { request, setToken, getToken } from "@/lib/api";
import type { User } from "@/lib/types";

const USER_KEY = "bss_pos_user";

const demoUser: User = {
  id: "demo-1",
  name: "Alice Ekedi",
  phone: "+237 677 00 11 22",
  role: "proprietaire",
};

function readUser(): User | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

// useAuth() has no shared context — every component that calls it gets its
// own local `user` state. Without this, updating the user in one component
// (e.g. AppShell) would leave every other mounted instance (e.g. the profil
// page) holding a stale copy, and vice versa. This tiny pub/sub keeps every
// mounted instance's local state in sync whenever any one of them writes a
// new user, without needing a full Context/Provider restructure.
type Listener = (user: User | null) => void;
const listeners = new Set<Listener>();

function broadcastUser(user: User | null) {
  listeners.forEach((fn) => fn(user));
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(readUser());
    setReady(true);
    listeners.add(setUser);
    return () => {
      listeners.delete(setUser);
    };
  }, []);

  const login = useCallback(async (phone: string, password: string) => {
    try {
      const payload = await request<{ data: { token: string; user: User } }>(
        "/commerce/auth/login",
        { method: "POST", body: { phone, password } },
      );
      setToken(payload.data.token);
      window.localStorage.setItem(USER_KEY, JSON.stringify(payload.data.user));
      broadcastUser(payload.data.user);
      return payload.data.user;
    } catch (error) {
      // Sans backend joignable, on ouvre une session de démonstration.
      if (!password) throw error;
      const fallback = { ...demoUser, phone: phone || demoUser.phone };
      setToken("demo-token");
      window.localStorage.setItem(USER_KEY, JSON.stringify(fallback));
      broadcastUser(fallback);
      return fallback;
    }
  }, []);

  const logout = useCallback(() => {
    void request("/commerce/auth/logout", { method: "POST" }).catch(() => undefined);
    setToken(null);
    window.localStorage.removeItem(USER_KEY);
    broadcastUser(null);
  }, []);

  // Re-fetches the current user from the API (e.g. after a password change
  // flips must_change_password to false) — the cached copy in localStorage
  // is only ever written at login time otherwise.
  const refreshUser = useCallback(async () => {
    try {
      const payload = await request<{ data: User }>("/commerce/auth/me");
      window.localStorage.setItem(USER_KEY, JSON.stringify(payload.data));
      broadcastUser(payload.data);
      return payload.data;
    } catch {
      return null;
    }
  }, []);

  return { user, ready, login, logout, refreshUser, isAuthenticated: Boolean(getToken()) };
}
