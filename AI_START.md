# AI_START — hunt-now (헌트 나우: 정화의 사냥꾼)

다른 AI(다른 Grok 계정, 저가 Grok, ChatGPT/Codex)가 이 저장소를 이어받을 때 가장 먼저 읽는 문서. Read this first.

- 라이브 / Live: https://junsa80.github.io/hunt-now/ · 저장소: https://github.com/junsa80/hunt-now (public, Pages = main /)
- 담당 / Owner: Grok 계열 (Grok, Grok Bot). 현재 버전 v6.0 (SW 캐시 `hunt-now-v6.0`, 사냥 Lv 선택·긴급 의뢰). 버전별 내용은 HANDOFF.md.

## 읽는 순서 / Read order
1. 이 파일 → 2. `HANDOFF.md`(현재 상태·남은 일) → 3. `README.md`(조작·무기·몬스터·변경 기록) → 4. `docs/mhnow-gap.md`(몬헌 나우와의 차이) → 5. 코드: `data.js`(몬스터·무기·대사) → `main.js`(전투·AI·UI·저장) → `chars.js`(캐릭터) → `fx.js`(연출) → `sw.js`.

## 사용자 방향 / User direction
- 조작감을 몬스터 헌터 나우에 최대한 가깝게. 동료는 종마다 한 명(중복 없음), 영입은 어렵게(정화: 점수 70+, 몬스터 Lv2+, 부위 파괴 1+). 무기 7종의 손맛 차이.

## 실행·테스트 / Run & test
- 빌드 없음(정적 HTML + vendor/three). 로컬: `python3 -m http.server 18923` 후 http://127.0.0.1:18923/
- 자동 테스트(헤드리스 Chrome, 실제 폰 아님): Node 20+, `npm i puppeteer-core@24` (전역 아무 곳), Chrome/Chromium.
  `NODE_PATH=<puppeteer-core가 있는 node_modules의 상위>/node_modules CHROME=/usr/bin/google-chrome URL=http://127.0.0.1:18923/ SHOTS=/tmp/shots node test/touch-v2.js` (41항목), 같은 방식으로 `test/feel-v4.js` (23항목).
- 셸이 없는 채팅 AI(무료/저가 Grok 채팅, ChatGPT 웹)는 테스트를 못 돌린다 → 작은 수정만, "테스트 미실행"이라고 HANDOFF에 적는다.

## 협업 규칙 / Collaboration rule (2026-10-20, 사용자 합의)
- GitHub `main` = 유일한 기준(single source of truth). 채팅·작업 상자·ChatGPT Sites에만 있는 건 없는 것으로 본다.
- 한 게임은 한 번에 AI 하나만 작업 (one AI per game at a time). 담당: Grok 계열 = hunt-now, beauty-deck, game-hub / GPT = 나머지(rose-spire, prism-muse, muse-studio, world-breaker, aster-hunt, last-archive, companion-guild, ember-tactics, fogbound-tactics) / SRPG 봇 = srpg-prototype.
- 큰 변경은 브랜치(`grok/...`, `gpt/...`, `grokbot/...`)에서 → 테스트 → main 병합. Big changes on a branch, then merge.
- 커밋 접두어 / commit prefix: `[Grok]`(Grok 채팅), `[GPT]`(ChatGPT/Codex), `[GrokBot]`(Grok Bot).
- 완료 = GitHub에서 커밋이 확인됨 (done = commit confirmed on GitHub, e.g. `https://github.com/junsa80/<repo>/commits/main`).
- 순서 / order: 소스 받기(pull) → 작업 → 테스트 → 커밋 → HANDOFF.md 갱신 → 배포 확인.
- 처음부터 다시 만들지 않는다. Never rebuild from scratch; continue from main.
- 검증 보고는 자동 테스트와 실제 폰 테스트를 나눠 쓰고, 안 한 확인을 했다고 쓰지 않는다. Report automated vs real-phone tests separately; never claim unverified checks.

## 핵심 제약 / Key constraints
- 모든 캐릭터는 성인(20대 이상), 단정한 복장, 성적 콘텐츠 없음. 실존 인물과 닮은 그림 금지. Adults only, fully clothed, no sexual content, no real-person likeness.
- rose-spire의 숙련 문턱 기준 0 / 16 / 40 / 80 / 140 은 rose-spire 전용 메모다. 1·4·9 문턱이나 "18KB 패치"는 적용하지 않는다. 다른 게임에 이 숫자를 옮기지 않는다. (Rose-spire-only note; don't apply elsewhere.)
- 비밀번호·토큰·인증 코드를 요청하거나 출력하지 않는다. Never request or print secrets.
- 저장소 공개/비공개 전환, 권한·앱 설치 변경은 사용자만 한다. Visibility/permission changes are user-only.
- 저장 형식을 바꾸면 이전 저장을 이관(migrate)하고 JSON 백업 내보내기/가져오기를 유지한다.

## 배포 / Deploy (GitHub Pages)
- Pages 소스: `main` 브랜치 루트(`/`). main에 푸시하면 1~2분 뒤 자동 반영. 루트에 `.nojekyll` 유지.
- 코드·자산을 바꾸면 `sw.js`의 캐시 버전 상수와 `index.html`의 `?v=` 쿼리를 올린다 (service worker version bump). 안 올리면 폰에 옛 화면이 남는다.
- 확인: 라이브 URL에서 `sw.js`를 열어 새 버전 문자열이 보이는지 확인 (`curl -s <live>/sw.js | head -3`).

## GPT 게임이 바뀌었을 때 선택기 복사본 갱신 / Updating hub hosted copies
prism-muse, muse-studio, world-breaker, rose-spire 는 비공개 저장소라, 선택기(`junsa80/game-hub`)의 `play/<이름>/` 에 정적 복사본을 둔다. GPT가 원본 main을 바꿔도 복사본은 자동으로 안 바뀐다.
1. 담당 AI(보통 Grok 계열, 셸 있는 환경)가 원본 main을 클론(읽기만, 원본 저장소에는 푸시 금지 — 특히 rose-spire).
2. `game-hub/docs/BUILD_PLAY_COPIES.md` 의 명령대로 다시 만든다 (rose-spire·muse-studio: `tools/make_static_copy.py`, world-breaker: 파일 복사, prism-muse: `tools/patches/prism-muse-static.patch` 적용 후 Next 정적 빌드).
3. `games.json`의 `commit` 값을 복사한 원본 커밋으로 갱신, 허브 `sw.js` 버전과 `?v=` 올림, `[GrokBot]`/`[Grok]` 커밋, 라이브 확인.
4. 새 그림이 들어왔으면 성인·단정한 복장·실사 인물 아님을 먼저 확인하고 올린다.
