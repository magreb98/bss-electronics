import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Printer, Search, ShoppingCart, Smartphone, Trash2, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { fetchOrDemo } from "@/lib/api";
import { demoCustomers, demoFamilies, demoPaymentMethods, demoProducts, demoSerialUnits } from "@/lib/demo";
import { formatXAF } from "@/lib/format";
import { useCashSession } from "@/hooks/use-cash-session";
import type { CartLine, Customer, PaymentMethod, Product, SerialUnit } from "@/lib/types";

export const Route = createFileRoute("/_auth/pos/")({
  head: () => ({
    meta: [
      { title: "Point de vente — BSS POS" },
      {
        name: "description",
        content:
          "Encaissez smartphones, tablettes et accessoires : panier tactile, IMEI, multi-paiement.",
      },
      { property: "og:title", content: "Point de vente — BSS POS" },
      { property: "og:description", content: "Interface d'encaissement tactile optimisée tablette." },
    ],
  }),
  component: PosPage,
});

const TVA_RATE = 0.1925;

function PosPage() {
  const navigate = useNavigate();
  const { session, ready } = useCashSession();

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [family, setFamily] = useState("all");
  const [lines, setLines] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState("comptoir");
  const [coupon, setCoupon] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [serialTarget, setSerialTarget] = useState<Product | null>(null);
  const [payments, setPayments] = useState<{ method: string; amount: number }[]>([
    { method: "especes", amount: 0 },
  ]);

  useEffect(() => {
    if (ready && !session) void navigate({ to: "/pos/ouvrir" });
  }, [ready, session, navigate]);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", debounced],
    queryFn: () => fetchOrDemo<Product[]>("/commerce/products", demoProducts, { search: debounced }),
    staleTime: 30_000,
  });

  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: () => fetchOrDemo<Customer[]>("/commerce/customers", demoCustomers),
    staleTime: 30_000,
  });

  const { data: methods } = useQuery({
    queryKey: ["payment-methods"],
    queryFn: () => fetchOrDemo<PaymentMethod[]>("/commerce/payment-methods", demoPaymentMethods),
    staleTime: 60_000,
  });

  const { data: serials } = useQuery({
    queryKey: ["serial-units", serialTarget?.id],
    enabled: Boolean(serialTarget),
    queryFn: () =>
      fetchOrDemo<SerialUnit[]>(
        "/electronics/serial-units",
        demoSerialUnits.filter(
          (u) => u.product_id === serialTarget?.id && u.status === "disponible",
        ),
        { product_id: serialTarget?.id, status: "disponible" },
      ),
  });

  const visible = useMemo(() => {
    const list = products ?? [];
    return list.filter((p) => {
      const matchesSearch =
        !debounced ||
        p.name.toLowerCase().includes(debounced.toLowerCase()) ||
        p.sku.toLowerCase().includes(debounced.toLowerCase());
      const matchesFamily = family === "all" || p.family === family;
      return matchesSearch && matchesFamily;
    });
  }, [products, debounced, family]);

  const subtotal = lines.reduce(
    (sum, l) => sum + Math.trunc((l.product.price * l.qty * (100 - l.discount)) / 100),
    0,
  );
  const discounted = Math.max(0, subtotal - couponDiscount);
  const tva = Math.trunc(discounted - discounted / (1 + TVA_RATE));
  const total = discounted;
  const paid = payments.reduce((sum, p) => sum + (Number.isFinite(p.amount) ? p.amount : 0), 0);
  const change = paid - total;

  const addProduct = (product: Product, serial?: SerialUnit) => {
    // D4 : une vente n'est jamais bloquée pour stock insuffisant.
    setLines((current) => {
      if (!product.has_serial) {
        const existing = current.find((l) => l.product.id === product.id && !l.serial);
        if (existing) {
          return current.map((l) => (l === existing ? { ...l, qty: l.qty + 1 } : l));
        }
      }
      return [
        ...current,
        {
          key: `${product.id}-${serial?.id ?? Date.now()}`,
          product,
          qty: 1,
          discount: 0,
          serial,
        },
      ];
    });
  };

  const onProductClick = (product: Product) => {
    if (product.has_serial) {
      setSerialTarget(product);
      return;
    }
    addProduct(product);
  };

  const updateQty = (key: string, delta: number) =>
    setLines((current) =>
      current
        .map((l) => (l.key === key ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0),
    );

  const setDiscount = (key: string, discount: number) =>
    setLines((current) =>
      current.map((l) =>
        l.key === key ? { ...l, discount: Math.min(100, Math.max(0, Math.trunc(discount))) } : l,
      ),
    );

  const removeLine = (key: string) => setLines((c) => c.filter((l) => l.key !== key));

  const applyCoupon = () => {
    if (!coupon.trim()) return;
    // GET /commerce/promotions/validate-coupon
    const value = Math.trunc(subtotal * 0.05);
    setCouponDiscount(value);
    toast.success(`Coupon appliqué : −${formatXAF(value)}`);
  };

  const finalize = () => {
    setPaymentOpen(false);
    setReceiptOpen(true);
  };

  const newSale = () => {
    setLines([]);
    setCoupon("");
    setCouponDiscount(0);
    setCustomerId("comptoir");
    setPayments([{ method: "especes", amount: 0 }]);
    setReceiptOpen(false);
  };

  return (
    <div className="grid min-h-[calc(100vh-4rem)] grid-cols-1 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      {/* Colonne produits */}
      <section className="flex flex-col gap-4 border-r border-border p-4 sm:p-6">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_200px]">
          <div className="relative">
            <Search
              className="absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un produit, un SKU…"
              aria-label="Rechercher un produit"
              className="min-h-[44px] rounded-[10px] pl-10 text-[15px]"
            />
          </div>
          <Select value={family} onValueChange={setFamily}>
            <SelectTrigger className="min-h-[44px] rounded-[10px]" aria-label="Filtrer par famille">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="min-h-[44px]">
                Toutes les familles
              </SelectItem>
              {demoFamilies.map((f) => (
                <SelectItem key={f} value={f} className="min-h-[44px]">
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-[150px] rounded-[16px]" />
              ))
            : visible.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => onProductClick(product)}
                  className="flex min-h-[150px] cursor-pointer flex-col justify-between rounded-[16px] border border-border bg-card p-4 text-left transition-colors duration-150 hover:bg-accent focus-visible:outline-2"
                >
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-[15px] leading-snug font-medium">
                      {product.name}
                    </p>
                    <p className="mono mt-1 text-[12px] text-muted-foreground">{product.sku}</p>
                  </div>
                  <div className="mt-3 flex items-end justify-between gap-2">
                    <span className="tabular text-[15px] font-semibold">
                      {formatXAF(product.price)}
                    </span>
                    <Badge
                      className={cn(
                        "border-transparent text-[11px] font-semibold",
                        product.stock === 0
                          ? "bg-destructive/15 text-destructive"
                          : product.stock <= product.min_stock
                            ? "bg-warning/20 text-foreground"
                            : "bg-success/15 text-foreground",
                      )}
                    >
                      {product.stock === 0 ? "Stock 0" : `${product.stock} en stock`}
                    </Badge>
                  </div>
                </button>
              ))}
        </div>
      </section>

      {/* Colonne panier */}
      <aside className="flex flex-col bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border p-4">
          <h2 className="text-[17px] font-semibold">Panier</h2>
          <Button
            variant="ghost"
            className="min-h-[44px] rounded-[10px] text-[13px] text-muted-foreground"
            onClick={newSale}
            disabled={lines.length === 0}
          >
            Vider
          </Button>
        </div>

        <div className="flex flex-col gap-2 border-b border-border p-4">
          <label className="text-[12px] text-muted-foreground" htmlFor="pos-customer">
            Client
          </label>
          <Select value={customerId} onValueChange={setCustomerId}>
            <SelectTrigger id="pos-customer" className="min-h-[44px] rounded-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="comptoir" className="min-h-[44px]">
                Client comptoir
              </SelectItem>
              {(customers ?? []).map((c) => (
                <SelectItem key={c.id} value={String(c.id)} className="min-h-[44px]">
                  {c.name} — {c.phone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {lines.length === 0 ? (
            <div className="flex h-full min-h-[200px] flex-col items-center justify-center gap-2 text-center">
              <ShoppingCart className="size-8 text-muted-foreground" aria-hidden />
              <p className="text-[15px] text-muted-foreground">
                Touchez un produit pour l'ajouter au panier.
              </p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {lines.map((line) => (
                <li key={line.key} className="rounded-[12px] border border-border p-3">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] font-medium">{line.product.name}</p>
                      {line.serial ? (
                        <p className="mono text-[12px] text-muted-foreground">
                          IMEI {line.serial.imei}
                        </p>
                      ) : null}
                      {line.product.stock <= 0 ? (
                        <Badge className="mt-1 border-transparent bg-warning/20 text-[11px] font-semibold text-foreground">
                          Stock faible
                        </Badge>
                      ) : null}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Retirer ${line.product.name}`}
                      className="min-h-[44px] min-w-[44px] text-muted-foreground hover:text-destructive"
                      onClick={() => removeLine(line.key)}
                    >
                      <Trash2 className="size-[18px]" aria-hidden />
                    </Button>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Diminuer la quantité"
                        className="min-h-[44px] min-w-[44px] rounded-[10px]"
                        onClick={() => updateQty(line.key, -1)}
                      >
                        <Minus className="size-4" aria-hidden />
                      </Button>
                      <span className="tabular w-8 text-center text-[15px] font-semibold">
                        {line.qty}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        aria-label="Augmenter la quantité"
                        className="min-h-[44px] min-w-[44px] rounded-[10px]"
                        onClick={() => updateQty(line.key, 1)}
                        disabled={Boolean(line.serial)}
                      >
                        <Plus className="size-4" aria-hidden />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <label
                        className="text-[12px] text-muted-foreground"
                        htmlFor={`remise-${line.key}`}
                      >
                        Remise %
                      </label>
                      <Input
                        id={`remise-${line.key}`}
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={line.discount}
                        onChange={(e) => setDiscount(line.key, e.target.valueAsNumber || 0)}
                        className="tabular h-11 w-[76px] rounded-[10px]"
                      />
                    </div>
                    <span className="tabular ml-auto text-[15px] font-semibold">
                      {formatXAF(
                        Math.trunc((line.product.price * line.qty * (100 - line.discount)) / 100),
                      )}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-border p-4">
          <div className="flex gap-2">
            <Input
              value={coupon}
              onChange={(e) => setCoupon(e.target.value)}
              placeholder="Code promo"
              aria-label="Code promo"
              className="min-h-[44px] rounded-[10px]"
            />
            <Button
              variant="outline"
              className="min-h-[44px] rounded-[10px]"
              onClick={applyCoupon}
              disabled={lines.length === 0}
            >
              Appliquer
            </Button>
          </div>

          <dl className="flex flex-col gap-1 text-[15px]">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Sous-total</dt>
              <dd className="tabular">{formatXAF(subtotal)}</dd>
            </div>
            {couponDiscount > 0 ? (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Remise coupon</dt>
                <dd className="tabular text-success">−{formatXAF(couponDiscount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">TVA incluse (19,25 %)</dt>
              <dd className="tabular">{formatXAF(tva)}</dd>
            </div>
            <div className="mt-1 flex items-baseline justify-between border-t border-border pt-2">
              <dt className="text-[15px] font-medium">Total</dt>
              <dd className="tabular text-[28px] leading-none font-bold tracking-tight">
                {formatXAF(total)}
              </dd>
            </div>
          </dl>

          <Button
            className="min-h-[52px] w-full rounded-[10px] text-[17px] font-medium"
            disabled={lines.length === 0}
            onClick={() => {
              setPayments([{ method: "especes", amount: total }]);
              setPaymentOpen(true);
            }}
          >
            Encaisser
          </Button>
        </div>
      </aside>

      {/* Sélection IMEI */}
      <Dialog open={Boolean(serialTarget)} onOpenChange={(o) => !o && setSerialTarget(null)}>
        <DialogContent className="rounded-[16px] sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Sélection de l'IMEI</DialogTitle>
            <DialogDescription>
              {serialTarget?.name} nécessite une unité sérialisée avant l'ajout au panier.
            </DialogDescription>
          </DialogHeader>
          <ul className="flex max-h-[320px] flex-col gap-2 overflow-y-auto">
            {(serials ?? []).map((unit) => (
              <li key={unit.id}>
                <button
                  type="button"
                  className="flex min-h-[44px] w-full cursor-pointer items-center justify-between gap-3 rounded-[10px] border border-border px-3 py-2 text-left transition-colors duration-150 hover:bg-accent"
                  onClick={() => {
                    if (serialTarget) addProduct(serialTarget, unit);
                    setSerialTarget(null);
                  }}
                >
                  <span className="mono text-[13px]">{unit.imei}</span>
                  <Smartphone className="size-4 text-muted-foreground" aria-hidden />
                </button>
              </li>
            ))}
            {(serials ?? []).length === 0 ? (
              <li className="text-[15px] text-muted-foreground">
                Aucune unité disponible pour ce produit.
              </li>
            ) : null}
          </ul>
        </DialogContent>
      </Dialog>

      {/* Sheet paiement */}
      <Sheet open={paymentOpen} onOpenChange={setPaymentOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 sm:max-w-[440px]">
          <SheetHeader>
            <SheetTitle>Encaissement</SheetTitle>
            <SheetDescription>
              Répartissez le règlement entre un ou plusieurs modes de paiement.
            </SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4">
            {payments.map((payment, index) => (
              <div key={index} className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Select
                    value={payment.method}
                    onValueChange={(v) =>
                      setPayments((c) => c.map((p, i) => (i === index ? { ...p, method: v } : p)))
                    }
                  >
                    <SelectTrigger className="min-h-[44px] rounded-[10px]" aria-label="Mode de paiement">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(methods ?? demoPaymentMethods).map((m) => (
                        <SelectItem key={m.id} value={m.code} className="min-h-[44px]">
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    step="1"
                    min="0"
                    inputMode="numeric"
                    aria-label="Montant"
                    value={payment.amount}
                    onChange={(e) =>
                      setPayments((c) =>
                        c.map((p, i) =>
                          i === index ? { ...p, amount: Math.trunc(e.target.valueAsNumber || 0) } : p,
                        ),
                      )
                    }
                    className="tabular min-h-[44px] rounded-[10px]"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Retirer ce paiement"
                  className="min-h-[44px] min-w-[44px]"
                  disabled={payments.length === 1}
                  onClick={() => setPayments((c) => c.filter((_, i) => i !== index))}
                >
                  <X className="size-4" aria-hidden />
                </Button>
              </div>
            ))}
            <Button
              variant="outline"
              className="min-h-[44px] rounded-[10px]"
              onClick={() => setPayments((c) => [...c, { method: "mobile_money", amount: 0 }])}
            >
              <Plus className="size-4" aria-hidden />
              Ajouter un mode de paiement
            </Button>

            <Card className="gap-0 rounded-[12px] border-border p-4 shadow-none">
              <dl className="flex flex-col gap-1 text-[15px]">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Total à régler</dt>
                  <dd className="tabular font-semibold">{formatXAF(total)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Encaissé</dt>
                  <dd className="tabular">{formatXAF(paid)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">
                    {change >= 0 ? "Monnaie à rendre" : "Reste à payer"}
                  </dt>
                  <dd className={cn("tabular font-semibold", change < 0 && "text-destructive")}>
                    {formatXAF(Math.abs(change))}
                  </dd>
                </div>
              </dl>
            </Card>
          </div>

          <div className="border-t border-border p-4">
            <Button
              className="min-h-[52px] w-full rounded-[10px] text-[17px] font-medium"
              disabled={paid < total}
              onClick={finalize}
            >
              Valider le paiement
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Reçu */}
      <Dialog open={receiptOpen} onOpenChange={setReceiptOpen}>
        <DialogContent className="rounded-[16px] sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle>Vente enregistrée</DialogTitle>
            <DialogDescription>
              Total encaissé {formatXAF(total)} · monnaie {formatXAF(Math.max(0, change))}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-between">
            <Button
              variant="outline"
              className="min-h-[44px] flex-1 rounded-[10px]"
              onClick={() => window.print()}
            >
              <Printer className="size-4" aria-hidden />
              Imprimer
            </Button>
            <Button className="min-h-[44px] flex-1 rounded-[10px]" onClick={newSale}>
              Nouvelle vente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
