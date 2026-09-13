import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Workbox } from "workbox-window";

import { syncPendingSales } from "@/lib/offline";
import { request } from "@/lib/api";

export function useOffline() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const wasOffline = useRef(false);

  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      if (wasOffline.current) {
        toast.success("Connexion rétablie — synchronisation en cours…", { duration: 4000 });
        wasOffline.current = false;
        void syncPendingSales((payload) =>
          request("/commerce/sync", { method: "POST", body: payload }),
        ).then(({ synced }) => {
          if (synced > 0) toast.success(`${synced} vente(s) synchronisée(s)`);
        });
      }
    };

    const goOffline = () => {
      setIsOnline(false);
      wasOffline.current = true;
      toast.warning("Connexion perdue — mode hors-ligne activé", {
        duration: Infinity,
        id: "offline-toast",
      });
    };

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return isOnline;
}

export function useRegisterSW() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator) || !import.meta.env.PROD) return;
    const wb = new Workbox("/sw.js");
    void wb.register();
  }, []);
}
