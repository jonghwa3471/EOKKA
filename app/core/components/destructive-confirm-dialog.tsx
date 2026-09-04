import { TriangleAlertIcon } from "lucide-react";
import { type ReactElement, useState } from "react";
import { Form } from "react-router";

import { Button } from "~/core/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/core/components/ui/dialog";

export function DestructiveConfirmDialog({
  trigger,
  title,
  description,
  confirmLabel,
  fields,
}: {
  trigger: ReactElement;
  title: string;
  description: string;
  confirmLabel: string;
  fields: Record<string, string | number>;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="overflow-hidden rounded-3xl border-red-500/20 p-0 sm:max-w-md">
        <div className="border-b border-red-500/15 bg-gradient-to-br from-red-500/12 via-red-500/[0.06] to-transparent p-6">
          <span className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-red-500/15 text-red-500">
            <TriangleAlertIcon className="size-5" />
          </span>
          <DialogHeader>
            <DialogTitle className="text-xl font-black">{title}</DialogTitle>
            <DialogDescription className="mt-2 leading-6 break-keep">
              {description}
            </DialogDescription>
          </DialogHeader>
        </div>
        <DialogFooter className="p-5 pt-1">
          <DialogClose asChild>
            <Button type="button" variant="ghost">
              취소
            </Button>
          </DialogClose>
          <Form method="post" onSubmit={() => setOpen(false)}>
            {Object.entries(fields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <Button type="submit" variant="destructive" className="w-full">
              {confirmLabel}
            </Button>
          </Form>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
