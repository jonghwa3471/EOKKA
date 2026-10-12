export const announcementTemplates = [
  {
    kind: "general",
    label: "일반 공지",
    title: "EOKKA에서 안내해 드려요",
    body: "[안내 내용]\n• 사용자에게 전달할 내용을 적어 주세요.\n\n[확인해 주세요]\n• 함께 확인해야 할 내용이나 유의사항을 적어 주세요.",
  },
  {
    kind: "update",
    label: "서비스 업데이트",
    title: "EOKKA 업데이트 소식을 알려드려요",
    body: "[무엇이 바뀌었나요?]\n• 변경된 기능을 적어 주세요.\n\n[언제 적용되나요?]\n• 적용 날짜와 시간을 적어 주세요.\n\n[확인해 주세요]\n• 사용자가 알아야 할 내용을 적어 주세요.",
  },
  {
    kind: "maintenance",
    label: "서비스 점검",
    title: "EOKKA 서비스 점검을 안내해 드려요",
    body: "[점검 일시]\n• 시작 시간과 종료 예정 시간을 적어 주세요.\n\n[점검 내용]\n• 점검하는 기능을 적어 주세요.\n\n[이용 안내]\n• 점검 중 이용할 수 없는 기능을 적어 주세요.",
  },
  {
    kind: "event",
    label: "이벤트 안내",
    title: "EOKKA 이벤트가 시작됐어요",
    body: "[이벤트 내용]\n• 혜택을 알기 쉽게 적어 주세요.\n\n[참여 기간]\n• 시작일과 종료일을 적어 주세요.\n\n[참여 방법]\n• 사용자가 따라 할 순서와 주의사항을 적어 주세요.",
  },
] as const;

const announcementKindMeta = {
  general: {
    label: "일반 공지",
    className: "bg-slate-500/10 text-slate-600 dark:text-slate-300",
  },
  update: {
    label: "서비스 업데이트",
    className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  },
  maintenance: {
    label: "서비스 점검",
    className: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  event: {
    label: "이벤트 안내",
    className: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
  },
} as const;

export const activityLabels: Record<string, string> = {
  account_created: "회원가입",
  login_completed: "로그인",
  quick_analysis_completed: "빠른 분석 완료",
  precise_analysis_completed: "정밀 분석 완료",
  portfolio_transaction_added: "매매일지 추가",
  portfolio_transaction_updated: "매매일지 수정",
  portfolio_transaction_deleted: "매매일지 삭제",
  support_ticket_created: "문의 등록",
  payment_completed: "결제 완료",
  subscription_cancelled: "구독 취소",
  account_deleted: "회원탈퇴",
};

export const activityStyles: Record<string, string> = {
  account_created: "bg-sky-500/12 text-sky-700 dark:text-sky-300",
  login_completed: "bg-slate-500/12 text-slate-700 dark:text-slate-300",
  quick_analysis_completed:
    "bg-violet-500/12 text-violet-700 dark:text-violet-300",
  precise_analysis_completed:
    "bg-indigo-500/12 text-indigo-700 dark:text-indigo-300",
  portfolio_transaction_added:
    "bg-emerald-500/12 text-emerald-700 dark:text-emerald-300",
  portfolio_transaction_updated:
    "bg-amber-500/12 text-amber-700 dark:text-amber-300",
  portfolio_transaction_deleted:
    "bg-rose-500/12 text-rose-700 dark:text-rose-300",
  support_ticket_created: "bg-cyan-500/12 text-cyan-700 dark:text-cyan-300",
  payment_completed: "bg-green-500/12 text-green-700 dark:text-green-300",
  subscription_cancelled:
    "bg-orange-500/12 text-orange-700 dark:text-orange-300",
  account_deleted: "bg-red-500/12 text-red-700 dark:text-red-300",
};

export function getAnnouncementKindMeta(kind: string) {
  return announcementKindMeta[
    kind in announcementKindMeta
      ? (kind as keyof typeof announcementKindMeta)
      : "general"
  ];
}
