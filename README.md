# EOKKA

## Overview

국내 보유 주식의 현재 수익률과 1억 도달 시나리오를 분석하는 서비스입니다.

## Getting Started

기본값은 금융위원회 공공데이터를 사용하는 국내주식 모드입니다.

```dotenv
STOCK_MARKET_MODE=domestic
```

금융위원회 주식 시세 공공데이터 API의 일반 인증키를 발급받은 뒤 `.env`에 다음 값을 추가합니다. 인코딩 또는 디코딩 인증키를 모두 사용할 수 있습니다.

일반 주식과 ETF·ETN을 모두 사용하려면 공공데이터포털에서 `금융위원회_주식시세정보`와 `금융위원회_증권상품시세정보` 두 API를 각각 활용신청해야 합니다.

```dotenv
FSC_STOCK_API_KEY=발급받은_일반_인증키
```

종목 목록은 다음 명령으로 최신 거래일 기준 동기화합니다.

```bash
npm run stocks:sync
```

시세 이력은 사용자가 분석할 때 최근 10년 데이터를 처음 한 번 가져와 Supabase의 `stock_prices` 테이블에 캐시합니다. 이후에는 한국시간 오후 2시를 기준으로 하루 한 번 최근 시세만 확인하고, 새 거래일 데이터가 있으면 캐시에 추가합니다. 주말·공휴일과 같은 날의 반복 분석에는 기존 캐시를 재사용합니다. 금융위원회 데이터는 수정주가가 아니므로 액면분할·병합 같은 기업행사가 과거 수익률에 영향을 줄 수 있습니다.

## KIS 로컬 테스트 모드

국내·미국 주식을 KIS 시세로 로컬 테스트하려면 `.env`를 다음처럼 설정하고 개발 서버를 다시 시작합니다.

```dotenv
STOCK_MARKET_MODE=global-test
KIS_APP_KEY=발급받은_AppKey
KIS_APP_SECRET=발급받은_AppSecret
```

미국 종목 자동완성 목록은 최초 한 번, 필요할 때 다시 동기화합니다.

```bash
npm run stocks:sync:kis
npm run dev
```

`global-test`에서는 국내주식과 미국주식을 검색할 수 있고 평균 매수가 입력란에 원화/달러 토글이 나타납니다. 다시 금융위원회 방식으로 돌아갈 때는 `STOCK_MARKET_MODE=domestic`으로 바꾸고 개발 서버를 재시작하면 됩니다. KIS 개인용 시세의 제3자 제공 제한 때문에 `global-test`는 프로덕션 환경에서 실행되지 않도록 막혀 있습니다.

## Rate limiting

배포 환경에서는 애플리케이션이 직접 인터넷에 노출되지 않고 신뢰할 수 있는 프록시 뒤에 있을 때만 실제 클라이언트 IP 헤더를 설정합니다.

```dotenv
# Cloudflare를 사용하는 경우
RATE_LIMIT_IP_HEADER=cf-connecting-ip
```

프록시가 해당 헤더를 덮어쓴다는 보장 없이 `x-forwarded-for` 또는 `x-real-ip`를 신뢰하면 사용자가 요청 제한을 우회할 수 있습니다. 운영 환경에서는 Cloudflare 등의 외부 Rate Limiting도 함께 사용합니다.

## License

See [LICENSE.md](./LICENSE.md) for details.
