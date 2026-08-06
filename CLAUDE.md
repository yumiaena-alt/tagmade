# CLAUDE.md

의류 라벨 스튜디오. 배경과 실행 방법은 [README.md](README.md), 현재 상태·인수인계·
남은 작업은 [PROGRESS.md](PROGRESS.md), 배포는 [DEPLOY.md](DEPLOY.md)를 먼저 읽으세요.

## 반드시 지킬 것

**커밋 전 여섯 게이트를 모두 통과해야 합니다.**

```bash
npm run check:types && npm test && npm run lint && npm run check:i18n && npm run check:deps && npm run build
```

- `check:i18n`은 `src/locales/{ko,en,fr}.json`의 키가 **정확히 일치**해야 통과합니다.
  문구를 추가하면 세 파일 모두 손대세요. 쓰지 않는 키가 남으면 실패합니다.
- `check:deps`(knip)는 미사용 파일·export·의존성을 실패로 봅니다. 코드를 지웠으면
  딸린 export와 로케일 키까지 정리하세요. `lefthook` 하나는 보일러플레이트 원본
  상태이므로 무시합니다.

**`t()`에 동적 키를 넘기지 마세요.** next-intl 타입 검사와 `check:i18n` 정적 스캔이
둘 다 막습니다. 리터럴 키로 레코드를 만들어 조회하세요:

```ts
const names: Record<Mode, string> = { a: t('name_a'), b: t('name_b') };
```

**기하는 밀리미터로 저장합니다.** px·pt·inch는 렌더링·표시 시점 변환일 뿐입니다.
이 규칙이 캔버스 크기와 인쇄물 크기의 일치를 보장합니다.

## 작업 시 주의

- **요소 타입 추가**: `documentModel.ts` 정의 → `DocumentSvg`·`DocumentCanvas`·
  `DocumentPdf` 세 곳에 case → `useDocumentStore`의 `blankElement` 기본값 →
  `Editor` 네임스페이스에 라벨 키 → `useEditorFieldLabels`에 한 줄. 세 렌더러 중
  하나를 빠뜨리면 조용히 안 그려집니다.
- **템플릿 추가**: `templateCatalog.ts` 데이터 + `Studio` 네임스페이스 이름 키 +
  `TemplatePanel`의 `templateNames` 한 줄. 렌더러는 건드리지 않습니다.
- **문서 변경 액션 추가**: `useDocumentStore`의 `commit` 헬퍼를 지나게 하세요.
  그러면 되돌리기가 자동으로 커버됩니다. 연속 편집을 합칠 대상이면
  `coalesceKey`를 넘기고, 개별 되돌리기 대상이면 생략하세요.

## 검증 습관

**PDF 출력은 "생성됐다"로 끝내지 마세요.** 바이트 수와 `%PDF` 헤더만 보면 내용이
비어도 통과합니다. 실제로 이 함정에 두 번 빠졌습니다:

- 바코드 배경 사각형이 바로 오인되어 심볼 전체를 검게 덮고 있었는데, 헤더·크기만
  확인해서 놓쳤습니다
- 그 다음엔 `re`(사각형) 연산자만 세다가 "바가 없다"고 오진했습니다. @react-pdf는
  SVG 사각형을 **경로 fill로** 내보냅니다

콘텐츠 스트림을 `DecompressionStream('deflate')`로 풀어 연산자를 세고, MediaBox가
문서의 mm 크기와 일치하는지 확인하세요.

**브라우저 콘솔 버퍼는 지워지지 않습니다.** 이미 삭제한 파일을 가리키는 낡은
에러가 계속 보입니다. 권위 있는 출처는 dev 서버 로그와 `npm run build`입니다.

**Turbopack 캐시가 깨지면 전 경로가 404입니다.** 빌드는 통과하는데 dev만 404면
코드 문제가 아닙니다. `.next`를 지우고 재시작하세요.

## 하지 말 것

- **KC 마크나 KS 세탁 심볼의 정품 아트워크를 그려 넣지 마세요.** 등록된 지정
  도형이라 근사해서 만든 것을 제품에 붙이면 규제 위반입니다. 자리표시 도형을
  유지하고 사용자가 `image` 요소로 정품 파일을 올리게 하세요.
- **`.env`에 실제 시크릿을 넣지 마세요.** 커밋되는 파일입니다. 시크릿은
  `.env.local`(git-ignored) 또는 Vercel 환경변수에 둡니다.
