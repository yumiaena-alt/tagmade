# tagmade — 의류 라벨 스튜디오

의류 셀러·디자이너·생산 MD가 케어라벨·행택·수입 표시사항·KC 마크·물류 씰을
템플릿에서 불러와 캔버스에서 바로 편집하고, 인쇄용 벡터 PDF로 내려받는 웹 앱.

- 라이브: <https://260804tag.vercel.app>
- 리포: <https://github.com/yumiaena-alt/tagmade> (private)
- 배포 설정: [DEPLOY.md](DEPLOY.md)
- **인수인계·진행 문서: [PROGRESS.md](PROGRESS.md)** — 다른 계정이 이어받을 때 여기부터

원래 [ixartz/SaaS-Boilerplate](https://github.com/ixartz/SaaS-Boilerplate)를
뼈대로 시작했고, 쓰지 않는 DB·대시보드·요금제 스택은 제거했습니다.

## 실행 방법

Node.js 24 이상이 필요합니다 (`package.json`의 `engines`).

```bash
npm install
```

```bash
npm run dev
```

<http://localhost:3001> 에서 열립니다. **3000번이 아니라 3001번입니다** — 이
머신의 다른 프로젝트가 3000번을 쓰고 있어 고정해 뒀습니다
(`package.json`의 `dev` 스크립트).

`.env.local`이 없으면 만들어 주세요. 커밋되지 않는 파일이고, 값이 없으면 환경변수
검증에서 빌드가 실패합니다:

```
CLERK_SECRET_KEY=sk_test_replace_me
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### 자주 쓰는 명령

```bash
npm run build
```

```bash
npm test
```

```bash
npm run check:types
```

```bash
npm run check:i18n
```

```bash
npm run lint
```

```bash
npm run check:deps
```

커밋 전에 이 여섯 개가 모두 통과해야 합니다. `check:i18n`은 ko/en/fr 세 로케일의
키가 정확히 일치해야 통과하므로, 문구를 추가하면 세 파일을 모두 손대야 합니다.

## 핵심 구조

### 문서 모델이 중심입니다

템플릿은 그려진 그림이 아니라 **데이터**입니다 — 캔버스 크기 + 요소 배열
([documentModel.ts](src/utils/documentModel.ts)). 이 하나의 데이터가 세 렌더러를
구동합니다:

| 렌더러 | 파일 | 용도 |
| --- | --- | --- |
| SVG | [DocumentSvg.tsx](src/features/studio/DocumentSvg.tsx) | 템플릿 썸네일 |
| Konva | [DocumentCanvas.tsx](src/features/studio/DocumentCanvas.tsx) | 편집 캔버스 |
| PDF | [DocumentPdf.tsx](src/features/studio/DocumentPdf.tsx) | 인쇄용 출력 |

**좌표는 전부 밀리미터입니다.** 렌더러마다 배율만 다릅니다(화면은 px/mm, PDF는
pt/mm). 그래서 캔버스에 보이는 크기와 인쇄물 크기가 어긋날 수 없습니다.

요소 타입: `text` `rect` `divider` `hole` `barcode` `careSymbols` `qr` `image`.
타입을 추가하려면 `documentModel.ts`에 정의 → 세 렌더러에 case 추가 →
`useDocumentStore`의 `blankElement`에 기본값 추가.

템플릿 추가는 [templateCatalog.ts](src/utils/templateCatalog.ts) 데이터 편집 +
`Studio` 네임스페이스에 이름 키 추가 + `TemplatePanel`의 이름 레코드에 한 줄.
렌더러 코드는 건드리지 않습니다.

### 바코드·QR은 계산해서 벡터로 그립니다

라이브러리를 **인코딩 계산에만** 씁니다. 이미지로 굽지 않습니다.

- [barcodeMatrix.ts](src/utils/barcodeMatrix.ts) — `jsbarcode`의 `getModule`로
  Code 128 비트열을 얻어 가로 런으로 병합
- [qrMatrix.ts](src/utils/qrMatrix.ts) — `qrcode`의 `create`로 모듈 행렬을 얻어
  행별 런으로 병합

그래서 썸네일·캔버스·PDF가 같은 벡터 도형을 그립니다. 런 병합은 필수입니다 —
25×25 QR은 모듈 625개인데 런으로 묶으면 약 90개가 되어 PDF 스트림과 Konva 노드
수가 크게 줄어듭니다.

### 세탁 기호 자동 매칭 (KS K 0021)

- [fabricParser.ts](src/utils/fabricParser.ts) — 자유 입력 혼용률을 법적 표준
  소재명으로 변환. `코튼`→`면`, `스판`→`폴리우레탄` 등 별칭 80여 개
- [careRules.ts](src/utils/careRules.ts) — 4단계 우선순위(동물성 → 재생·식물성 →
  합성 → 기본). **최상위 순위가 기호 5종을 결정하고, 하위 순위의 주의사항은
  중복 제거 후 함께 노출됩니다** — 울 60%에 스판 5%가 섞였을 때 스판 경고가
  사라지지 않게 하기 위한 의도적 설계

### 상태 관리

| 스토어 | 담는 것 |
| --- | --- |
| [useDocumentStore](src/store/useDocumentStore.ts) | 문서, 선택, **되돌리기 히스토리** |
| [useViewStore](src/store/useViewStore.ts) | 줌, 표시 단위, 눈금자 표시 여부 |

두 개로 나눈 이유: 줌·단위는 "작업물을 어떻게 보고 있는가"이지 작업물의 일부가
아닙니다. 그래서 템플릿을 바꾸거나 PDF를 뽑을 때 영향이 없고, 나중에 여러 페이지·
모크업 뷰·스냅 그리드가 붙을 자리도 `useViewStore`입니다.

문서의 모든 변경은 `useDocumentStore`의 `commit` 헬퍼 하나를 지나갑니다. 그래서
되돌리기가 액션마다 붙지 않고 자동으로 전부 커버됩니다.

## 알아두면 좋은 함정

- **캔버스는 클라이언트 전용입니다.** Konva에 실제 canvas가 필요하고 스토어가
  localStorage에서 복원되므로 `StudioShellLoader`가 `ssr:false`로 로드합니다.
  대신 H1·리드문은 서버 렌더되어 색인됩니다.
- **`t()`에 동적 키를 넘기면 안 됩니다.** next-intl 타입 검사와 `check:i18n`의
  정적 스캔 둘 다 통과하지 못합니다. `TemplatePanel`처럼 리터럴 키로 레코드를
  만들어 조회하세요.
- **Turbopack 캐시가 깨지면 전 경로가 404가 됩니다.** 코드 문제로 오진하기 쉽습니다.
  `npm run build`는 통과하는데 dev만 404면 `.next`를 지우고 재시작하세요.
- **개발 서버가 3001번을 못 잡으면** 이전 인스턴스가 살아 있는 경우입니다.
- **캔버스 자동 맞춤에는 트리거가 두 개 필요합니다** — `fitRequested` 이펙트(버튼·
  템플릿 교체용)와 ResizeObserver(첫 페인트용). 하나만 두면 조용히 동작하지
  않습니다. 이유는 `CanvasWorkspace.tsx` 주석에 있습니다.
