# savecolor (다름색)

색각이상 인식 개선과 다름색 설립 지지를 위한 웹사이트입니다.

## 구성

- **화면**: GitHub Pages (정적) 또는 로컬 Express
- **API 서버**: Express (`server.js`)
- **저장소**: MySQL/MariaDB (`signatures`, `support_comments`)
- **FAQ**: `faq.json` 파일

## 공개 주소 (Cloudflare Tunnel)

- https://savecolor.jashin.org
- 이 PC의 Express(`localhost:7749`) + MySQL을 Cloudflare Tunnel로 공개합니다.
- 터널 설정: `%USERPROFILE%\.cloudflared\savecolor-config.yml`
- 터널 시작: `%USERPROFILE%\.cloudflared\start-savecolor-tunnel.vbs`

### DNS (jashin.org Cloudflare 대시보드)

`cloudflared` 인증서가 `refurbish.co.kr` 계정용이라, `jashin.org` 존에는 아래 레코드를 **직접** 추가해야 합니다.

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `savecolor` | `abfac7bc-015e-425a-a4a4-e64f3395f282.cfargotunnel.com` | Proxied (주황 구름) |

추가 후 https://savecolor.jashin.org 로 접속하면 됩니다.

`config.js`의 `window.API_BASE`는 이미 이 주소로 설정되어 있어, GitHub Pages에서도 같은 API를 사용합니다.

## 로컬 실행

```bash
cp .env.example .env
npm install
npm run setup
npm start
```

- 사이트: http://localhost:7749
- 관리자: http://localhost:7749/admin

`.env`에 MySQL 접속 정보(`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`)를 넣어야 합니다.

## API 서버 배포 (Render 등)

Render 등에 배포할 때도 MySQL(또는 호환 DB)이 필요합니다.  
배포 후 발급된 API 주소를 `config.js`에 넣으세요.

```js
window.API_BASE = 'https://your-api.onrender.com';
```
