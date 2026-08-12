# savecolor (다름색)

색각이상 인식 개선과 다름색 설립 지지를 위한 웹사이트입니다.

## GitHub Pages

- 사이트: https://blackteabang.github.io/savecolor/
- 정적 페이지(소개, FAQ, 시각 체험 등)는 Pages에서 바로 확인할 수 있습니다.
- 지지서명 / 지지 한마디 / 관리자 API는 Express + MySQL 서버가 필요합니다. 로컬 또는 별도 호스팅에서 `node server.js`로 실행하세요.

## 로컬 실행

```bash
cp .env.example .env
npm install
node setup-db.js
node server.js
```

기본 포트는 `.env`의 `PORT`(현재 7749)입니다.
