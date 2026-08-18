import { cn } from "@/lib/utils";

export const STATUSES = ["pending", "approved", "implemented", "rejected"] as const;
export type KaizenStatus = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<KaizenStatus, string> = {
  pending: "Pending Review",
  approved: "Approved",
  implemented: "Implemented",
  rejected: "Rejected",
};

const STATUS_CLASS: Record<KaizenStatus, string> = {
  pending: "bg-warning text-warning-foreground",
  approved: "bg-info text-info-foreground",
  implemented: "bg-success text-success-foreground",
  rejected: "bg-destructive text-destructive-foreground",
};

export function StatusBadge({ status }: { status: string }) {
  const key = (STATUSES as readonly string[]).includes(status) ? (status as KaizenStatus) : "pending";
  return (
    <span
      className={cn(
        "inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold",
        STATUS_CLASS[key],
      )}
    >
      {STATUS_LABEL[key]}
    </span>
  );
}
