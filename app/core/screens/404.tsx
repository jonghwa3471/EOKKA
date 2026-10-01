import { ErrorState } from "../components/error-state";

export default function NotFound() {
  return (
    <ErrorState
      code="404"
      eyebrow="찾으시는 페이지가 없어요"
      title="이 길에는 투자 기록이 없네요"
      description="주소가 바뀌었거나 페이지가 사라졌을 수 있어요. 홈으로 돌아가 다시 시작해 주세요."
      canGoBack
    />
  );
}
