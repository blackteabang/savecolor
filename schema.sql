# JSON 파일 기반 저장소 (GitHub Pages 호환)

이 프로젝트는 MySQL 대신 `data/` 디렉터리의 JSON 파일을 DB처럼 사용합니다.
GitHub Pages에서는 이 파일들을 정적 자산로 읽고, 로컬/서버에서는 Express API로 읽고 씁니다.

## 파일 구조

### data/meta.json
```json
{
  "baseSignatures": 8421,
  "updatedAt": "2026-08-12T00:00:00.000Z"
}
```

### data/signatures.json
```json
[
  {
    "id": 1,
    "name": "홍길동",
    "email": "hong@example.com",
    "agreed": true,
    "created_at": "2026-08-12T00:00:00.000Z"
  }
]
```

### data/comments.json
```json
[
  {
    "id": 1,
    "name": "응원자",
    "message": "함께해요",
    "likes": 0,
    "created_at": "2026-08-12T00:00:00.000Z"
  }
]
```

### data/faq.json
```json
[
  {
    "id": 1,
    "category": "기초",
    "question": "질문",
    "answer": "답변",
    "sources": []
  }
]
```

루트 `faq.json`은 Pages 호환을 위해 `data/faq.json`과 동기화됩니다.
