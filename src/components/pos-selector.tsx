import { Building2, CreditCard, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { usePointOfSale } from "@/hooks/use-point-of-sale";
import type { PointOfSaleFull } from "@/lib/types";

export function PosSelector() {
  const { posList, pos, selectPos, selectorOpen, closeSelector } = usePointOfSale();

  const canClose = pos !== null;

  return (
    <Dialog
      open={selectorOpen}
      onOpenChange={(open) => {
        if (!open && canClose) closeSelector();
      }}
    >
      <DialogContent
        className="max-w-lg rounded-[20px] p-0 overflow-hidden"
        onPointerDownOutside={(e) => { if (!canClose) e.preventDefault(); }}
        onEscapeKeyDown={(e) => { if (!canClose) e.preventDefault(); }}
      >
        {/* Header gradient */}
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 pt-6 pb-4 border-b border-border">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="grid size-9 place-items-center rounded-[10px] bg-primary/10">
                <Building2 className="size-5 text-primary" aria-hidden />
              </div>
              <DialogTitle className="text-[18px] font-semibold">
                Choisir une boutique
              </DialogTitle>
            </div>
            <DialogDescription className="text-[13px] text-muted-foreground ml-12">
              {pos
                ? "Sélectionnez la boutique sur laquelle vous travaillez."
                : "Sélectionnez votre boutique pour commencer."}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* POS cards grid */}
        <div className="p-4 grid gap-3 max-h-[60vh] overflow-y-auto">
          {posList.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Aucune boutique disponible. Contactez votre administrateur.
            </div>
          ) : (
            posList.map((p) => <PosCard key={p.id} data={p} selected={pos?.id === p.id} onSelect={selectPos} />)
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function PosCard({
  data,
  selected,
  onSelect,
}: {
  data: PointOfSaleFull;
  selected: boolean;
  onSelect: (p: PointOfSaleFull) => void;
}) {
  const registerCount = data.cash_registers?.length ?? 0;

  return (
    <button
      type="button"
      onClick={() => onSelect(data)}
      className={cn(
        "group relative flex items-center gap-4 rounded-[14px] border px-4 py-3.5 text-left transition-all duration-150 cursor-pointer w-full",
        selected
          ? "border-primary bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary)/0.4)]"
          : "border-border bg-card hover:border-primary/40 hover:bg-accent/50",
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-[10px] transition-colors duration-150",
          selected ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary",
        )}
      >
        <Building2 className="size-5" aria-hidden />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className={cn("truncate text-[15px] font-semibold leading-tight", selected && "text-primary")}>
          {data.name}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[12px] text-muted-foreground">
          <CreditCard className="size-3 shrink-0" aria-hidden />
          {registerCount === 0
            ? "Aucune caisse"
            : registerCount === 1
              ? "1 caisse"
              : `${registerCount} caisses`}
        </p>
      </div>

      {/* Check */}
      {selected && (
        <CheckCircle2 className="size-5 shrink-0 text-primary" aria-hidden />
      )}
    </button>
  );
}
