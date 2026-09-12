# Code Review: Yuuqq/grok-voice

## Executive Summary
This is a modern full-stack application built with React, Vite, and TanStack Start/Router, providing a text-to-speech interface for xAI's TTS API. The architecture separates client-side UI from the proxy backend, effectively shielding the API key. There are some security and reliability concerns that need addressing to ensure robust production use, most notably the lack of authentication on the TTS endpoint.

## Findings

### CRITICAL
* **Unauthenticated Access to `/api/tts` endpoint (Security)**
  * **File:** `src/routes/api/tts.ts` (lines 14-80)
  * **Impact:** The `POST` handler for `/api/tts` fetches from `https://api.x.ai/v1/tts` using the `XAI_API_KEY`, but it does not authenticate the user making the request. Anyone who discovers this endpoint can generate TTS audio and exhaust the host's xAI API quota/billing. The app sets up Better Auth but doesn't protect the proxy route.
  * **Suggestion:** Add an authentication check in `src/routes/api/tts.ts` using `requireUserId` and `assertSameSiteRequest` from `@/lib/auth/verify.server` and `@/lib/auth/isolation.server`. In `src/components/voice-studio.tsx`, add the bearer token from `getBearerToken()` to the `fetch` request headers to ensure authentication works in the preview environment. Return a `401 Unauthorized` or `403 Forbidden` response if a valid session isn't found.

### HIGH
* **No Rate Limiting on TTS generation (Reliability/Security)**
  * **File:** `src/routes/api/tts.ts`
  * **Impact:** Even if authenticated, users (or bots) can repeatedly hit the endpoint, overwhelming the downstream xAI API, increasing costs rapidly, or hitting upstream rate limits, rendering the app unusable for others.
  * **Suggestion:** Implement a rate limit on the `/api/tts` endpoint, either globally per IP or per authenticated user. A simple token bucket or sliding window using the database could be used.

### MEDIUM
* **Lack of Application Logic Tests (Test Coverage)**
  * **File:** Missing `src/lib/voices.test.ts` or similar application logic tests.
  * **Impact:** The project runs `node --test 'scripts/**/*.test.mjs'` and tests the build/infra scripts but lacks unit tests for domain logic like `detectLanguage` or the validation schemas for TTS requests.
  * **Suggestion:** Add test files covering `detectLanguage` (in `src/lib/voices.ts`), the `TtsBody` zod validation, and potentially mock the fetch request for the TTS endpoint to assert correctly handled headers and error payloads.

### LOW
* **Hardcoded Sample Script State (Maintainability/UX)**
  * **File:** `src/components/voice-studio.tsx` (lines 35, 60-70)
  * **Impact:** The state initializes `text` with `SAMPLE_SCRIPT`, but unlike `speed` and `voiceId`, it does not persist the text input to `localStorage`. If a user accidentally refreshes the page, their typed input is lost.
  * **Suggestion:** Add a `localStorage` sync for the `text` state similarly to how `speed` and `voiceId` are handled in the `useEffect` hooks.
* **Empty Catch Blocks in localStorage hooks (Maintainability)**
  * **File:** `src/components/voice-studio.tsx` (lines 60-69, 71-76)
  * **Impact:** If `localStorage` access throws (e.g. quota exceeded or disabled), the error is silently swallowed (`/* ignore */`), which may hide bugs during development.
  * **Suggestion:** Add `console.warn(err)` to the empty `catch` blocks when reading/writing to `localStorage` to improve debugging.
