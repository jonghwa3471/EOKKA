import { GiftIcon, PartyPopperIcon, SparklesIcon } from "lucide-react";
import { Form, Link } from "react-router";

import { Button } from "~/core/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "~/core/components/ui/dialog";

export function DeveloperPortfolioGiftDialog({
  open,
  onOpenChange,
  preview = false,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview?: boolean;
}) {
  const giftButtonContent = (
    <>
      <GiftIcon className="size-5 shrink-0" />
      <span className="flex-1">
        <span className="block">선물 받고 구경하러 가기</span>
        <span className="mt-1 block text-xs font-semibold text-white/75">
          개발자의 실제 주식 포트폴리오가 열려요
        </span>
      </span>
    </>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden rounded-[2rem] border-amber-500/25 p-0 sm:max-w-lg">
        <div className="relative bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.25),transparent_48%),linear-gradient(145deg,rgba(16,185,129,0.1),transparent)] px-7 pt-9 pb-7 text-center">
          <SparklesIcon className="absolute top-7 left-7 size-5 text-amber-400" />
          <PartyPopperIcon className="absolute top-8 right-7 size-6 text-violet-400" />
          <span className="mx-auto flex size-16 items-center justify-center rounded-[1.4rem] border border-amber-400/30 bg-amber-400/15 text-amber-500 shadow-[0_15px_45px_-20px_rgba(245,158,11,0.8)]">
            <GiftIcon className="size-8" />
          </span>
          <DialogHeader className="mt-5 text-center sm:text-center">
            <p className="text-xs font-black tracking-[0.18em] text-amber-600 dark:text-amber-300">
              A GIFT FOR YOU
            </p>
            <DialogTitle className="mt-2 text-2xl font-black tracking-[-0.035em]">
              결제해 주셔서 감사합니다!
            </DialogTitle>
            <DialogDescription className="mt-3 text-sm leading-6 font-medium">
              감사의 마음을 담아 작은 선물을 준비했어요. 개발자가 실제로
              투자하고 있는 주식 포트폴리오와 그동안 쌓아온 장기 투자 경험을
              Pro 회원님께만 공개할게요.
            </DialogDescription>
          </DialogHeader>
          {preview ? (
            <Button
              asChild
              className="mt-6 h-auto w-full rounded-2xl bg-gradient-to-r from-amber-500 to-emerald-500 px-5 py-4 text-left font-black text-white shadow-[0_15px_35px_-18px_rgba(16,185,129,0.9)] hover:from-amber-400 hover:to-emerald-400"
            >
              <Link to="/dashboard/developer-portfolio?gift=1">
                {giftButtonContent}
              </Link>
            </Button>
          ) : (
            <Form
              method="post"
              action="/api/users/developer-portfolio-gift"
              className="mt-6"
            >
              <Button
                type="submit"
                className="h-auto w-full rounded-2xl bg-gradient-to-r from-amber-500 to-emerald-500 px-5 py-4 text-left font-black text-white shadow-[0_15px_35px_-18px_rgba(16,185,129,0.9)] hover:from-amber-400 hover:to-emerald-400"
              >
                {giftButtonContent}
              </Button>
            </Form>
          )}
          <p className="text-muted-foreground mt-4 text-xs font-medium">
            선물을 열면 대시보드 사이드 메뉴에 새로운 메뉴가 나타나요.
          </p>
          {preview && (
            <p className="mt-2 text-[11px] font-bold text-amber-600 dark:text-amber-300">
              미리보기에서는 구독·알림·선물 공개 상태를 변경하지 않아요.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
