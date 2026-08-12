# savecolor (다름색)

색각이상 인식 개선과 다름색 설립 지지를 위한 웹사이트입니다.

## 구성

- **화면**: GitHub Pages (정적)
- **API 서버**: Express (`server.js`)
- **저장소**: `data/` 아래 JSON 파일

| 파일 | 용도 |
|------|------|
| `data/signatures.json` | 지지서명 |
| `data/comments.json` | 지지 한마디 |
| `data/faq.json` | FAQ |
| `data/meta.json` | 기준 서명 수 등 |

## 사이트

- 공개 주소: https://blackteabang.github.io/savecolor/
- `config.js`의 `window.API_BASE`가 비어 있으면 읽기 전용 데모로 동작합니다. (입력값은 방문자 브라우저에만 임시 저장)

## API 서버 배포 (Render 무료 플랜)

1. https://render.com 가입 후 **New → Web Service** 선택
2. 이 GitHub 저장소(`blackteabang/savecolor`) 연결
3. 설정값
   - Runtime: `Node`
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Instance Type: `Free`
4. Environment에 관리자 값 추가
   - `ADMIN_ID`, `ADMIN_PW`, `ADMIN_TOKEN`
5. 배포 후 발급된 주소(예: `https://savecolor-api.onrender.com`)를 `config.js`에 입력

```js
window.API_BASE = 'https://savecolor-api.onrender.com';
```

6. 변경한 `config.js`를 커밋·푸시하면 Pages에서도 서명·한마디가 서버에 저장됩니다.

`render.yaml`이 포함되어 있어 Render의 **Blueprint** 방식으로도 배포할 수 있습니다.

### 무료 플랜 주의사항

- 일정 시간 요청이 없으면 서버가 잠들어, 첫 접속 시 최대 1분 정도 깨어나는 시간이 필요합니다. (사이트가 자동으로 미리 깨웁니다)
- Render 무료 플랜은 디스크가 재배포 시 초기화되므로, 누적된 서명은 정기적으로 백업하거나 유료 디스크/외부 DB 사용을 권장합니다.

## 로컬 실행

```bash
cp .env.example .env
npm install
npm run setup
npm start
```

- 사이트: http://localhost:7749
- 관리자: http://localhost:7749/admin
