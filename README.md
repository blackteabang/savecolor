# savecolor (다름색)

색각이상 인식 개선과 다름색 설립 지지를 위한 웹사이트입니다.

## 구성 (권장)

- **호스팅**: Cloudflare Pages (정적 + Functions)
- **DB**: Cloudflare D1 (`signatures`, `support_comments`, `faq`)
- **API**: `functions/api/[[path]].js` → `/api/*`

## Cloudflare 배포

### 1) 준비

```bash
npm install
npx wrangler login
```

### 2) D1 생성 · 마이그레이션 · FAQ 시드

```bash
npx wrangler d1 create savecolor
```

출력된 `database_id`를 `wrangler.toml`의 `[[d1_databases]].database_id`에 넣습니다.

```bash
npm run cf:migrate:remote
npm run cf:seed:remote
```

### 3) 시크릿 / 환경변수

Pages 프로젝트에 아래를 설정합니다 (대시보드 또는 CLI).

```bash
npx wrangler pages secret put ADMIN_PW --project-name=savecolor
npx wrangler pages secret put ADMIN_TOKEN --project-name=savecolor
```

`wrangler.toml`의 `[vars]`에 `ADMIN_ID`, `BASE_SIGNATURES`가 있습니다. 필요하면 대시보드에서 덮어쓰세요.

### 4) 배포

```bash
npm run cf:deploy
```

배포 후 `config.js`의 `window.API_BASE`는 빈 문자열(`''`)이라 **같은 도메인**의 `/api`를 사용합니다.

### 5) 커스텀 도메인 (`savecolor.org`)

Pages에 `savecolor.org` / `www.savecolor.org` 를 연결한 뒤, DNS(존 `savecolor.org`)에 proxied CNAME을 둡니다.

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `@` | `savecolor.pages.dev` | Proxied |
| CNAME | `www` | `savecolor.pages.dev` | Proxied |

대시보드: [Pages domains](https://dash.cloudflare.com/7116b107cc1e5d0daaa486106e41bf75/pages/view/savecolor) · [DNS](https://dash.cloudflare.com/7116b107cc1e5d0daaa486106e41bf75/eba910ec1d25fd70bd4a19fdae8ee31b/dns/records)

API 토큰(`Zone:DNS:Edit`)이 있으면:

```bash
export CLOUDFLARE_API_TOKEN=...
node scripts/setup-savecolor-dns.js
```


### 로컬 Pages + D1

```bash
npm run cf:migrate:local
npm run cf:seed:local
npm run cf:dev
```

## 로컬 Express + MySQL (대안)

PC + Cloudflare Tunnel 방식으로 돌릴 때:

```bash
cp .env.example .env
npm install
npm run setup
npm start
```

- 사이트: http://localhost:7749
- 터널: `%USERPROFILE%\.cloudflared\start-savecolor-tunnel.vbs`
- 이 모드에서는 `config.js`에 `window.API_BASE = 'https://savecolor.org'` 를 넣으세요.

## 관리자

- 경로: `/admin`
- 기본 계정: `.env` / Pages secrets의 `ADMIN_ID` / `ADMIN_PW`
