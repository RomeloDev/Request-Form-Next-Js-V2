This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Laravel connection

Start the existing Laravel rebuild separately with `php artisan serve`. The frontend
forwards `/api/v1/*` to `http://127.0.0.1:8000/api/v1/*` using a Next.js rewrite.
For another backend host, put `API_SERVER_URL=https://your-laravel-host.example`
in `.env.local` before starting development or building for deployment. Restart or
rebuild after changing it. Use the backend origin without an `/api/v1` suffix.
This is a server-side configuration value, not a browser secret or an additional
business API. No Laravel configuration change is required for this local proxy.

The registration page is `/registration`. It loads real branch/position options,
exports the drawn signature as PNG, and submits multipart form data to the existing
registration API. Its Sign In link and successful-registration redirect target
`/login`, matching the reference.

### Login screen and backend status

`/login` shares the auth route layout, branding, page header, fields, alerts,
buttons and links with registration. Its identifier accepts email, username or
employee ID. The frontend prepares a CSRF cookie, submits JSON credentials to
`/api/v1/login`, then confirms `/api/v1/profile` before redirecting. The Next.js
rewrite also forwards `/sanctum/csrf-cookie`. Session cookies and the decoded
`X-XSRF-TOKEN` header are used; the registration localStorage token does not
establish a login session.

The learner has not implemented Laravel login/profile routes yet. The screen
therefore reports unavailable sign-in against the current backend. Live successful
authentication is pending that backend lesson. `/forgot-password`, `/dashboard`
and `/approver/dashboard` are preserved reference destinations for future features;
those screens are not implemented yet. Guest-only/protected-route checks and a
shared authenticated-user provider also remain future integration work.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
