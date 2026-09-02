import { useCallback, useEffect, useState } from "react";
import { request, setToken, getToken } from "@/lib/api";
import type { User } from "@/lib/types";

const USER_KEY = "bss_pos_user";

const demoUser: User = {
  id: 1,
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

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setUser(readUser());
    setReady(true);
  }, []);

  const login = useCallback(async (phone: string, password: string) => {
    try {
      const payload = await request<{ data: { token: string; user: User } }>(
        "/commerce/auth/login",
        { method: "POST", body: { phone, password } },
      );
      setToken(payload.data.token);
      window.localStorage.setItem(USER_KEY, JSON.stringify(payload.data.user));
      setUser(payload.data.user);
      return payload.data.user;
    } catch (error) {
      // Sans backend joignable, on ouvre une session de démonstration.
      if (!password) throw error;
      const fallback = { ...demoUser, phone: phone || demoUser.phone };
      setToken("demo-token");
      window.localStorage.setItem(USER_KEY, JSON.stringify(fallback));
      setUser(fallback);
      return fallback;
    }
  }, []);

  const logout = useCallback(() => {
    void request("/commerce/auth/logout", { method: "POST" }).catch(() => undefined);
    setToken(null);
    window.localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  return { user, ready, login, logout, isAuthenticated: Boolean(getToken()) };
}
