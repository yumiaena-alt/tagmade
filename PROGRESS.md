# 인수인계 / 진행 문서

다른 사람·다른 계정·새 세션이 이 문서만 읽고 작업을 이어갈 수 있도록 쓴 문서입니다.

최종 갱신: 2026-08-06 · 커밋 `2ac7dfc` · 브랜치 `main`

---

## 1. 이어받는 데 필요한 접근 권한

| 대상 | 현재 소유 | 새 계정이 해야 할 일 |
| --- | --- | --- |
| GitHub 리포 | `yumiaena-alt/tagmade` (**private**) | 협업자로 초대받기. 없으면 클론 자체가 안 됩니다 |
| Vercel 프로젝트 | 팀 `limigogos-projects` / 프로젝트 `260804_tag`, 배포자 `yumiaena-alt` | 팀에 초대받기. 또는 본인 계정에서 `vercel link`로 새 프로젝트를 만들고 아래 환경변수를 다시 설정 |
| Clerk | **없음** — 커밋된 키는 보일러플레이트의 공유 데모 인스턴스(제3자 소유) | 로그인 기능을 쓸 거면 본인 Clerk 앱 생성 후 키 2개 설정 |
| 데이터베이스 | 없음 (의도적으로 제거) | 없음 |
| 폰트 | `public/fonts/NanumGothic-*.ttf` 리포에 커밋됨 | 없음 |

라이브: <https://260804tag.vercel.app> (커스텀 도메인 미연결)

## 2. 로컬에서 띄우기

Node.js 24 이상 필요.

```bash
git clone https://github.com/yumiaena-alt/tagmade.git
```

```bash
npm install
```

`.env.local`을 직접 만들어야 합니다. git에 없는 파일이고, 없으면 환경변수 검증에서
빌드가 실패합니다:

```
CLERK_SECRET_KEY=sk_test_replace_me
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

```bash
npm run dev
```

→ <http://localhost:3001> (**3000번이 아닙니다**. 원 개발 머신에서 다른 프로젝트가
3000번을 쓰고 있어 고정했습니다. 바꾸려면 `package.json`의 `dev` 스크립트)

### 커밋 전 게이트 6개 — 전부 통과해야 함

```bash
npm run check:types && npm test && npm run lint && npm run check:i18n && npm run check:deps && npm run build
```

`check:i18n`은 `src/locales/{ko,en,fr}.json` 키가 정확히 일치해야 통과합니다.
`check:deps`(knip)는 미사용 파일·export·의존성을 실패로 봅니다. `lefthook` 하나가
남는 건 보일러플레이트 원본 상태이므로 무시합니다.

## 3. 배포 운영

`main`에 push하면 Vercel이 자동으로 프로덕션 배포합니다 (약 1분).

```bash
vercel ls
```

```bash
vercel env ls
```

```bash
vercel deploy --prod
```

프로젝트에 설정된 환경변수 3개: `CLERK_SECRET_KEY`(자리표시자),
`NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SENTRY_DISABLED`. 자세한 내용은
[DEPLOY.md](DEPLOY.md).

## 4. 현재 상태

| 항목 | 상태 |
| --- | --- |
| 테스트 | 124개 통과 (node 유닛 + chromium 브라우저) |
| 타입·lint·i18n·knip·build | 전부 통과 |
| 배포 | 자동, 정상 |

### 동작하는 기능

- **혼용률 파싱** (FR-01) — 자유 입력 → 법정 표준 소재명, 별칭 80여 개. 커버리지 97%+
- **세탁 기호 룰 엔진** (FR-02) — KS K 0021 4단계 우선순위. 커버리지 100%
- **템플릿 17개** / 6개 카테고리 + 빈 캔버스. 썸네일은 실제 문서 데이터를 SVG로 렌더
- **캔버스 직접 편집** — 선택·드래그·핸들 리사이즈·텍스트 더블클릭 제자리 수정·Delete
- **작업 공간** — mm 눈금자, 줌(+/−/맞춤), 스크롤
- **페이지 속성** — 가로·세로 입력, mm/px/inch 전환, 프리셋 5종
- **되돌리기/다시 실행** — `Ctrl+Z` / `Ctrl+Shift+Z`, 60단계
- **인쇄용 벡터 PDF** — 문서 mm 크기 = PDF 페이지 크기. 한글 폰트 임베드
- **이미지 요소** — 업로드 → data URL 인라인 저장 (1MB 제한)
- ko(기본)/en/fr 3개 로케일, canonical·hreflang·sitemap

## 5. 되돌리면 안 되는 설계 결정

새 세션이 "정리"하려다 깨뜨리기 쉬운 것들입니다. 각각 이유가 있습니다.

1. **좌표는 밀리미터로 저장.** px·pt·inch는 렌더·표시 시점 변환일 뿐. 이것이 캔버스
   크기와 인쇄물 크기의 일치를 보장합니다.
2. **스토어 2개 분리** — `useDocumentStore`(작업물) / `useViewStore`(줌·단위·눈금자).
   줌은 작업물의 일부가 아닙니다. 합치면 템플릿 교체·PDF 출력이 뷰 상태에
   오염됩니다.
3. **문서 변경은 모두 `commit` 헬퍼를 지나감.** 그래서 되돌리기가 액션마다 붙지
   않고 전부 커버됩니다. 새 액션도 반드시 `commit`을 쓰세요.
4. **바코드·QR은 계산해서 벡터로 그림.** 예전엔 화면 밖 DOM에 렌더해 rect를 긁어왔고,
   그 방식 때문에 배경 사각형을 바로 오인해 심볼이 검게 덮이는 버그가 있었습니다.
   이미지로 굽지 마세요.
5. **DB 없음, 빌드는 `next build`.** DB 계층은 서로만 import하는 죽은 코드였고,
   빌드에 마이그레이션을 넣으면 Vercel에서 실패합니다. 되살리지 마세요.
6. **스튜디오는 `ssr:false`.** Konva에 실제 canvas가 필요하고 스토어가
   localStorage에서 복원됩니다. 대신 H1·리드문은 서버 렌더되어 색인됩니다.
7. **`t()`에 동적 키 금지.** next-intl 타입 검사와 `check:i18n` 정적 스캔이 둘 다
   막습니다. 리터럴 키 레코드로 조회하세요.
8. **세탁 기호는 최상위 순위가 결정, 하위 순위는 주의사항만 기여.** 울 60% + 스판 5%
   에서 스판 경고가 사라지지 않게 하려는 의도입니다.
9. **로그인·회원가입은 유지.** 공개 페이지 + 회원가입 가능이 제품 요구사항입니다.
   대시보드·조직 관리만 제거했습니다.

## 6. 다음 작업 (우선순위 순, 시작점 포함)

### 1순위 — 문서 JSON 내보내기·가져오기

**왜:** 작업물이 `localStorage`에만 있어서 브라우저 데이터를 지우거나 기기를 바꾸면
사라집니다. 라벨을 며칠에 걸쳐 고치는 실무 흐름에 위험합니다.

**시작점:** 문서가 이미 순수 데이터라 `JSON.stringify(doc)`가 그대로 됩니다.
`PropertiesPanel`에 내보내기·가져오기 버튼을 추가하거나 `DocumentIo.tsx`를 새로
만드세요. 가져올 때 검증이 필요합니다 — `useDocumentStore`의 `merge`에 있는
`widthMm`/`heightMm`/`elements` 형태 검사를 재사용하면 됩니다. 잘못된 파일로
캔버스가 깨지지 않게 하는 것이 핵심입니다. 테스트 추가 대상.

### 2순위 — 하단 플로팅 도구모음

**시작점:** `CanvasWorkspace`에 `absolute bottom-3 left-1/2` 로 배치. 동작은
`useDocumentStore`의 `addElement`를 그대로 씁니다(이미 있음). `ElementsPanel`의
`+ 요소 추가` 섹션을 옮길지 양쪽에 둘지 결정 필요. 줌 컨트롤과 겹치지 않게
확인하세요.

### 3순위 — 여러 페이지

**시작점:** 모델 변경이 필요합니다. `LabelDocument`를 `pages: LabelDocument[]` +
`activePageIndex` 구조로. 영향 범위: `templateCatalog`(모든 템플릿), 세 렌더러,
`useDocumentStore`, PDF는 페이지당 `<Page>` 하나. **되돌리기는 문서 스냅샷 방식이라
페이지 추가·삭제도 자동으로 커버됩니다.**

### 그 외

좌측 아이콘 레일, 배경색 지정, PNG 내보내기, 레이어 순서 변경(위/아래로 보내기),
커스텀 도메인 연결, en/fr의 `Features`·`FAQ` 문구 제품화(ko는 완료).

## 7. 알려진 제약

### 법적·규제 — 실제 인쇄 전 반드시 교체

- **KC 마크가 자리표시용 점선 도형입니다.** 등록된 지정 도형이라 임의로 그린 것을
  제품에 붙이면 규제 위반입니다. **새로 그리지 말고** 사용자가 `image` 요소로 정품
  파일을 올리게 하세요.
- **세탁 기호 아이콘이 근사 도형입니다.** 매칭 로직은 KS K 0021을 따르지만 아이콘은
  공인 아트워크가 아닙니다. 법적 의미는 옆에 인쇄되는 한글 문구가 담습니다.
  [careSymbolShapes.ts](src/features/label/careSymbolShapes.ts)의 path만 바꾸면 세
  렌더러에 동시 반영됩니다.

### 기타

- **작업물이 브라우저에만 저장됩니다** (1순위 작업으로 해결 예정).
- **Clerk 키가 자리표시자** — `/sign-in`·`/sign-up`은 열리지만 실제 인증은 안 됩니다.
- **이미지 요소는 PDF에서 래스터** (원본이 래스터이므로 당연). SVG 업로드 시 PDF에서
  벡터로 유지되는지는 미확인.
- 커스텀 도메인 미연결.

## 8. 검증할 때 조심할 것

**PDF는 "생성됐다"로 끝내지 마세요.** 바이트 수와 `%PDF` 헤더만 보면 내용이 비어도
통과합니다. 실제로 두 번 당했습니다 — 바코드가 검게 덮인 것을 놓쳤고, 그 다음엔
`re` 연산자만 세다가 "바가 없다"고 오진했습니다(@react-pdf는 SVG 사각형을 **경로
fill**로 내보냅니다). 콘텐츠 스트림을 `DecompressionStream('deflate')`로 풀어
연산자를 세고, MediaBox가 문서 mm 크기와 맞는지 확인하세요.

**브라우저 콘솔 버퍼는 지워지지 않습니다.** 이미 삭제한 파일을 가리키는 낡은 에러가
계속 보입니다. 권위 있는 출처는 dev 서버 로그와 `npm run build`입니다.

**Turbopack 캐시가 깨지면 전 경로 404입니다.** 빌드는 통과하는데 dev만 404면 코드
문제가 아닙니다. `.next`를 지우고 재시작하세요.

## 9. 작업 이력

| 커밋 | 내용 |
| --- | --- |
| `c850e89` | 스튜디오 초기 구축 (템플릿 갤러리 + 직접 편집 + 벡터 PDF) |
| `ab1c2e1` | canonical URL을 안정 도메인으로 |
| `ecffedb` | 배포 문서 |
| `94a679b` | DB·대시보드 스택 제거 |
| `a6e2565` | 템플릿 6개 추가 (11 → 17) |
| `f1a07e9` | 캔버스를 작업 공간으로 재구성, 미사용 마케팅 섹션 제거 |
| `18db4a2` | 되돌리기·다시 실행 |
| `2ac7dfc` | 문서 (README·PROGRESS·CLAUDE.md) |
