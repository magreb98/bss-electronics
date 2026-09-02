import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
}) {
  return (
    <Card className="gap-0 rounded-[16px] border-border p-5 shadow-none">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
          {label}
        </p>
        <Icon className="size-[18px] shrink-0 text-muted-foreground" aria-hidden />
      </div>
      <p className="tabular mt-3 text-[28px] leading-none font-bold tracking-tight">{value}</p>
      {hint ? <p className="mt-2 text-[12px] text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}
