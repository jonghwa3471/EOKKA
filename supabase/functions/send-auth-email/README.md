# EOKKA 인증 이메일 Hook 설정

이 함수는 Supabase Auth의 Send Email Hook 요청을 검증하고, React Email로 HTML을 만든 뒤 Resend API로 발송합니다.

## 1. 함수 배포

먼저 함수 자체를 검사합니다.

```bash
deno check --config supabase/functions/send-auth-email/deno.json \
  supabase/functions/send-auth-email/index.ts
deno test --config supabase/functions/send-auth-email/deno.json \
  supabase/functions/send-auth-email/email-hook.test.ts
```

개발용 프로젝트에 배포할 때는 운영 프로젝트와 혼동하지 않도록 프로젝트 ref를
명시합니다.

```bash
supabase functions deploy send-auth-email --no-verify-jwt \
  --project-ref <DEVELOPMENT_PROJECT_REF>
```

## 2. Send Email Hook 생성

1. Supabase Dashboard → Authentication → Hooks로 이동합니다.
2. `Send Email` Hook을 만들고 타입을 `HTTPS`로 선택합니다.
3. URL에 `https://<SUPABASE_PROJECT_REF>.supabase.co/functions/v1/send-auth-email`을 입력합니다.
4. Hook Secret을 생성한 뒤 값을 복사합니다.

## 3. Supabase Secret 등록

로컬 `.env` 값을 출력하거나 커밋하지 말고 다음 명령에서 직접 입력합니다. 방금
복사한 Hook Secret을 `SEND_EMAIL_HOOK_SECRET` 값으로 사용합니다.

```bash
supabase secrets set RESEND_API_KEY=re_... \
  --project-ref <DEVELOPMENT_PROJECT_REF>
supabase secrets set SEND_EMAIL_HOOK_SECRET='v1,whsec_...' \
  --project-ref <DEVELOPMENT_PROJECT_REF>
supabase secrets set 'AUTH_EMAIL_FROM=EOKKA <eokka@mail.qualius.co>' \
  --project-ref <DEVELOPMENT_PROJECT_REF>
```

이미 Custom SMTP에 사용한 Resend API 키를 재사용할 수 있지만, 운영 환경에서는
인증 이메일 전용 키를 권장합니다. Secret 등록을 마치면 이메일 로그인과 회원가입을
각각 한 번씩 테스트합니다.

Send Email Hook이 활성화되면 Supabase의 기본 SMTP 이메일 발송을 이 함수가 대체합니다.

개발 환경에서 인증메일을 확인할 때는 개발용 Supabase 프로젝트에 함수와 Secret을
등록하고, 개발용 프로젝트의 Send Email Hook에 개발 프로젝트 URL을 연결합니다.
운영용 Supabase의 Hook과 Secret은 배포 준비 단계에서 별도로 설정합니다.

앱 알림 메일은 Edge Function과 별개입니다. 로컬에서는
`.env.development.local`의 `EMAIL_DELIVERY_ENABLED=true`와
`EMAIL_TEST_RECIPIENT`를 사용하며, 실수로 다른 사용자에게 발송하지 않도록 모든
알림 메일을 설정한 테스트 주소 하나로 보냅니다. Vercel Preview에서도 같은
세 변수를 Preview 환경변수로 별도 등록합니다.

## 4. 확인 사항

- Resend 도메인 `mail.qualius.co`가 Verified 상태여야 합니다.
- Resend의 Open Tracking과 Click Tracking은 인증 링크 보호를 위해 끕니다.
- Supabase URL Configuration에 로컬과 배포 주소를 Redirect URL로 등록합니다.
- 로그인과 회원가입에서 각각 이메일을 요청해 수신, 링크 클릭, 세션 생성을 확인합니다.
