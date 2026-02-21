# Contributing Guide

## Environment
- Node.js 22+
- npm

## Local setup
```bash
npm install
cp .env.example .env.local
npm run db:init
npm run db:seed
npm run dev
```

## Validation before PR
```bash
npm run lint
npm test
npm run build
```

## Coding rules
- Use TypeScript with strict mode.
- Keep domain/data logic in `src/lib`, UI logic in `src/components`.
- Add/update tests for parser, transform, API, and explanation matching changes.
- Do not commit local DB/backup files (`data/*.sqlite`, `data/backups/*`).

## Commit style
- Use Conventional Commits:
  - `feat:`
  - `fix:`
  - `chore:`
  - `test:`

## Pull request checklist
- What changed and why
- Screenshots for UI changes
- Validation output (`lint`, `test`, `build`)
- `.env`/DB schema impact notes
