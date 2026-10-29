## Security Rules (Next.js frontend + Laravel API backend)

Treat the browser as hostile. Laravel is the only trusted enforcement point.
Frontend checks are UX only, never security.

### Auth and tokens
- NEVER store tokens, JWTs, or session data in localStorage/sessionStorage.
- Use HttpOnly + Secure + SameSite cookies (Laravel Sanctum SPA cookie auth).
- Never read or write auth tokens from client-side JS.

### Secrets and env
- NEVER put secrets, API keys, or private URLs in `NEXT_PUBLIC_*` variables.
- Secrets are used only in server-only code (Route Handlers, Server Actions,
  Server Components). Mark such modules with `import "server-only"`.
- Never commit `.env*` files. Never hardcode credentials, even as placeholders.

### XSS
- Do NOT use `dangerouslySetInnerHTML`, `innerHTML`, `eval`, or `new Function`.
  If rich HTML is truly required, sanitize with DOMPurify and tell me why.
- Validate any user/API-provided URL before using it in `href`, `src`,
  `router.push`, or `window.location`: allow only `https:` or relative paths.
  Reject `javascript:` and `data:`.
- Validate redirect targets (e.g. `?next=`) as same-origin relative paths only.

### Server Actions and Route Handlers
- Treat every Server Action and Route Handler as a public endpoint:
  authenticate AND authorize inside each one.
- Validate all input with Zod on the server, even if the client validates too.
- Never rely on middleware alone for authorization.
- If fetching a user-supplied URL server-side, use a domain allowlist (SSRF).
- Never pass full API/DB objects to Client Components. Return only the
  fields the UI needs (no roles, hashes, internal IDs, emails of others).

### API calls to Laravel
- Never trust client-sent user IDs, roles, prices, or totals. Backend derives
  them from the authenticated user.
- Do not send fields like `role`, `is_admin`, or `user_id` from forms.
- Do not log tokens, passwords, or full request bodies.
- Error messages shown to users must be generic; no stack traces or raw
  backend errors.

### Dependencies
- Before adding ANY npm package: verify it exists, is widely used and
  maintained, and the name is exact (watch for typos and hallucinated names).
  List new packages in your summary and ask before installing.
- Do not add packages with postinstall scripts without asking.
- Never edit the lockfile by hand.

### Headers
- Keep CSP and security headers in `next.config` intact. Do not loosen
  (`unsafe-inline`, `unsafe-eval`, `*`) without asking.

### Workflow
- After any change touching auth, forms, env vars, redirects, file uploads,
  or dependencies, end your response with a "Security notes" section listing
  what you touched and any risks.
- If a request would require breaking a rule above, stop and ask instead of
  working around it.

## Mentor Mode
I am new to Laravel and Next.js and this project is for learning.
- Explain WHY before showing code, in simple terms.
- Prefer small steps over large generated chunks. One concept at a time.
- When you write code, point out which lines matter for security and why.
- When there is a "bad but easy" way and a "right" way, show both and
  explain the difference.
- After finishing a task, give me one question to check my understanding.