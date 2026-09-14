import type { Route as ConnectProviderRoute } from "@rr/app/features/users/api/+types/connect-provider";
import type { Route as DisconnectProviderRoute } from "@rr/app/features/users/api/+types/disconnect-provider";

import {
  CheckCircle2Icon,
  Loader2Icon,
  PlugIcon,
  XCircleIcon,
} from "lucide-react";
import { useRef, useState } from "react";
import { useFetcher } from "react-router";

import ConfirmDialog from "~/core/components/confirm-dialog";
import FormErrors from "~/core/components/form-error";
import FormSuccess from "~/core/components/form-success";
import { Button } from "~/core/components/ui/button";

export function ConnectProviderButton({
  provider,
  logo,
  providerKey,
}: {
  provider: string;
  logo: React.ReactNode;
  providerKey: string;
}) {
  const fetcher =
    useFetcher<ConnectProviderRoute.ComponentProps["actionData"]>();
  return (
    <fetcher.Form
      method={"post"}
      action={"/api/users/providers"}
      className="space-y-3"
      onSubmit={() => {
        sessionStorage.setItem(
          "eokka:social-link-scroll-y",
          String(window.scrollY),
        );
      }}
    >
      <input type="hidden" name="provider" value={providerKey} />
      <Button
        disabled={fetcher.state === "submitting"}
        className="w-full justify-between"
        variant={"outline"}
      >
        <div className="flex items-center gap-3">
          <span>{logo}</span>
          <span>{provider}</span>
        </div>
        <div className="inline-flex items-center justify-center gap-2">
          <span className="flex items-center gap-2 text-xs">
            {fetcher.state === "idle" ? (
              <>
                <PlugIcon className="block size-4" />
                연결
              </>
            ) : null}
            {fetcher.state !== "idle" ? (
              <Loader2Icon className="size-4 animate-spin" />
            ) : null}
          </span>
        </div>
      </Button>
      {fetcher.data && "error" in fetcher.data ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3">
          <FormErrors errors={[fetcher.data.error]} />
        </div>
      ) : null}
    </fetcher.Form>
  );
}

export function DisconnectProviderButton({
  provider,
  logo,
  providerKey,
}: {
  provider: string;
  logo: React.ReactNode;
  providerKey: string;
}) {
  const fetcher =
    useFetcher<DisconnectProviderRoute.ComponentProps["actionData"]>();
  const formRef = useRef<HTMLFormElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  return (
    <>
      <fetcher.Form
        ref={formRef}
        method={"delete"}
        action={`/api/users/providers/${providerKey}`}
        className="group space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          setConfirmOpen(true);
        }}
      >
        <input type="hidden" name="provider" value={providerKey} />
        <Button
          disabled={fetcher.state === "submitting"}
          className="w-full justify-between"
          variant={"outline"}
        >
          <div className="flex items-center gap-3">
            <span>{logo}</span>
            <span>{provider}</span>
          </div>
          <div className="inline-flex items-center justify-center gap-2">
            <span className="flex items-center gap-2 text-xs">
              {fetcher.state === "idle" ? (
                <>
                  <XCircleIcon className="hidden size-4 text-red-500 group-hover:block" />
                  <CheckCircle2Icon className="block size-4 text-green-500 group-hover:hidden" />
                  연결됨
                </>
              ) : null}
              {fetcher.state === "submitting" && (
                <Loader2Icon className="block size-4 animate-spin" />
              )}
            </span>
          </div>
        </Button>
        {fetcher.data && "error" in fetcher.data ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/[0.06] px-4 py-3">
            <FormErrors errors={[fetcher.data.error]} />
          </div>
        ) : null}
        {fetcher.data && "success" in fetcher.data && fetcher.data.success ? (
          <FormSuccess message={`${provider} 계정 연결을 해제했어요.`} />
        ) : null}
      </fetcher.Form>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={`${provider} 계정 연결을 해제할까요?`}
        description={`해제 후에는 ${provider} 계정으로 로그인할 수 없어요. 다른 로그인 수단은 그대로 유지됩니다.`}
        confirmLabel="연결 해제"
        destructive
        busy={fetcher.state !== "idle"}
        onConfirm={() => {
          if (!formRef.current) return;
          setConfirmOpen(false);
          void fetcher.submit(formRef.current, {
            method: "delete",
            action: `/api/users/providers/${providerKey}`,
          });
        }}
      />
    </>
  );
}
