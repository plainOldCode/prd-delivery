---
title: Authentication (JWT)
status: implemented
created: 2026-07-02
---

## Overview

JWT 기반 인증 시스템 — Sign Up, Sign In, Sign Out 흐름을 구현합니다. 비밀번호 해시는 Bun 내장 WebCrypto PBKDF2를 사용하고, JWT는 `jose` 라이브러리로 발행/검증합니다.

## User Stories

1. **Sign Up** — 사용자는 Username, Password, Confirm Password를 입력해 계정을 생성함
2. **Sign In** — 기존 사용자는 Username + Password로 로그인 후 JWT를 받음
3. **Sign Out** — 로그인한 사용자는 프로필 버튼을 눌러 로그아웃됨 (클라이언트 토큰 제거)

## Database Schema

```sql
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    username      TEXT UNIQUE NOT NULL COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
```

## API Endpoints

| Method | Path | Request Body | Response | Description |
|--------|------|-------------|----------|-------------|
| POST | `/auth/signup` | `{ username, password, confirmPassword }` | `201 { id, username }` | 계정 등록 |
| POST | `/auth/signin` | `{ username, password }` | `200 { token }` | JWT 발급 |
| POST | `/auth/signout` | — (Bearer token) | `200 { message: "signed out" }` | 로그아웃 |

## Auth Middleware

- `requireAuth()` — 토큰 유효성 검사 + `c.get('user')`에 payload 주입
- JWT secret은 `JWT_SECRET` 환경변수 (기본값: 개발용)
- Token 만기: 24시간

## Frontend Pages

| Page | Route | Description |
|------|-------|-------------|
| AuthPage | `/login` | Sign In / Sign Up 토글 폼 |
| (existing) | Profile button | 우측 상단 — 로그인 상태일 때 Sign Out |

## Acceptance Criteria

- [x] Sign Up: 중복 username 방지, password === confirmPassword 검증
- [x] Sign In: 잘못된 비밀번호 시 401
- [x] JWT 토큰이 필요한 API에 인증 미iddleware 적용
- [x] Frontend에서登录后 토큰 localStorage에 저장
- [x] 우측 상단 프로필 → Sign Out

## Test Requirements

- `backend/src/__tests__/auth.test.ts` — Signup, Signin, Signout cycle
- In-memory SQLite 사용 (`DATABASE_URL="file::memory:"`)
- 중복 계정 생성 방지 테스트
- 유효/무효 토큰 테스트
