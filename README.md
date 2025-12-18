# SAY IT — Dev Notes

## Firebase Admin credentials
- We now require a **single env var**: `FIREBASE_CREDENTIALS_JSON`.
- Value must be the full service account JSON string. You can keep it single-line or multiline; both work.
- Old envs (`FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) are no longer read.

### Local setup
1) Copy `.env.example` to `.env.local`.
2) Replace the JSON with your service account contents (escape newlines in the private key if you keep it on one line).
3) Run `vercel dev` (or your dev server) so `/api` functions pick up the env.

### Deploy (Vercel)
Add `FIREBASE_CREDENTIALS_JSON` in Project Settings → Environment Variables with the full JSON string. No other Firebase Admin envs are needed.
