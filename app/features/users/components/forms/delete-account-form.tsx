import type { Route } from "@rr/app/features/users/api/+types/delete-account";

import { Loader2Icon, UserRoundXIcon } from "lucide-react";
import { useRef, useState } from "react";
import { useFetcher } from "react-router";

import ConfirmDialog from "~/core/components/confirm-dialog";
import FormErrors from "~/core/components/form-error";
import { Button } from "~/core/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/core/components/ui/card";
import { Checkbox } from "~/core/components/ui/checkbox";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";

export default function DeleteAccountForm() {
  const fetcher = useFetcher<Route.ComponentProps["actionData"]>();
  const formRef = useRef<HTMLFormElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const isSubmitting = fetcher.state !== "idle";
  return (
    <Card className="w-full max-w-screen-md border-red-500/35 bg-red-500/[0.04]">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
            <UserRoundXIcon className="size-5" />
          </span>
          <div className="space-y-1">
            <CardTitle>계정 삭제</CardTitle>
            <CardDescription>
              EOKKA 계정과 프로필, 모든 투자 정보를 영구적으로 삭제해요.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <fetcher.Form
        ref={formRef}
        method="delete"
        action="/api/users"
        onSubmit={(event) => {
          event.preventDefault();
          if (!event.currentTarget.checkValidity()) {
            event.currentTarget.reportValidity();
            return;
          }
          setConfirmOpen(true);
        }}
      >
        <CardContent className="space-y-4">
          <Label>
            <Checkbox
              id="confirm-delete"
              name="confirm-delete"
              required
              className="border-black dark:border-white"
            />
            계정을 삭제하겠습니다.
          </Label>
          <Label>
            <Checkbox
              id="confirm-irreversible"
              name="confirm-irreversible"
              required
              className="border-black dark:border-white"
            />
            삭제한 계정과 데이터는 복구할 수 없음을 이해했습니다.
          </Label>
          <div className="space-y-3 pt-2">
            <Label htmlFor="delete-account-confirmation" className="leading-6">
              계속하려면 <strong>DELETE</strong>를 입력해 주세요.
            </Label>
            <Input
              id="delete-account-confirmation"
              name="confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
              placeholder="DELETE"
              className="border-red-500/25"
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 pt-6">
          <Button
            type="submit"
            variant="destructive"
            className="w-full"
            disabled={isSubmitting || confirmation !== "DELETE"}
          >
            {fetcher.state === "submitting" ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                계정을 삭제하고 있어요
              </>
            ) : (
              "계정 삭제"
            )}
          </Button>
          {fetcher.data?.error ? (
            <FormErrors errors={[fetcher.data.error]} />
          ) : null}
        </CardFooter>
      </fetcher.Form>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="EOKKA 계정을 삭제할까요?"
        description="프로필과 모든 투자 정보가 영구적으로 삭제되고 연결된 소셜 로그인도 해제돼요. 이 작업은 복구할 수 없습니다."
        confirmLabel="계정 영구 삭제"
        destructive
        busy={isSubmitting}
        onConfirm={() => {
          if (!formRef.current) return;
          setConfirmOpen(false);
          void fetcher.submit(formRef.current, {
            method: "delete",
            action: "/api/users",
          });
        }}
      />
    </Card>
  );
}
