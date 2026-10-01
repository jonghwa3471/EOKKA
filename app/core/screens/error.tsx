import type { Route } from "./+types/error";

import { useSearchParams } from "react-router";

import { ErrorState } from "~/core/components/error-state";

export const meta: Route.MetaFunction = () => {
  return [
    {
      title: `오류가 발생했어요 | ${import.meta.env.VITE_APP_NAME}`,
    },
  ];
};

export default function ErrorPage() {
  const [searchParams] = useSearchParams();
  const errorCode = searchParams.get("error_code");
  const errorDescription = searchParams.get("error_description");
  return (
    <ErrorState
      code={errorCode ?? "ERROR"}
      eyebrow="요청을 마치지 못했어요"
      title="연결 과정에서 문제가 생겼어요"
      description="잠시 후 다시 시도해 주세요. 같은 문제가 이어지면 문의하기에서 상황을 알려주세요."
      detail={errorDescription}
    />
  );
}
