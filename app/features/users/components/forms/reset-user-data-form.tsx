import type { Route } from "@rr/app/features/users/api/+types/reset-user-data";

import { DatabaseZapIcon, Loader2Icon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFetcher } from "react-router";

import ConfirmDialog from "~/core/components/confirm-dialog";
import FormErrors from "~/core/components/form-error";
import FormSuccess from "~/core/components/form-success";
import { Button } from "~/core/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/core/components/ui/card";
import { Input } from "~/core/components/ui/input";
import { Label } from "~/core/components/ui/label";

export default function ResetUserDataForm() {
  const fetcher = useFetcher<Route.ComponentProps["actionData"]>();
  const formRef = useRef<HTMLFormElement>(null);
  const [confirmation, setConfirmation] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const isSubmitting = fetcher.state !== "idle";

  useEffect(() => {
    if (fetcher.data && "success" in fetcher.data && fetcher.data.success) {
      formRef.current?.reset();
      setConfirmation("");
    }
  }, [fetcher.data]);

  return (
    <Card className="w-full max-w-screen-md border-red-500/35 bg-red-500/[0.04]">
      <CardHeader>
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-red-500/10 text-red-500">
            <DatabaseZapIcon className="size-5" />
          </span>
          <div className="space-y-1">
            <CardTitle>모든 분석과 기록 정보 지우기</CardTitle>
            <CardDescription>
              계정은 유지하고 포트폴리오, 매매일지, 분석 기록과 알림을 모두
              초기화해요.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <fetcher.Form
        ref={formRef}
        method="delete"
        action="/api/users/data"
        onSubmit={(event) => {
          event.preventDefault();
          setConfirmOpen(true);
        }}
      >
        <CardContent className="space-y-3">
          <Label htmlFor="reset-confirmation">
            계속하려면 <strong>RESET</strong>을 입력해 주세요.
          </Label>
          <Input
            id="reset-confirmation"
            name="confirmation"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            placeholder="RESET"
          />
        </CardContent>
        <CardFooter className="flex flex-col gap-4 pt-6">
          <Button
            type="submit"
            variant="destructive"
            className="w-full"
            disabled={confirmation !== "RESET" || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2Icon className="size-4 animate-spin" />
                정보를 초기화하고 있어요
              </>
            ) : (
              "모든 분석과 기록 정보 지우기"
            )}
          </Button>
          {fetcher.data && "success" in fetcher.data && fetcher.data.success ? (
            <FormSuccess message="분석과 기록 정보를 모두 초기화했어요." />
          ) : null}
          {fetcher.data && "error" in fetcher.data && fetcher.data.error ? (
            <FormErrors errors={[fetcher.data.error]} />
          ) : null}
        </CardFooter>
      </fetcher.Form>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="모든 분석과 기록을 지울까요?"
        description="포트폴리오, 매매일지, 분석 기록과 알림이 모두 삭제되며 복구할 수 없어요. 계정과 결제 내역은 유지됩니다."
        confirmLabel="모든 정보 지우기"
        destructive
        busy={isSubmitting}
        onConfirm={() => {
          if (!formRef.current) return;
          setConfirmOpen(false);
          void fetcher.submit(formRef.current, {
            method: "delete",
            action: "/api/users/data",
          });
        }}
      />
    </Card>
  );
}
