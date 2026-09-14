import type { ReactNode } from "react";

import { TriangleAlertIcon } from "lucide-react";

import { Button } from "~/core/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/core/components/ui/dialog";

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  destructive = false,
  busy = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
  busy?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-3xl border-emerald-500/20 p-0 sm:max-w-md">
        <div className="border-b border-emerald-500/15 bg-gradient-to-br from-emerald-500/12 via-violet-500/[0.06] to-transparent p-6">
          <span
            className={`mb-4 flex size-11 items-center justify-center rounded-2xl ${destructive ? "bg-red-500/15 text-red-500" : "bg-emerald-500/15 text-emerald-500"}`}
          >
            <TriangleAlertIcon className="size-5" />
          </span>
          <DialogHeader>
            <DialogTitle className="text-xl font-black">{title}</DialogTitle>
            <DialogDescription asChild>
              <div className="text-muted-foreground mt-2 text-sm leading-6 break-keep">
                {description}
              </div>
            </DialogDescription>
          </DialogHeader>
        </div>
        <DialogFooter className="p-5 pt-1">
          <DialogClose asChild>
            <Button type="button" variant="ghost" disabled={busy}>
              취소
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant={destructive ? "destructive" : "default"}
            disabled={busy}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
