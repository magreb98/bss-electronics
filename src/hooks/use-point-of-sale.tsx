import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchOrDemo } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";
import type { PointOfSaleFull } from "@/lib/types";

const POS_KEY = "bss_pos_location";

type PointOfSaleCtx = {
  pos: PointOfSaleFull | null;
  posList: PointOfSaleFull[];
  loading: boolean;
  selectPos: (p: PointOfSaleFull) => void;
  selectorOpen: boolean;
  openSelector: () => void;
  closeSelector: () => void;
};

const Ctx = createContext<PointOfSaleCtx | null>(null);

export function PointOfSaleProvider({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const [posList, setPosList] = useState<PointOfSaleFull[]>([]);
  const [pos, setPos] = useState<PointOfSaleFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectorOpen, setSelectorOpen] = useState(false);

  useEffect(() => {
    // useAuth() hydrates `user` from localStorage in its own effect, so on
    // the very first render `user` is still null — wait for `ready` before
    // deciding whether to fetch, otherwise must_change_password reads as
    // falsy for one render and this fires a request that's 403'd anyway.
    if (!ready) return;

    // Every commerce endpoint except me/logout/change-password is blocked
    // by the API while must_change_password is true — skip the request
    // entirely instead of firing one that's guaranteed to 403. Once the
    // password change succeeds, must_change_password flips to false (via
    // the auth pub/sub) and this effect re-runs to fetch normally.
    if (user?.must_change_password) {
      setLoading(false);
      return;
    }

    void fetchOrDemo<PointOfSaleFull[]>("/commerce/points-of-sale", []).then((list) => {
      const active = list.filter((p) => p.active);
      setPosList(active);

      const storedId = localStorage.getItem(POS_KEY);
      const stored = active.find((p) => p.id === storedId) ?? null;

      if (stored) {
        setPos(stored);
      } else if (active.length === 1) {
        setPos(active[0] ?? null);
      } else if (active.length > 1) {
        setSelectorOpen(true);
      }

      setLoading(false);
    });
  }, [ready, user?.must_change_password]);

  const selectPos = useCallback((p: PointOfSaleFull) => {
    setPos(p);
    localStorage.setItem(POS_KEY, p.id);
    setSelectorOpen(false);
  }, []);

  return (
    <Ctx.Provider
      value={{
        pos,
        posList,
        loading,
        selectPos,
        selectorOpen,
        openSelector: () => setSelectorOpen(true),
        closeSelector: () => setSelectorOpen(false),
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function usePointOfSale(): PointOfSaleCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePointOfSale must be used inside PointOfSaleProvider");
  return ctx;
}
