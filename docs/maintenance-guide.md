# EOKKA 유지보수 안내서

확인 기준: 2026-10-12. 실제 구현에서 확인한 파일·함수 기준으로 작성했습니다.
정책과 환경변수는 변경될 수 있으므로 해당 구현을 최종 기준으로 확인하세요.

## 목차

- [처음 읽는 순서](#처음-읽는-순서)
- [파일 이름과 요청 처리 방식](#파일-이름과-요청-처리-방식)
- [페이지와 진입 파일](#페이지와-진입-파일)
- [분석 요청부터 결과 표시까지](#분석-요청부터-결과-표시까지)
- [차트·기록·인사이트](#차트기록인사이트)
- [사용자·인증·프로필](#사용자인증프로필)
- [체험·결제·자동 분석](#체험결제자동-분석)
- [문의·운영 관리·알림](#문의운영-관리알림)
- [공통 화면과 로딩](#공통-화면과-로딩)
- [DB와 외부 서비스](#db와-외부-서비스)
- [자주 하는 수정과 문제 추적](#자주-하는-수정과-문제-추적)
- [실행·검증·문서 갱신](#실행검증문서-갱신)

## 처음 읽는 순서

1. [환경 분리 안내](environment-separation.md): 개발용 Supabase와 운영용 Supabase를 구분합니다.
2. [app/routes.ts](../app/routes.ts): URL이 어떤 화면 또는 API 파일을 실행하는지 찾습니다.
3. 해당 화면의 `loader`, `action`, 기본 컴포넌트와 import를 읽습니다.
4. 서버 처리는 `.server.ts`, 계산은 일반 `.ts`, 작은 화면은 컴포넌트 파일로 따라갑니다.
5. 수정하는 기능의 테스트와 [로딩·캐시 원칙](loading-and-cache.md)을 확인합니다.

예: 자산 성장 차트를 바꾸려면 `/dashboard` → `users/screens/dashboard.tsx` →
`users/dashboard/asset-trend-chart.tsx` 순서로 찾습니다.
차트의 숫자가 틀렸다면 그리는 코드뿐 아니라 `trend-data.ts`와 기록 조회까지 확인합니다.

이 문서의 아래 표에서 `app/`로 시작하는 경로는 저장소 루트 기준입니다.
VS Code의 빠른 파일 열기(`⌘P`)에 경로를 붙여 넣거나, 함수 이름을 전체 검색(`⌘⇧F`)하세요.
`~/`로 시작하는 import는 `app/` 경로를 의미합니다.

## 파일 이름과 요청 처리 방식

| 코드 형태 | 맡는 일 | 읽을 때 볼 부분 |
| --- | --- | --- |
| `screens/*.tsx` | 페이지와 요청 처리 연결 | loader, action, clientLoader, default component |
| `api/*.ts(x)` | 화면 없이 요청에 응답 | HTTP 메서드, 입력 검증, 권한, 반환 데이터 |
| `loader` | 서버에서 화면용 데이터 조회 | 인증과 조회 조건, 반환 객체 |
| `action` | 제출 요청 처리 | formData/json, intent, 변경·저장 함수 |
| `clientLoader` | 브라우저 측 페이지 데이터 로딩 | 캐시 키와 serverLoader 호출 |
| `components/*.tsx` | 카드·차트·모달 등 화면 부분 | props, 이벤트, 상태 |
| `*.server.ts` | DB·외부 API·비밀키 처리 | 호출자와 반환값, 서버 권한 검증 |
| `schema.ts` | Drizzle 테이블 정의 | 컬럼, 관계, 인덱스·제약 |
| `*.test.ts` | 함수 동작 검증 | 입력 사례와 기대 결과 |
| `+types/*` | React Router가 생성한 타입 | 직접 편집하지 않고 typegen으로 갱신 |

화면 파일 안에도 서버 코드가 있습니다. UI만 바꾸려면 JSX와 컴포넌트를,
저장 동작을 바꾸려면 `action`에서 호출하는 서버 함수를 따라가세요.
브라우저에서 실행되는 코드가 서버 모듈의 런타임 값을 직접 가져오지 않도록 합니다.
공유 상수·타입·순수 계산은 서버 의존성이 없는 파일에 둡니다.

## 페이지와 진입 파일

전체 등록 여부와 레이아웃 관계는 [routes.ts](../app/routes.ts)가 기준입니다.

| 주소 / 화면 | 진입 파일 | 주요 확인 지점 |
| --- | --- | --- |
| `/` 홈·빠른 분석 | `app/features/home/screens/home.tsx` | 입력 상태, 분석 요청·취소, 결과 표시 |
| `/dashboard` | `app/features/users/screens/dashboard.tsx` | 기록 조회, 기준 목표, 최신 종가 안내, 차트 조립 |
| `/dashboard/portfolio` 내 포트폴리오 | `app/features/users/screens/managed-portfolio.tsx` | 거래 입력·삭제·수정 intent |
| `/dashboard/precise-analysis` | `app/features/users/screens/precise-analysis.tsx` | 권한 확인, 정밀 분석 action, 전환 처리 |
| `/dashboard/history` | `app/features/users/screens/analysis-history.tsx` | 분석 목록·상세·삭제 |
| `/dashboard/insights` | `app/features/users/screens/investment-insights.tsx` | 주간·월간·연간 탭과 집계 전달 |
| `/dashboard/achievements` | `app/features/users/screens/achievements.tsx` | 카테고리·획득 필터 |
| `/account` 프로필 | `app/features/users/screens/profile.tsx` | 성향·투자 정보·장식 배지 |
| `/account/edit` 설정 | `app/features/users/screens/account.tsx` | 프로필·소셜 연결·초기화 폼 |
| `/dashboard/pro` | `app/features/users/screens/eokka-pro.tsx` | 체험 안내, start-beta-pro action |
| `/payments/checkout` | `app/features/payments/screens/subscription-checkout.tsx` | 결제 활성 여부, Toss SDK 시작 |
| `/payments/success` | `app/features/payments/screens/subscription-success.tsx` | 결제 성공 콜백 처리 |
| `/payments/failure` | `app/features/payments/screens/failure.tsx` | 결제 실패 안내 |
| `/dashboard/payments` | `app/features/payments/screens/payments.tsx` | 결제 내역·구독 처리 |
| `/dashboard/notifications` | `app/features/notifications/screens/notifications.tsx` | 목록·상세 모달·읽음·삭제 |
| `/contact` | `app/features/contact/screens/support.tsx` | 공개 문의 목록·작성·댓글 |
| `/dashboard/admin` | `app/features/admin/screens/admin.tsx` | 문의·사용자·공지·활동 필터 |
| `/dashboard/developer-portfolio` | `app/features/stocks/screens/developer-portfolio.tsx` | 게시된 개발자 포트폴리오·로컬 게시 도구 |
| `/dashboard/developer-portfolio/investing-notes` | `app/features/stocks/screens/developer-investing-notes.tsx` | 투자 노하우 안내 |
| `/login`, `/join` | `app/features/auth/screens/login.tsx`, `join.tsx` | 로그인·가입·회원 수 안내 |
| `/logout` | `app/features/auth/screens/logout.tsx` | 로그아웃 처리 |
| `/about`, `/methodology` | `app/features/stocks/screens/about.tsx`, `methodology.tsx` | 서비스 소개·분석 방법 |
| `/legal/:slug` | `app/features/legal/screens/policy.tsx` | legal/docs의 MDX 문서 표시 |
| `/share/card` | `app/features/stocks/screens/shared-card.tsx` | 공유 카드 |
| `/blog`, `/blog/:slug` | `app/features/blog/screens/posts.tsx`, `post.tsx` | 블로그 목록·본문 |
| `/error` | `app/core/screens/error.tsx` | 오류 화면; 전체 오류 경계는 root.tsx도 확인 |

`/robots.txt`, `/sitemap.xml`은 `app/core/screens/`에 있습니다.
`/debug/sentry`, `/debug/analytics`는 `app/debug/`에 있으며 운영 환경 차단을 확인해야 합니다.

## 분석 요청부터 결과 표시까지

### 빠른 분석

`home.tsx` → POST `/api/stocks/analyze` → `analyzePortfolio` →
`generateAiStrategy` → 권한에 따른 기록 처리 → `AnalysisResult` 화면.

| 단계 | 파일 / 함수 | 수정할 내용 |
| --- | --- | --- |
| 입력과 요청 | `app/features/home/screens/home.tsx` | 목표·월 투자금·종목 입력, AbortController |
| 입력 모델·표시 | `app/features/home/quick-analysis-model.ts`, `formatters.ts`, `components/` | 초기값·저장 키·금액 표시·홈 요약 |
| 종목 검색 | `app/features/stocks/api/search.ts` → `queries.server.ts: searchStocks` | 검색 API와 DB 조회 |
| 종목 선택 UI | `app/features/stocks/components/stock-autocomplete.tsx` | 자동완성 목록 |
| 요청 검증 | `app/features/stocks/api/analyze.ts: action` | Zod 입력, 요청 크기, 횟수·종목 제한, 인증 |
| 핵심 분석 | `app/features/stocks/analysis.server.ts: analyzePortfolio` | 시장 데이터와 계산의 조합 |
| 계산 입력·출력 | `app/features/stocks/analysis.types.ts` | 분석 데이터 계약 |
| 계산 지표 | `app/features/stocks/analysis/metrics.ts` | CAGR, 낙폭, 변동성, 매수 위치, 월별 수익률 |
| 미래 시나리오 | `app/features/stocks/analysis/simulation.ts: simulatePaths` | 경로 시뮬레이션·기간별 가중 |
| 개인 수익률 | `app/features/stocks/personal-return.ts`, `scenario-adjustment.ts` | 개인 성과·시나리오 보정 |
| AI 요청 | `app/features/stocks/ai-strategy.server.ts: generateAiStrategy` | 프롬프트, 응답 처리 |
| AI 평가·스키마 | `app/features/stocks/committee/evaluation.ts`, `holding-consensus.ts`, `response-schema.ts` | 평가 기준·종목 의견·응답 검증 |
| 익명 이름 복원 | `app/features/stocks/holding-aliases.ts` | 종목 별칭을 실제 표시 정보로 복원 |
| 결과 화면 | `app/features/stocks/components/analysis-result.tsx` | 결과 섹션 순서·조립 |

결과 세부 화면은 `app/features/stocks/components/analysis-result/`에 있습니다.

- `committee-review.tsx`: 위원회 평가·토론·결론.
- `committee-members.tsx`: 투자 대가 소개·모달.
- `purchase-position.tsx`: 평균 매수 위치와 캐릭터.
- `portfolio-allocation.tsx`: 종목 비중.
- `strategy-radar.tsx`, `investment-style-radar.tsx`: 균형·성향.
- `scenario-chart.tsx`, `goal-probability-chart.tsx`: 시나리오·목표 확률.
- `goal-momentum-card.tsx`: 목표 달성 속도 카드.
- `chart-animation.tsx`: 차트 표시·숫자 애니메이션.
- `scenario-series.ts`: 시나리오 계열 색과 타입.
- `analysis-method-dialog.tsx`: 계산 방법 안내 모달.

### 정밀 분석과 매매일지

`managed-portfolio.tsx`의 action은 `add-transaction`, `delete-transaction`,
`delete-all-transactions`, `import-quick-portfolio`, `apply-transaction-updates`로 나뉩니다.
해당 문자열을 검색하면 폼과 서버 처리 양쪽을 찾을 수 있습니다.

실제 거래 저장은 `app/features/stocks/portfolio/portfolio.server.ts`의
`addPortfolioTransaction(s)`, `deletePortfolioTransaction`, `updatePortfolioTransactions`가 담당합니다.
원금·수량·현금흐름은 `portfolio-calculations.ts`의 `calculateManagedHoldings`,
`managedPortfolioCashFlows`, `investmentMonthsSince`를 확인합니다.
과거 환율은 `exchange-rate.server.ts`에서 조회합니다.

`precise-analysis.tsx: action`은 이 거래 정보를 분석 입력으로 만들고 공통 분석 엔진을 호출합니다.
빠른 분석에서 정밀 분석으로 바뀔 때 기록·도전과제 처리의 시작점은
`history/analysis-history.server.ts: startManagedAnalysisHistory`입니다.
전환 안내만 바꾸지 말고 실제 초기화 범위와 함께 확인하세요.

분석 취소는 홈의 AbortController와 정밀 분석의 요청 취소/서버 `request.signal` 확인을 함께 읽습니다.
취소 시점과 DB 저장 시점은 다를 수 있으므로 UI 취소만으로 트랜잭션 롤백을 가정하지 않습니다.

## 차트·기록·인사이트

[기록 서비스](../app/features/stocks/history/analysis-history.server.ts)가 저장·조회 진입점입니다.

| 작업 | 함수 / 파일 |
| --- | --- |
| 분석 결과 저장 | `saveDailyAnalysisSnapshot` |
| 체험 시작 전 빠른 분석 임시 보관·승격 | `savePendingQuickAnalysis`, `promotePendingQuickAnalysis` |
| 전체/활성 분석 기록 조회 | `getAnalysisHistory`, `getActiveAnalysisHistory` |
| 기록 삭제 | `deleteAnalysisSnapshot`, `deleteAllAnalysisSnapshots` |
| 기준 목표 조회·저장 | `getPreferredGoalAmount`, `setPreferredGoalAmount` |
| 기록 접근·목표 정책 | `history-access.server.ts: hasHistoryAccess, assertFreeAccountGoal` |
| 장기 흐름 저장·압축 | `history-retention.server.ts: saveAnalysisHistoryPoint, compactAnalysisHistory` |
| 상세 기록 개수 유지 | `history-retention.server.ts: pruneDetailedAnalysisHistory` |
| 요약에 남기는 데이터 | `history-values.ts: compactHistoryResult` |

상세 분석은 `analysisSnapshots`, 장기 요약은 `analysisHistoryPoints`,
체험 전 임시 분석은 `pendingQuickAnalyses`에 대응합니다.
상세는 현재 30개 제한이며, 요약은 최근 90일 일별 → 365일 범위 주별 → 이전 월별로 압축합니다.
압축 후에는 과거 모든 날짜의 상세 보고서나 일별 값이 남는 것이 아닙니다.
새 인사이트에 필요한 값이 있으면 요약 필드에도 남는지 먼저 확인하세요.

대시보드 관련 모듈은 `app/features/users/dashboard/`에 있습니다.

| 바꾸려는 부분 | 파일 |
| --- | --- |
| 자산 성장 추이·확대·범례·툴팁 | `asset-trend-chart.tsx` |
| 매입 원금과 평가금액 차트 | `cost-basis-chart.tsx` |
| 차트 날짜·기간별 데이터 가공 | `trend-data.ts` |
| 기록 비교·기간별 계산 | `history-insights.ts` |
| 인사이트 표시 | `historical-insights.tsx` |
| 수익 기여도 카드 | `profit-contribution-grid.tsx` |
| 대시보드 요약 UI | `summary-components.tsx` |
| 숫자·날짜 표시 | `formatters.ts` |
| 방문별 효과 재생 | `use-reveal-once-per-visit.ts` |

`investment-insights.tsx`도 이 모듈을 사용합니다.
주·월·연간 집계를 바꾸면 대시보드와 투자 인사이트를 함께 확인하세요.
종가 기준일은 분석 결과의 `asOf`와 기록의 `saved_on`을 따라가며, 요청한 오늘 날짜와 구별합니다.

## 사용자·인증·프로필

| 기능 | 먼저 볼 코드 |
| --- | --- |
| 인증 클라이언트·쿠키 | `app/core/lib/supa-client.server.ts` |
| 로그인 필요 여부 | `app/core/layouts/private.layout.tsx`, `app/core/lib/guards.server.ts` |
| 소셜 로그인 시작·완료 | `app/features/auth/screens/social/start.tsx`, `complete.tsx` |
| 소셜 계정 연결 완료 | `app/features/auth/screens/social/link-complete.tsx` |
| 이메일 인증 | `app/features/auth/screens/confirm.tsx`, `magic-link.tsx`, `app/features/auth/api/resend.tsx` |
| 회원 수 제한 | `app/features/auth/member-capacity.server.ts: getBetaMemberCapacity` |
| 프로필 조회 | `app/features/users/queries.ts: getUserProfile` |
| 이름·username·이미지 저장 | `app/features/users/api/edit-profile.tsx` |
| 소셜 아바타 선택 | `app/features/users/api/use-social-avatar.tsx` |
| 계정 연결·해제 | `app/features/users/api/connect-provider.tsx`, `disconnect-provider.tsx` |
| 이메일·비밀번호 변경 | `app/features/users/api/change-email.tsx`, `change-password.tsx` |
| 투자 정보 초기화 | `app/features/users/api/reset-user-data.tsx` → `user-data.server.ts: resetUserInvestmentData` |
| 회원 탈퇴 | `app/features/users/api/delete-account.tsx` |
| 아바타 공통 표시 | `app/core/components/ui/avatar.tsx` 및 각 프로필 사용처 |
| 프로필 설정 폼 | `app/features/users/components/forms/` |

회원 수 제한 상수는 현재 `BETA_MEMBER_LIMIT = 50`입니다.
가입 관련 DB 제약·트리거는 `sql/`도 검색해야 합니다. 화면의 숫자만 바꾸면 충분하지 않을 수 있습니다.
소셜 Provider 설정과 Redirect URL은 Supabase 및 Google/Kakao 콘솔 설정도 함께 작동합니다.

도전과제는 `app/features/users/achievements.ts`의 정의·판정과
`achievements.server.ts`의 `awardUserAchievementsForAnalysis`, `syncUserAchievements`를 봅니다.
장식할 배지 저장은 `api/featured-achievements.tsx`,
선택 UI는 `components/achievement-picker-dialog.tsx`와 `featured-achievements-settings.tsx`입니다.
구독 기간 배지는 `pro-tenure.ts`, `components/pro-tenure-badge.tsx`에 있습니다.

## 체험·결제·자동 분석

과거 유료 구독 구현과 현재 베타 체험 구현이 함께 있습니다.
파일에 Pro라는 이름이 있다고 모두 실제 결제 사용자만 뜻하지는 않습니다.

| 정책 / 동작 | 기준 코드 |
| --- | --- |
| 유료·베타 권한 | `app/features/users/automatic-analysis-settings.server.ts: getAutomaticAnalysisSettings` |
| 체험 시작 | `eokka-pro.tsx: action`의 `start-beta-pro` |
| 체험 전 분석 기록 연결 | `analysis-history.server.ts: promotePendingQuickAnalysis` |
| 일일 분석·종목·상세 기록 한도 | `app/core/lib/service-limits.ts` |
| 서버 요청 횟수 적용 | `app/core/lib/rate-limit.server.ts` |
| 화면용 잔여 횟수 API | `app/features/stocks/api/analysis-limit.ts` |
| 목표 금액 충돌 확인 | `history-access.server.ts: assertFreeAccountGoal` |
| 실제 결제 진입 허용 | checkout loader의 `PAYMENTS_ENABLED` |
| 자동 분석 실행 허용 | `app/core/lib/app-environment.server.ts: isAutomaticAnalysisEnabled` |

권한 조회 함수는 `isPaidPro`, `isBetaPro`, 둘을 합친 `isPro`를 반환합니다.
현재 공통 제한값은 수동 분석 5회/일, 익명 IP 30회/일, 종목 무료 10개·Pro 20개, 상세 기록 30개입니다.
목표 정책·회원 한도·환경 활성 여부는 별도 파일에 있으므로 공통 상수만으로 모든 정책을 판단하지 않습니다.

실제 결제 흐름은 checkout → Toss 인증 → success →
`subscription.server.ts: startSubscription`입니다.
해지·재개·갱신은 같은 파일의 `cancelSubscription`, `resumeSubscription`,
`renewDueSubscriptions`에 있습니다.
외부 요청은 `toss-billing.server.ts: tossRequest, chargeBillingKey`,
빌링키 암호화는 `billing-crypto.server.ts`,
결제 금액·날짜 값은 `subscription-values.ts`를 확인합니다.
가격 변경 시 화면에 별도로 선언된 금액과 안내 문구도 검색하세요.

예약 API는 `app/features/cron/api/`에 있습니다.

- `analyze-portfolios.ts` → `stocks/history/automatic-analysis.server.ts: runAutomaticPortfolioAnalysis`.
- `renew-subscriptions.ts` → 구독 갱신.
- `notification-emails.ts` → 알림 이메일 처리.
- `mailer.tsx` → 별도 메일 작업. 실행 전 파일의 역할과 설정을 확인합니다.

API 파일의 활성 조건·인증을 먼저 확인한 뒤 서비스 함수를 읽으세요.
예약 시간은 외부 Cron 설정도 확인해야 하며, 코드 파일 존재만으로 실행 중이라고 판단하지 않습니다.

개발자 투자노트 선물은 `users/developer-portfolio-gift.server.ts`와
`users/components/developer-portfolio-gift-dialog.tsx`,
사이드바 표시 코드를 함께 봅니다.
공개용 포트폴리오는 `stocks/developer-portfolio/developer-portfolio.server.ts`의
`getLatestDeveloperPortfolioSnapshot`, `publishDeveloperPortfolio`가 담당합니다.
개인 분석 데이터와 별도 게시 스냅샷의 경계를 유지하세요.

## 문의·운영 관리·알림

문의와 운영 관리는 `app/features/admin/admin.server.ts`를 공유합니다.

| 작업 | 주요 함수 / 파일 |
| --- | --- |
| 관리자 권한 | `isAdmin`, `requireAdmin`; 등록 도구 `scripts/set-admin.ts` |
| 공개 게시판·본문 조회 | `getPublicSupportBoard`, `getThread` |
| 문의 작성·댓글·상태 | `addTicket`, `replyToTicket`, `setSupportTicketStatus` |
| 글·댓글 삭제 | `deleteSupportTicket`, `deleteSupportMessage` |
| 전체·선택 사용자 공지 | `publishAnnouncement` |
| 공지 추가 조회 | `getAdminAnnouncementPage`, `app/features/admin/api/announcements.ts` |
| 사용자 문의 조회 | `getAdminUserTickets`, `app/features/admin/api/user-tickets.ts` |
| 운영 통계·필터 | `getAdminOverview`, `screens/admin.tsx` |
| 공지 템플릿·상태 표시 | `app/features/admin/presentation.ts` |
| 활동 기록 저장 | `app/features/admin/activity.server.ts: recordAdminActivity` |

앱 알림은 `app/features/notifications/notifications.server.ts`의
`createNotification`, `getNotifications`, `markNotificationRead`,
`markAllNotificationsRead`, `deleteNotification`, `deleteAllNotifications`를 봅니다.
읽음 처리의 낙관적 UI와 모달은 `screens/notifications.tsx`에 있습니다.

알림 메일은 `notification-email.server.ts: sendNotificationEmail`,
Resend 연결은 `app/core/lib/resend-client.server.ts`입니다.
인증메일은 별도 Supabase Edge Function인 `supabase/functions/send-auth-email/`에서 처리합니다.
인증메일 템플릿과 앱 알림 메일은 배포 위치가 다르므로 한쪽 수정이 양쪽에 자동 적용되지 않습니다.
관리 기능 설명은 [운영 관리 문서](admin.md)도 참고하세요.

## 공통 화면과 로딩

| 공통 동작 | 파일 |
| --- | --- |
| 앱 전역 조립·오류·이벤트 | `app/root.tsx` |
| 상단 메뉴 | `app/core/components/navigation-bar.tsx`, `core/layouts/navigation.layout.tsx` |
| 대시보드 공통 레이아웃 | `app/features/users/layouts/dashboard.layout.tsx` |
| 사이드바·사용자 메뉴 | `app/features/users/components/dashboard-sidebar.tsx`, `sidebar-main.tsx`, `sidebar-user.tsx` |
| 푸터 | `app/core/components/footer.tsx` |
| 확인·삭제 모달 | `app/core/components/confirm-dialog.tsx`, `destructive-confirm-dialog.tsx` |
| 동작 중 로딩 | `app/core/components/investment-action-loader.tsx` |
| 분석 진행률 | `app/core/hooks/use-adaptive-progress.ts` |
| 투자 명언 | `app/core/data/investment-wisdom.ts` |
| 페이지 전환 스켈레톤 제어 | `app/core/components/route-transition-skeleton.tsx` |
| 화면별 스켈레톤 | `app/core/components/skeletons/` |
| 데이터 캐시 | `app/core/lib/route-data-cache.ts` |
| 공통 스타일·색상 | `app/app.css` |
| 공통 입력·선택·날짜·버튼 | `app/core/components/ui/` |
| 테마 | `theme-switcher.tsx`, `app/core/lib/theme-session.server.ts`, `features/settings/api/set-theme.tsx` |
| 언어 | `lang-switcher.tsx`, `app/core/lib/i18next.ts`, `i18next.server.ts`, `features/settings/api/set-locale.tsx` |
| 클라이언트 이벤트 측정 | `app/core/lib/analytics.client.ts` |
| Sentry 서버 초기화 | `instrument.server.mjs` |

테마·언어 버튼의 위 파일명은 `app/core/components/` 기준입니다.
실제 문구 변경은 번역 키의 사용처와 번역 리소스를 함께 검색하세요.

새 페이지는 고정 UI를 먼저 표시하고 데이터 부분만 스켈레톤으로 구성합니다.
`loadCachedRouteData`로 재방문 조회를 처리하고 `usePrimeRouteDataCache`로 초기 데이터를 등록합니다.
변경 요청 후에는 `invalidateRouteDataCache` 또는 분석 공통
`invalidateAnalysisRouteData`를 사용합니다.
홈 전환 등 예외와 기존 동작은 [로딩·캐시 문서](loading-and-cache.md) 및 현재 variant를 확인하세요.
클라이언트 캐시는 표시 속도용이며 서버 권한 검사를 대신하지 않습니다.

## DB와 외부 서비스

| 데이터 | 스키마 위치 / 대표 테이블 변수 |
| --- | --- |
| 프로필·배지 | `app/features/users/schema.ts`: profiles, userAchievements |
| 종목·시세 | `app/features/stocks/schema.ts`: stocks, stockPrices |
| 분석·요약·횟수 | `app/features/stocks/history/schema.ts`: analysisSnapshots, analysisHistoryPoints, pendingQuickAnalyses, analysisRateLimits |
| 포트폴리오·거래 | `app/features/stocks/portfolio/schema.ts`: managedPortfolios, portfolioTransactions |
| 게시용 포트폴리오 | `app/features/stocks/developer-portfolio/schema.ts` |
| 관리자·문의·공지 | `app/features/admin/schema.ts`: adminMembers, supportTickets, supportMessages, siteAnnouncements, siteAnnouncementRecipients, adminActivityEvents |
| 알림 | `app/features/notifications/schema.ts`: notifications |
| 결제·구독 | `app/features/payments/schema.ts`: payments, subscriptions |

DB 연결은 `app/core/db/drizzle-client.server.ts`,
Supabase 일반/관리자 클라이언트는 `supa-client.server.ts`, `supa-admin-client.server.ts`입니다.
테이블 정의 변경은 `drizzle.config.ts`, `sql/migrations/`,
`scripts/migrate-database.ts`로 이어집니다.
SQL의 RLS·트리거도 실제 동작의 일부입니다. 사용자 삭제는 profiles와 Auth 사용자를 구별하세요.

시세 경로는 `stocks/market-mode.server.ts` → `market-data.server.ts: getMarketData` →
`fsc-client.server.ts` 또는 `kis-client.server.ts`입니다.
국내 재무정보는 `fsc-fundamentals.server.ts`.
최신 종가 문제는 `getLatestCachedMarketDate`, `refreshLatestDomesticMarketDate`,
`getLatestKisMarketDate`와 화면 loader의 호출을 함께 확인합니다.
종목 목록 동기화는 `scripts/sync-stocks.ts`, `sync-kis-us-stocks.ts`이며 시세 조회와 별도 작업입니다.

환경 경계는 `app/core/lib/app-environment.server.ts: validateEnvironmentConfiguration`를 봅니다.
운영에서 global-test 금지, APP_ENV/DATA_ENV, Supabase 프로젝트 일치 여부 등을 검사합니다.
CLI 환경 로딩은 `scripts/load-environment.ts`이며
`.env.development.local` → `.env.local` → `.env` 순서로 읽습니다.
이미 지정한 프로세스 환경변수도 고려해야 합니다.
값을 문서에 복사하지 말고 [.env.example](../.env.example)과 [환경 분리 안내](environment-separation.md)를 참고하세요.

## 자주 하는 수정과 문제 추적

| 증상 / 요청 | 확인 순서 |
| --- | --- |
| 분석 후 대시보드가 이전 값 | 저장 결과 → 활성 기록/모드 조회 → invalidateAnalysisRouteData → clientLoader 캐시 키 |
| 최신 종가 안내가 틀림 | 시장 모드 → 최신 날짜 조회 → 결과 asOf / saved_on → dashboard loader |
| 차트 날짜·금액이 틀림 | 상세/요약 기록 → trend-data → 해당 차트 포맷·툴팁 |
| 오래된 기록이 안 열림 | 상세 30개 보존 정책 → summary-only 데이터 여부 → 화면 안내 |
| AI 설명·점수가 불일치 | committee/evaluation → 응답 스키마·프롬프트 → committee-review |
| 매입 원금·수익률 오류 | 거래 입력·환율 → portfolio-calculations → personal-return → 분석 결과 |
| 체험했지만 기록이 안 보임 | Pro 권한 → 임시 분석 존재 → promotePendingQuickAnalysis → 활성 모드 → 캐시 |
| 소셜 사진이 다름 | callback의 metadata → 프로필 저장·아바타 선택 → 실제 아바타 URL 사용처 |
| 알림 중복·원치 않는 메일 | createNotification 호출자 → 이벤트 조건 → 이메일 함수·발송 환경 설정 |
| 분석 횟수 변경 | service-limits → 서버 rate limit → 잔여 횟수 API → 화면·소개·요금제 문구 |
| 새 페이지 스켈레톤 불일치 | routes → 실제 레이아웃 → skeleton variant → 캐시·전환 제어 |
| 버튼은 숨겼는데 API 호출 가능 | action/loader 인증·소유자·관리자 검사와 DB RLS |

검색 예:

```bash
rg -n 'saveDailyAnalysisSnapshot' app
rg -n 'start-beta-pro' app/features/users
rg -n 'invalidateAnalysisRouteData' app
rg -n '목표 금액' app
rg -n 'username|member.*limit' sql app/features/auth
```

## 실행·검증·문서 갱신

저장소 루트에서 실행합니다. 개발 환경 연결을 먼저 확인하세요.

| 명령 | 목적 |
| --- | --- |
| `npm run dev` | 로컬 개발 서버 |
| `npm run typecheck` | 라우트 타입 생성과 TypeScript 검사 |
| `npm test` | 계산·정책 단위 테스트 |
| `npm run build` | prebuild 타입 검사 후 배포 빌드 |
| `npm run test:e2e` | 현재 기본 Chromium 공개 페이지 스모크 테스트 |
| `npm run stocks:sync:dry` | 국내 종목 동기화 사전 확인 |
| `npm run db:generate` | 스키마 기반 SQL 생성; 적용 전 SQL 검토 |
| `npm run db:migrate` | 연결된 DB에 마이그레이션 적용 |

`playwright.config.ts`의 기본 testMatch는 `smoke/**/*.spec.ts`입니다.
`e2e/auth/`, `e2e/users/`에 파일이 있어도 기본 실행에 포함되지는 않습니다.
현재 스모크 통과가 인증된 전체 흐름·실결제·AI 응답 검증을 뜻하지 않습니다.
DB 변경 명령은 일반 UI 검증과 구별해 필요한 경우에만 실행합니다.

수정별 검증 기준:

- UI 변경: 해당 화면·모바일 크기·모달·키보드 조작 확인.
- 로딩 변경: 최초 방문·재방문·데이터 수정 후 재방문 확인.
- 계산 변경: 관련 `*.test.ts`와 경계값 사례 확인.
- 저장·권한 변경: 인증 여부·다른 사용자 데이터 접근·저장 후 재조회 확인.
- 기록 변경: 빠른/정밀 모드, 상세/압축 요약, 전환·삭제 흐름 확인.

새 기능을 추가할 때 이 문서의 페이지 표와 기능 담당 파일을 함께 갱신하세요.
정책 변경 이유는 [서비스 변경 기록](product-evolution.md),
구조 변경 이유는 [리팩터링 기록](refactoring-2026-10.md)에 남깁니다.
오래된 안내와 코드가 다르면 실제 호출 경로와 활성 설정을 확인하고 문서도 수정합니다.

