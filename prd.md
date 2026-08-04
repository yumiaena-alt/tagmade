# [PRD] Smart Apparel Label & Barcode Generator (Next.js & Vibe Coding)

## 1. 프로젝트 개요 (Overview)
* **프로젝트명:** Smart Label & Barcode Generator
* **목적:** 의류 셀러, 디자이너, 생산 MD가 공장 발주 및 상세페이지용 라벨, 세탁 기호, SKU 바코드를 1초 만에 자동 생성하고 인쇄용 고해상도 PDF로 다운로드하는 웹 서비스
* **개발 방식:** Claude Code를 활용한 바이브 코딩 (Vibe Coding)
* **핵심 가치 (USP):**
  1. **유료 AI 토큰 비용 0원:** 정규표현식(RegEx) 기반 파싱 및 Rule 엔진 탑재
  2. **100% 법적 세탁 규정(KS K 0021) 자동 매칭:** 민감 소재 우선순위 매칭 로직
  3. **실시간 캔버스 편집 & SKU 바코드(Code 128) 생성**
  4. **비회원 로컬 스토리지 데이터 자동 보관 (재방문 유도)**

---

## 2. 기술 스택 및 오픈소스 (Tech Stack)
* **Boilerplate:** ixartz/SaaS-Boilerplate (https://github.com/ixartz/SaaS-Boilerplate)
* **Framework:** Next.js (App Router), TypeScript, Tailwind CSS
* **Canvas Editor:** React Konva (`react-konva`, `konva`)
* **PDF Exporter:** `@react-pdf/renderer` (인쇄용 Vector PDF 생성)
* **State & Local Storage:** Zustand (`zustand` + persist middleware)
* **Barcode Engine:** `react-barcode` (Code 128 지원)

---

## 3. 핵심 기능 요구사항 (Functional Requirements)

### FR-01: 혼용률 추출 및 표준화 엔진 (`lib/utils/fabricParser.ts`)
* **Input:** 사용자 자유 입력 텍스트 (예: "면 80% 폴리 20%", "코튼80 스판5 나일론15")
* **Logic:**
  1. 정규표현식 `/([가-힣a-zA-Z]+)[^0-9]*(\d+(?:\.\d+)?)/g` 사용해 소재와 비율 추출
  2. 사전 매핑 딕셔너리로 법적 표준명 변환 (`코튼` -> `면`, `스판` -> `폴리우레탄`)
* **Output:** JSON 객체 (예: `{ "면": 80, "폴리에스터": 20 }`)

### FR-02: 세탁 기호 룰 엔진 (`lib/utils/careRules.ts`)
* **Input:** 정제된 혼용률 JSON
* **Logic (우선순위 하향식 검사):**
  * **1순위 (동물성):** 울/모, 실크, 캐시미어 1% 이상 포함 시 -> 드라이클리닝 필수, 기계건조 금지
  * **2순위 (재생/식물성):** 레이온, 린넨 -> 손세탁/드라이클리닝 권장
  * **3순위 (합성):** 폴리우레탄(스판), 나일론 -> 저온 다림질, 건조기 사용 주의
  * **4순위 (기본):** 면 100% -> 일반 물세탁 40℃
* **Output:** 세탁 아이콘 5종 코드 및 주의사항 텍스트 배열

### FR-03: SKU 바코드 생성 및 실시간 캔버스 (`components/LabelCanvas.tsx`)
* **SKU 바코드:** `react-barcode`를 이용해 SKU 텍스트(예: `BVRI-2026-TS-S`)를 Code 128 바코드로 렌더링
* **React Konva 연동:** 
  * 라벨 크기: 30mm x 70mm 비율 카드
  * 브랜드 로고, 세탁 기호 아이콘, 바코드, 주의사항 텍스트가 캔버스 위에 배치되며 마우스 드래그로 미세 위치 조정 가능

### FR-04: 로컬 스토리지 연동 (`store/useLabelStore.ts`)
* Zustand `persist` 미들웨어를 사용하여 생성된 라벨 데이터(최대 5개)를 브라우저 `localStorage`에 자동 저장
* "최근 작성한 라벨 불러오기" UI 제공 (회원가입/DB 불필요)

### FR-05: 인쇄용 PDF 내보내기 (`components/PdfExportButton.tsx`)
* `@react-pdf/renderer`를 사용하여 화면 캡처가 아닌 300DPI 이상의 인쇄용 벡터 PDF 생성 및 다운로드

---

## 4. 클로드 코드 바이브 코딩 실행 단계 (Prompts)

### [Phase 1] 템플릿 설치 및 패키지 세팅
`ixartz/SaaS-Boilerplate` 기반 프로젝트 루트에서 다음 패키지들을 설치하고 `npm run dev`로 정상 작동 확인.
`npm install react-konva konva @react-pdf/renderer zustand react-barcode`

### [Phase 2] 로직 파이프라인 연동
`lib/utils/fabricParser.ts`와 `lib/utils/careRules.ts`를 구현하고 단위 테스트 진행.

### [Phase 3] 메인 페이지 UI 구축
좌측 입력 폼 + 우측 React Konva 미리보기 카드가 배치된 반응형 대시보드 페이지 구현.