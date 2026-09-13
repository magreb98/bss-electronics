import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { request, ApiError } from "@/lib/api";
import { adaptCashSession } from "@/lib/adapters";
import type { BackendCashSession, CashSession } from "@/lib/types";

const SESSION_KEY = "bss_pos_cash_session";
const REGISTER_KEY = "bss_pos_cash_register_id";

type OpenInput = {
  cash_register_id: string;
  opening_balance: number;
};

export interface CashClosingReport {
  id: string;
  opening_balance: number;
  cash_sales: number;
  mobile_money_sales: number;
  expenses: number;
  expected_cash: number;
  declared_cash: number;
  discrepancy: number;
}

type Ctx = {
  session: CashSession | null;
  ready: boolean;
  open: (input: OpenInput) => Promise<CashSession>;
  close: (closing_balance?: number) => void;
  closeWithReport: (declared_cash: number) => Promise<CashClosingReport>;
};

const CashSessionContext = createContext<Ctx | null>(null);

export function CashSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<CashSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const local = window.localStorage.getItem(SESSION_KEY);
    if (local) {
      try {
        setSession(JSON.parse(local) as CashSession);
      } catch {
        /* ignore */
      }
    }

    const registerId = window.localStorage.getItem(REGISTER_KEY);

    if (registerId) {
      request<{ data: BackendCashSession }>("/commerce/cash-sessions/active", {
        params: { cash_register_id: registerId },
      })
        .then((p) => {
          if (cancelled) return;
          const adapted = adaptCashSession(p.data);
          setSession(adapted);
          window.localStorage.setItem(SESSION_KEY, JSON.stringify(adapted));
        })
        .catch(() => undefined)
        .finally(() => !cancelled && setReady(true));
    } else {
      setReady(true);
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const open = useCallback(async (input: OpenInput): Promise<CashSession> => {
    let created: CashSession;
    try {
      const payload = await request<{ data: BackendCashSession }>("/commerce/cash-sessions", {
        method: "POST",
        body: {
          cash_register_id: input.cash_register_id,
          opening_balance: input.opening_balance,
        },
      });
      created = adaptCashSession(payload.data);
    } catch (err: unknown) {
      // Le backend a répondu (ex : 409 session déjà ouverte sur cette caisse,
      // 422 fond de caisse invalide) — ce n'est pas une simple indisponibilité
      // réseau, il ne faut pas fabriquer une session locale qui masquerait
      // l'erreur réelle et ferait croire à une ouverture réussie.
      if (err instanceof ApiError && err.status !== 0) {
        throw err;
      }

      // Aucun backend joignable : mode démo, session locale de secours.
      created = {
        id: String(Date.now()),
        cash_register_id: input.cash_register_id,
        cash_register: input.cash_register_id,
        opening_balance: input.opening_balance,
        opened_at: new Date().toISOString(),
        opened_by: "demo",
      };
    }
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(created));
    window.localStorage.setItem(REGISTER_KEY, input.cash_register_id);
    setSession(created);
    return created;
  }, []);

  const close = useCallback((closing_balance = 0) => {
    setSession((current) => {
      if (current) {
        void request(`/commerce/cash-sessions/${current.id}/close`, {
          method: "PATCH",
          body: { closing_balance },
        }).catch(() => undefined);
      }
      return null;
    });
    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(REGISTER_KEY);
  }, []);

  const closeWithReport = useCallback(async (declared_cash: number): Promise<CashClosingReport> => {
    const current = session;
    if (!current) throw new Error("Aucune session active");

    const payload = await request<{ data: CashClosingReport }>(
      `/commerce/cash-sessions/${current.id}/closing`,
      { method: "POST", body: { declared_cash } },
    );

    setSession(null);
    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(REGISTER_KEY);

    return payload.data;
  }, [session]);

  const value = useMemo(
    () => ({ session, ready, open, close, closeWithReport }),
    [session, ready, open, close, closeWithReport],
  );

  return <CashSessionContext.Provider value={value}>{children}</CashSessionContext.Provider>;
}

export function useCashSession() {
  const ctx = useContext(CashSessionContext);
  if (!ctx) throw new Error("useCashSession doit être utilisé dans CashSessionProvider");
  return ctx;
}
