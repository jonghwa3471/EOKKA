# EOKKA 환경 분리

## 원칙

- 로컬 개발은 별도의 Supabase 개발 프로젝트만 사용한다.
- Vercel Preview는 개발 또는 스테이징 프로젝트를 사용한다.
- 운영 Supabase와 운영 외부 API 키는 Vercel Production에만 등록한다.
- `VITE_`가 붙은 값은 브라우저에 노출되므로 비밀키를 넣지 않는다.

## 환경 값

| 환경              | `APP_ENV`     | `DATA_ENV`    | 데이터        | 결제           | 이메일            |
| ----------------- | ------------- | ------------- | ------------- | -------------- | ----------------- |
| 로컬              | `development` | `development` | 개발 Supabase | Toss 테스트 키 | 기본 차단         |
| Vercel Preview    | `preview`     | `preview`     | 스테이징 권장 | Toss 테스트 키 | 테스트 수신자로만 |
| Vercel Production | `production`  | `production`  | 운영 Supabase | Toss 운영 키   | 실제 수신자       |

로컬에서는 `.env.example`을 참고해 `.env.development.local`을 만들고 개발용 값만 넣는다. 운영 값은 로컬 파일에 복사하지 않고 Vercel의 Production 환경변수에 등록한다.

앱은 `APP_ENV`와 `DATA_ENV`가 어긋나면 시작을 중단한다. 따라서 로컬이나 Preview에서 실수로 `DATA_ENV=production`을 설정하면 운영 데이터에 접근하기 전에 오류가 발생한다.

## 배포 전 확인

1. 개발 Supabase에서 마이그레이션과 기능을 검증한다.
2. Preview 배포에서 화면과 OAuth Redirect URL을 검증한다.
3. 운영 마이그레이션을 명시적으로 실행한다.
4. Production의 `APP_ENV=production`과 운영 키를 확인한다.
5. Cron, 실제 이메일, 실제 결제는 운영에서만 활성화한다.

`npm run build`는 배포 중 원격 DB에 접근하지 않는다. DB 타입이 필요할 때만 `npm run db:typegen`을 별도로 실행하며, 운영 프로젝트에서는 `ALLOW_PRODUCTION_DATABASE_COMMANDS=true`를 명시해야 한다. 타입 생성이 실패해도 기존 `database.types.ts`는 유지된다.

`npm run db:migrate`는 `.env.development.local`을 우선으로 읽고 적용할 `DATA_ENV`를 먼저 표시한다. 운영 DB 마이그레이션은 `ALLOW_PRODUCTION_DATABASE_COMMANDS=true`를 명시하지 않으면 차단된다.

## 개발자 공개 포트폴리오

로컬 분석 결과를 운영에 게시하는 기능은 운영 DB 키를 로컬에 저장하는 방식으로 만들지 않는다. 배포 시에는 운영 서버에 관리자 전용 게시 API를 만들고, 로컬에서 공개 가능한 스냅샷만 서명된 요청으로 전송한다.

배포 전에는 다음 두 항목을 반드시 다시 확인한다.

- Pro 선물 워크플로우 미리보기의 운영 비노출
- 로컬 공개 포트폴리오 스냅샷을 운영 서버에 반영하는 게시 API
