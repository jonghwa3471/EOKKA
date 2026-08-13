# EOKKA 인증 이메일 Hook 설정

이 함수는 Supabase Auth의 Send Email Hook 요청을 검증하고, React Email로 HTML을 만든 뒤 Resend API로 발송합니다.

## 1. 함수 배포

```bash
supabase functions deploy send-auth-email --no-verify-jwt
```

## 2. Supabase Secret 등록

로컬 `.env` 값을 출력하거나 커밋하지 말고 다음 명령에서 직접 입력합니다.

```bash
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set SEND_EMAIL_HOOK_SECRET='v1,whsec_...'
supabase secrets set 'AUTH_EMAIL_FROM=EOKKA <eokka@mail.jjongstudio.co>'
```

`SEND_EMAIL_HOOK_SECRET`은 다음 단계에서 Hook을 생성하며 발급받습니다. 이미 Custom SMTP에 사용한 Resend API 키를 재사용할 수 있지만, 운영 환경에서는 인증 이메일 전용 키를 권장합니다.

## 3. Send Email Hook 연결

1. Supabase Dashboard → Authentication → Hooks로 이동합니다.
2. `Send Email` Hook을 만들고 타입을 `HTTPS`로 선택합니다.
3. URL에 `https://crszlmhimsheglsbdjqw.supabase.co/functions/v1/send-auth-email`을 입력합니다.
4. Hook Secret을 생성하고 `SEND_EMAIL_HOOK_SECRET`으로 등록합니다.
5. 함수를 다시 배포하거나 Secret 등록 후 테스트합니다.

Send Email Hook이 활성화되면 Supabase의 기본 SMTP 이메일 발송을 이 함수가 대체합니다.

## 4. 확인 사항

- Resend 도메인 `mail.jjongstudio.co`가 Verified 상태여야 합니다.
- Resend의 Open Tracking과 Click Tracking은 인증 링크 보호를 위해 끕니다.
- Supabase URL Configuration에 로컬과 배포 주소를 Redirect URL로 등록합니다.
- 로그인과 회원가입에서 각각 이메일을 요청해 수신, 링크 클릭, 세션 생성을 확인합니다.
