import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { request } from "@/lib/api";
import type { CashSession } from "@/lib/types";

const KEY = "bss_pos_cash_session";

type Ctx = {
  session: CashSession | null;
  ready: boolean;
  open: (input: { cash_register: string; opening_float: number }) => Promise<CashSession>;
  close: () => void;
};

const CashSessionContext = createContext<Ctx | null>(null);

export function CashSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<CashSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const local = window.localStorage.getItem(KEY);
    if (local) {
      try {
        setSession(JSON.parse(local) as CashSession);
      } catch {
        /* ignore */
      }
    }
    request<{ data: CashSession | null }>("/commerce/cash-sessions/active")
      .then((p) => {
        if (cancelled) return;
        setSession(p.data);
        if (p.data) window.localStorage.setItem(KEY, JSON.stringify(p.data));
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const open = useCallback(async (input: { cash_register: string; opening_float: number }) => {
    let created: CashSession;
    try {
      const payload = await request<{ data: CashSession }>("/commerce/cash-sessions", {
        method: "POST",
        body: input,
      });
      created = payload.data;
    } catch {
      created = {
        id: Date.now(),
        cash_register: input.cash_register,
        opening_float: input.opening_float,
        opened_at: new Date().toISOString(),
        user: "Alice Ekedi",
      };
    }
    window.localStorage.setItem(KEY, JSON.stringify(created));
    setSession(created);
    return created;
  }, []);

  const close = useCallback(() => {
    setSession((current) => {
      if (current) {
        void request(`/commerce/cash-sessions/${current.id}/close`, { method: "PATCH" }).catch(
          () => undefined,
        );
      }
      return null;
    });
    window.localStorage.removeItem(KEY);
  }, []);

  const value = useMemo(() => ({ session, ready, open, close }), [session, ready, open, close]);

  return <CashSessionContext.Provider value={value}>{children}</CashSessionContext.Provider>;
}

export function useCashSession() {
  const ctx = useContext(CashSessionContext);
  if (!ctx) throw new Error("useCashSession doit être utilisé dans CashSessionProvider");
  return ctx;
}
