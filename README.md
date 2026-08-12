# savecolor (다름색)

색각이상 인식 개선과 다름색 설립 지지를 위한 웹사이트입니다.

## 저장소 구조 (GitHub Pages 호환)

MySQL 대신 `data/` JSON 파일을 DB로 사용합니다.

| 파일 | 용도 |
|------|------|
| `data/signatures.json` | 지지서명 |
| `data/comments.json` | 지지 한마디 |
| `data/faq.json` | FAQ |
| `data/meta.json` | 기준 서명 수 등 메타 |

자세한 스키마는 `schema.sql`(문서)을 참고하세요.

## GitHub Pages

- 사이트: https://blackteabang.github.io/savecolor/
- JSON 파일은 Pages에서 **읽기** 가능합니다.
- **쓰기**(서명/댓글/관리자)는 로컬 Express 서버가 필요합니다.

## 로컬 실행

```bash
cp .env.example .env
npm install
npm run setup
npm start
```

기본 주소: http://localhost:7749  
관리자: http://localhost:7749/admin
