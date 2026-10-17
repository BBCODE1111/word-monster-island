# Wordling cloud service

Supabase project: `ijlwalmwzibbgnuolaww`. The public game calls the `wordling-api` Edge Function. Player aliases map to internal Supabase Auth identities; passwords are handled by Supabase Auth. A random single-use recovery code resets a forgotten password. No real email or child name is required.

`schema.sql` creates private player saves and rate limits with RLS enabled. Anonymous and authenticated database roles have no direct table access. The function verifies the player's Supabase JWT before reading or mutating saves. Public routes expose registration, login, health, and collection rankings only. The legacy gateway JWT switch is off because login must work before a player receives a JWT. This does not remove the function's own user verification.

Game rules, encounter rolls, individual stats, XP, and leaderboard totals run on the server. Each question has a single-use nonce. Save updates compare a version number to prevent duplicate reward writes across tabs. The source word answers remain inspectable in this educational open-source game; this is a casual learning leaderboard.

## Update the backend

Run `npm run build:backend`, then replace `index.ts` in the Supabase function editor and deploy. Keep the function name `wordling-api`. Credentials are supplied by the Supabase runtime and never embedded in the source.

For automatic updates, add a project-scoped `SUPABASE_ACCESS_TOKEN` in this repository's Actions secrets, granting Database and Edge Functions read-write access only. The Pages workflow then runs `backend/deploy.mjs` before publishing. Without that secret, it preserves the current deployed backend and publishes only the website. Never put a service-role key, password, or access token in `dist/config.json`.
