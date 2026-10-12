import { Label } from "~/core/components/ui/label";

export function Field({
  label,
  id,
  children,
}: {
  label: React.ReactNode;
  id: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}
