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

**요소는 문서가 아니라 페이지에 있습니다.** `doc.elements`는 없습니다.
`doc.pages[i].elements`이고, 편집 화면에서 읽을 때는 `useActiveElements()`를 쓰세요.
스토어 안에서는 `mapElements`·`addToPage`가 `activePageIndex`를 받습니다. 이걸
우회해 `doc.pages[0]`을 직접 건드리면 2페이지에서 조용히 1페이지가 바뀝니다.

## 작업 시 주의

- **요소 타입 추가**: `documentModel.ts` 정의 → `DocumentSvg`·`DocumentCanvas`·
  `DocumentPdf` 세 곳에 case → `useDocumentStore`의 `blankElement` 기본값 →
  `Editor` 네임스페이스에 라벨 키 → `useEditorFieldLabels`에 한 줄. 세 렌더러 중
  하나를 빠뜨리면 조용히 안 그려집니다.
  `ADDABLE_TYPES`에도 넣는다면 `useAddElementLabels`(이름)와 `CanvasToolbar`의
  `ADD_ICONS`(아이콘) 두 레코드가 타입으로 강제되므로 함께 채워야 컴파일됩니다.
- **템플릿 추가**: `templateCatalog.ts` 데이터 + `Studio` 네임스페이스 이름 키 +
  `TemplatePanel`의 `templateNames` 한 줄. 렌더러는 건드리지 않습니다.
- **문서 변경 액션 추가**: `useDocumentStore`의 `commit` 헬퍼를 지나게 하세요.
  그러면 되돌리기가 자동으로 커버됩니다. 연속 편집을 합칠 대상이면
  `coalesceKey`를 넘기고, 개별 되돌리기 대상이면 생략하세요.
- **문서 필드 추가**: 저장된 문서가 들어오는 경계가 셋입니다 —
  `useDocumentStore`의 `merge`(localStorage), `documentFile.ts`의 `parseDocument`
  (파일), `useUserTemplateStore`의 `merge`(내 템플릿). 셋 다 `toPagedDocument`를
  지나므로 모양 변경은 거기에 얹으세요. 파일 형식이 옛 빌드와 호환되지 않게
  바뀌면 `FILE_VERSION`도 올립니다.

## 검증 습관

**PDF 출력은 "생성됐다"로 끝내지 마세요.** 바이트 수와 `%PDF` 헤더만 보면 내용이
비어도 통과합니다. 실제로 이 함정에 두 번 빠졌습니다:

- 바코드 배경 사각형이 바로 오인되어 심볼 전체를 검게 덮고 있었는데, 헤더·크기만
  확인해서 놓쳤습니다
- 그 다음엔 `re`(사각형) 연산자만 세다가 "바가 없다"고 오진했습니다. @react-pdf는
  SVG 사각형을 **경로 fill로** 내보냅니다

콘텐츠 스트림을 `DecompressionStream('deflate')`로 풀어 연산자를 세고, MediaBox가
문서의 mm 크기와 일치하는지 확인하세요. 스트림을 자를 때는 `endstream`까지가
아니라 **딕셔너리의 `/Length` 값만큼** 잘라야 합니다. 뒤에 붙는 줄바꿈 한 바이트
때문에 `DecompressionStream`이 "Junk found after end of compressed data"로 죽습니다.
`endstream` 안에도 `stream`이 들어 있어 단순 검색은 오프셋이 어긋납니다.

여러 페이지가 된 뒤로는 **페이지 수와 페이지별 내용**까지 봐야 합니다. `/Type /Page`
개수, MediaBox가 페이지마다 같은지, 그리고 각 페이지 콘텐츠 스트림의 연산자 수가
서로 다른지(= 페이지가 실제로 다른 그림인지) 확인하세요.

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
