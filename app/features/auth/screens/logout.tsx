import type { Route } from "./+types/logout";

import { Form, redirect, useNavigate } from "react-router";

import ConfirmDialog from "~/core/components/confirm-dialog";
import makeServerClient from "~/core/lib/supa-client.server";

export async function action({ request }: Route.ActionArgs) {
  const [client, headers] = makeServerClient(request);
  await client.auth.signOut();
  return redirect("/", { headers });
}

export default function Logout() {
  const navigate = useNavigate();
  return (
    <Form method="post" id="logout-confirm-form">
      <ConfirmDialog
        open
        onOpenChange={(open) => {
          if (!open) navigate(-1);
        }}
        title="로그아웃할까요?"
        description="현재 계정의 로그인 세션이 종료되고 홈으로 이동해요."
        confirmLabel="로그아웃"
        onConfirm={() => {
          const form = document.getElementById("logout-confirm-form");
          if (form instanceof HTMLFormElement) form.requestSubmit();
        }}
        destructive
      />
    </Form>
  );
}
