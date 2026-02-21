# Personal Lab Dashboard

개인 건강검진/혈액/소변 검사 결과를 **로컬 SQLite DB**에 저장하고, 날짜별 추이를 시각화하는 Next.js 웹앱입니다.

이 문서는 "이 프로젝트를 처음 보는 사람"을 기준으로 작성되었습니다.  
아래 순서대로 따라가면 설치부터 데이터 입력, 백업까지 한 번에 확인할 수 있습니다.

## 1) 이 프로젝트로 할 수 있는 것

- 검사 결과를 직접 입력(수동 입력)
- 병원 결과 텍스트를 붙여넣어 일괄 저장(텍스트 Import)
- CSV를 붙여넣어 일괄 저장(CSV Import)
- 카테고리별 최신 수치 + 스파크라인 확인(대시보드)
- 항목별 상세 차트/테이블/해설 확인(최근 3개월/1년/3년/전체)
- 전체 결과를 테이블에서 검색/정렬
- JSON/CSV 내보내기
- DB 백업 생성/목록 확인/원본 DB 다운로드/DB 복원

## 2) 기술 스택

- 프레임워크: Next.js 15 (App Router)
- 언어: TypeScript (`strict: true`)
- UI: Tailwind CSS
- 차트: Chart.js + react-chartjs-2
- 데이터베이스: SQLite (`better-sqlite3`)
- 테스트: Vitest

## 3) 프로젝트 구조 (처음 볼 때 핵심만)

```text
src/
  app/
    dashboard/               # 메인 화면(대시보드/입력/테이블/백업·복원/상세)
    api/                     # 백업/내보내기 API
  components/dashboard/      # 대시보드 전용 UI
  components/ui/             # 공용 UI 컴포넌트
  lib/
    auth.ts                  # 접근 제어(로컬 또는 Cloudflare)
    request-security.ts      # same-origin + rate limit
    data/repository.ts       # DB 조회/저장 로직
    import/parser.ts         # 텍스트/CSV 파서
    test-explanations.ts     # 검사 항목 설명/매칭
    backup.ts                # 백업 생성/정리
    restore.ts               # 복원 업로드 검증/실행
    db/                      # SQLite 연결/스키마 초기화
scripts/
  init-db.mjs                # DB 초기화
  seed-demo.mjs              # 데모 데이터 주입
  backup.mjs                 # 수동 백업 실행

db/schema.sql                # 테이블 정의
samples/                     # Import 샘플 파일
  paste-import-sample.txt
  import-sample.csv
data/                        # 실제 DB/백업 저장 경로
```

## 4) 사전 준비

- Node.js 22 권장 (Dockerfile 기준)
- npm 사용
- OS: macOS / Linux / Windows(WSL 권장)

버전 확인:

```bash
node -v
npm -v
```

## 5) 5분 로컬 실행 가이드 (가장 쉬운 시작)

### Step 1. 의존성 설치

```bash
npm install
```

### Step 2. 환경변수 파일 준비

```bash
cp .env.example .env.local
```

`.env.local` 기본값(로컬 단일 사용자 모드):

```env
ACCESS_MODE=none
ACCESS_SINGLE_USER_EMAIL=you@example.com
REQUIRE_CLOUDFLARE_IN_PRODUCTION=true
TRUST_PROXY=false
CLOUDFLARE_ACCESS_TEAM_DOMAIN=
CLOUDFLARE_ACCESS_AUD=
CLOUDFLARE_ACCESS_ISSUER=
DB_PATH=./data/lab-dashboard.sqlite
BACKUP_DIR=./data/backups
BACKUP_KEEP_DAYS=30
BACKUP_MAX_FILES=30
RESTORE_UPLOAD_MAX_BYTES=104857600
RESTORE_MAX_PREPARED=5
IMPORT_MAX_BYTES=10485760
IMPORT_MAX_ROWS=100000
SECURITY_CSP_REPORT_ONLY=true
```

환경변수 상세:

| 변수명 | 기본값 | 설명 | 언제 바꾸나 |
| --- | --- | --- | --- |
| `ACCESS_MODE` | `none` | 접근 제어 모드 (`none` 또는 `cloudflare`) | Cloudflare Access를 붙일 때 `cloudflare` |
| `ACCESS_SINGLE_USER_EMAIL` | `you@example.com` | `cloudflare` 모드에서 허용할 단일 이메일 | 실제 사용자 이메일로 교체 |
| `REQUIRE_CLOUDFLARE_IN_PRODUCTION` | `true` | 프로덕션에서 `ACCESS_MODE=cloudflare` 강제 여부 | 임시 점검용으로만 `false` |
| `TRUST_PROXY` | `false` | 프록시 전달 IP(`x-forwarded-for`) 신뢰 여부 | 로드밸런서/리버스프록시 뒤에서 정확한 IP 제한이 필요할 때 |
| `CLOUDFLARE_ACCESS_TEAM_DOMAIN` | _(빈 값)_ | Cloudflare Access 팀 도메인 (`your-team.cloudflareaccess.com`) | JWT 서명 검증을 사용할 때 |
| `CLOUDFLARE_ACCESS_AUD` | _(빈 값)_ | Access Application의 AUD 태그 값 | JWT의 audience 검증에 사용 |
| `CLOUDFLARE_ACCESS_ISSUER` | _(빈 값)_ | JWT `iss` 값(기본: `https://<team-domain>`) | 기본 issuer와 다를 때만 설정 |
| `DB_PATH` | `./data/lab-dashboard.sqlite` | SQLite 파일 위치 | DB를 다른 디스크/경로에 둘 때 |
| `BACKUP_DIR` | `./data/backups` | 백업 파일 저장 경로 | 백업만 별도 경로에 저장할 때 |
| `BACKUP_KEEP_DAYS` | `30` | 백업 자동 보관일(일) | 보관 기간을 늘리거나 줄일 때 |
| `BACKUP_MAX_FILES` | `30` | 백업 최대 보관 개수 | 백업 파일 수 상한을 조정할 때 |
| `RESTORE_UPLOAD_MAX_BYTES` | `104857600` | 복원 업로드 최대 용량(바이트) | 대용량 DB를 복원해야 할 때 |
| `RESTORE_MAX_PREPARED` | `5` | 동시에 준비 가능한 복원 파일 수 | 메모리/디스크 사용량 제한 |
| `IMPORT_MAX_BYTES` | `10485760` | 텍스트/CSV import 입력 최대 용량(바이트) | 대용량 붙여넣기 입력을 제한하고 싶을 때 |
| `IMPORT_MAX_ROWS` | `100000` | 텍스트/CSV import 1회 최대 처리 행 수 | 실수로 너무 큰 import를 막고 싶을 때 |
| `SECURITY_CSP_REPORT_ONLY` | `true` | 강화된 CSP를 Report-Only로 먼저 적용할지 여부 | CSP 위반 리포트를 먼저 확인하고 점진 전환할 때 |

### Step 3. DB 초기화 + 데모 데이터 입력

```bash
npm run db:init
npm run db:seed
```

### Step 4. 개발 서버 실행

```bash
npm run dev
```

브라우저 접속: `http://localhost:3000`  
(루트 `/`는 자동으로 `/dashboard`로 이동합니다.)

## 6) 화면 사용법 (초보자용 워크플로우)

### 6-1. 대시보드(`/dashboard`)

- 카테고리별 카드 표시: 일반혈액, 일반화학, 응고, 요검사, 기타
- 카드 상태 배지: `정상`, `이상(높음)`, `이상(낮음)` (`flag` 또는 기준범위 비교로 계산)
- 상단 내비게이션으로 `데이터 입력`, `테이블`, `백업/복원` 페이지 이동 가능

### 6-2. 입력/Import(`/dashboard/import`)

세 가지 입력 방식이 있습니다.

1. 수동 입력
- 필수: `검사일(observed_at)`
- `숫자값(value_numeric)` 또는 `텍스트값(value_text)` 중 최소 1개 필요
- 기존 검사 항목 선택 가능
- 또는 신규 항목(한글/영문) 생성 후 저장 가능

2. 텍스트 Import
- 병원 결과표를 그대로 붙여넣는 용도
- `▲/▼`, `↑/↓`를 자동으로 `H/L` 플래그로 변환
- 표 형식/인라인 형식/묶음 블록 형식 파싱 지원
- 샘플: `samples/paste-import-sample.txt`

3. CSV Import
- 최소 컬럼: `test_name`, `observed_at`, `value`
- 권장 컬럼: `unit`, `ref_low`, `ref_high`, `flag`, `category`
- 샘플: `samples/import-sample.csv`

CSV 컬럼 레퍼런스:

| 컬럼 | 필수 | 예시 | 설명 |
| --- | --- | --- | --- |
| `test_name` | 권장(아래 대체 가능) | `Hemoglobin(혈색소)` | 검사명 통합 컬럼 |
| `test_name_ko` + `test_name_en` | 대체 입력 | `혈색소`, `Hemoglobin` | `test_name` 대신 한/영문 분리 입력 가능 |
| `observed_at` | 필수 | `2025-02-21` | 검사일(권장 형식 `YYYY-MM-DD`) |
| `value` | 권장(아래 대체 가능) | `12.8L`, `1.032H` | 값+플래그 결합 입력 가능 |
| `value_numeric` | 대체 입력 | `12.8` | 숫자 값 |
| `value_text` | 대체 입력 | `Negative` | 텍스트 결과값 |
| `unit` | 선택 | `g/dL` | 단위 |
| `ref_low`, `ref_high` | 선택 | `13`, `17` | 정상범위 하한/상한 |
| `flag` | 선택 | `H`, `L` | 이상 플래그(없으면 자동 추론 시도) |
| `category` | 선택 | `general_blood` | 섹션 분류 힌트 |

### 6-3. 테이블(`/dashboard/table`)

- 전체 관측치를 검색/정렬
- 정렬: 날짜 최신순/오래된순, 값 큰순/작은순
- 검색 대상: 검사명(한/영), 날짜

### 6-4. 항목 상세(`/dashboard/tests/[id]`)

- 기본 기간: `전체` (진입 시 전체 추세를 먼저 표시)
- 기간 필터: 최근 3개월, 1년, 3년, 전체
- 숫자형 데이터만 라인차트로 표시
- 차트 축/툴팁은 날짜만 표시(시간은 표시하지 않음)
- 차트 하단에 관측값 상세 테이블 표시
- 테이블 하단에 검사 항목 설명 카드(한줄요약/해석팁/관련 항목) 표시
- 정상범위(ref_low~ref_high)는 밴드로 시각화

## 7) 데이터 저장 규칙 (중요)

- `tests.name_en`은 고유값입니다.
- `observations`는 `(test_id, observed_at)`가 고유값입니다.
- 즉, 같은 검사/같은 날짜 데이터가 들어오면 "추가"가 아니라 "업데이트(업서트)" 됩니다.
- 실수로 중복 입력했을 때 최신 입력값으로 정리되는 동작입니다.

## 8) 인증/접근 모드

### 로컬 모드 (`ACCESS_MODE=none`)

- 외부 인증 없이 단일 로컬 사용자로 동작
- 헤더 없이 바로 접속 가능

### Cloudflare 모드 (`ACCESS_MODE=cloudflare`)

- Cloudflare Zero Trust의 **Access Application** 기능을 사용합니다.
- Cloudflare가 원본 요청에 `cf-access-jwt-assertion` JWT를 붙여줍니다.
- 서버는 JWT를 팀 도메인의 certs endpoint로 서명 검증하고, `aud/iss/exp`를 검사합니다.
- 보조적으로 `cf-access-authenticated-user-email`을 확인합니다.
- `ACCESS_SINGLE_USER_EMAIL`이 설정되어 있으면 해당 이메일만 허용
- JWT 누락/사용자 불일치 시 `/unauthorized`로 리다이렉트
- `CLOUDFLARE_ACCESS_TEAM_DOMAIN`/`CLOUDFLARE_ACCESS_AUD` 누락 등 보안 설정 오류는 `503`으로 즉시 차단됩니다.
- `REQUIRE_CLOUDFLARE_IN_PRODUCTION=true`이면 프로덕션에서 `ACCESS_MODE=cloudflare`가 강제됩니다.

참고: `/login` 페이지는 내부 로그인용이 아니라 "Cloudflare 관문 인증 사용" 안내 페이지입니다.

## 9) 백업/내보내기

### 앱 UI에서

- 진입 경로: `/dashboard/backups`
- 백업 생성: `/api/backup/create` (POST)
- 백업 목록: `/api/backup/list` (GET)
- 백업 삭제: `/api/backup/delete` (POST)
- 원본 DB 다운로드: `/api/backup/download` (GET)
- JSON Export: `/api/export/json` (GET)
- CSV Export: `/api/export/csv` (GET)
- 복원 업로드(검증): `/api/backup/restore/upload` (POST)
- 복원 실행: `/api/backup/restore/commit` (POST)
- 복원 상태 조회: `/api/backup/restore/status` (GET)
- 위 API는 인증 사용자만 접근 가능합니다 (`none` 모드 또는 Cloudflare 인증 통과 사용자).
- 백업/복원/내보내기 API는 same-origin 검사와 rate limit을 적용합니다.
- 고비용 API(백업/복원/내보내기)에는 IP 기반 rate limit이 적용됩니다.
- 백업 생성/DB 다운로드는 SQLite `backup()` API 기반 스냅샷을 사용해 WAL 환경에서도 일관된 파일을 생성합니다.
- 백업/복원 과정에서 생길 수 있는 임시 WAL/SHM 보조 파일은 자동 정리됩니다.

### CLI에서

```bash
npm run backup
```

- 백업 파일명 예: `lab-dashboard-2026-02-21T01-23-45-123Z.sqlite`
- `BACKUP_KEEP_DAYS`보다 오래된 백업은 자동 정리
- `BACKUP_MAX_FILES` 개수를 초과하면 오래된 백업부터 자동 정리

### DB 복원 절차

1. `/dashboard/backups`의 `DB 복원` 섹션에서 `.sqlite` 파일 선택
2. `검증 업로드`로 무결성/필수 테이블·컬럼/데이터 건수/관측 기간 검사 수행
3. `복원 실행`으로 실제 적용
4. 복원 전 자동 사전백업 파일이 생성되며, 실패 시 롤백 시도

## 10) Docker로 실행하기

`docker-compose.yml`은 `./data:/data` 볼륨을 마운트합니다.

- 컨테이너 DB 경로: `/data/lab-dashboard.sqlite`
- 호스트 파일 위치: `./data/lab-dashboard.sqlite`
- 백업 폴더: `./data/backups`

실행:

```bash
docker compose up -d --build
```

로그 확인:

```bash
docker compose logs -f app
```

중지:

```bash
docker compose down
```

## 11) 개발/검증 명령어

```bash
npm run dev         # 개발 서버
npm run build       # 프로덕션 빌드
npm run start       # 빌드 결과 실행
npm run lint        # TypeScript 타입 검사
npm test            # Vitest 1회 실행
npm run test:watch  # Vitest watch 모드
npm run db:init     # DB 초기화
npm run db:seed     # 데모 데이터 주입
npm run backup      # 수동 백업
```

## 12) 자주 겪는 문제 해결

### Q1. `/unauthorized`가 떠요

- 원인: `ACCESS_MODE=cloudflare`인데 Cloudflare 헤더가 없거나 이메일 불일치
- 해결: 로컬 개발이면 `.env.local`에서 `ACCESS_MODE=none`으로 변경
- 해결: Cloudflare 사용 시 `ACCESS_SINGLE_USER_EMAIL`이 실제 인증 이메일과 같은지 확인
- 해결: `CLOUDFLARE_ACCESS_TEAM_DOMAIN`, `CLOUDFLARE_ACCESS_AUD` 값이 비어 있지 않은지 확인

### Q2. 대시보드에 데이터가 안 보여요

- 원인: DB가 비어 있음
- 해결:

```bash
npm run db:init
npm run db:seed
```

### Q3. CSV Import에서 "필수 컬럼" 오류가 나요

- `test_name`, `observed_at`, `value`를 포함했는지 확인
- 날짜 형식은 `YYYY-MM-DD` 권장 (`2025-02-21`)

### Q4. DB를 완전히 초기 상태로 되돌리고 싶어요

- `data/lab-dashboard.sqlite` 파일을 삭제한 뒤(있다면 `-wal`, `-shm` 파일도 함께 정리):

```bash
npm run db:init
npm run db:seed
```

### Q5. `/dashboard`에서 `503 Security configuration error`가 떠요

- 원인: Cloudflare 모드 필수 설정(`CLOUDFLARE_ACCESS_TEAM_DOMAIN`, `CLOUDFLARE_ACCESS_AUD`) 누락 또는 프로덕션 보안 강제 조건 미충족
- 로컬 개발 임시 해결: `.env.local`에서 `ACCESS_MODE=none`
- Cloudflare 운영 설정: `ACCESS_MODE=cloudflare` + 팀 도메인/AUD를 정확히 입력

## 13) 빠른 체험 순서 (권장)

1. `npm install`
2. `cp .env.example .env.local`
3. `npm run db:init && npm run db:seed`
4. `npm run dev`
5. `/dashboard/import`에서 샘플 텍스트/CSV 붙여넣기
6. `/dashboard`와 `/dashboard/table`에서 결과 확인
7. `/dashboard/backups`에서 Export/백업/복원 기능 확인

## 14) GitHub 공개 업로드 체크리스트

- [ ] `.gitignore`에 `data/*.sqlite`, `data/backups/*`, `.env.local`이 포함되어 있는지 확인
- [ ] 실제 건강검진 원본 데이터 파일이 워킹 디렉터리에 남아 있지 않은지 확인
- [ ] 아래 검증 명령을 로컬에서 통과했는지 확인
  - `npm run lint`
  - `npm test`
  - `npx tsc --noEmit`
  - `npm run build`
- [ ] 기본 문서 확인
  - `README.md`
  - `CONTRIBUTING.md`
  - `SECURITY.md`
  - `LICENSE`

초기 업로드 예시:

```bash
git init
git add .
git commit -m "chore: initial public release"
git branch -M main
git remote add origin <YOUR_GITHUB_REPO_URL>
git push -u origin main
```

---

필요하면 다음 단계로 `README`에 Cloudflare Zero Trust 실제 설정 스크린샷 기준 체크리스트(Access App 생성, 정책 설정, 도메인 연결)를 추가할 수 있습니다.
