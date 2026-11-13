# kharis-web-backend

Node.js (Express) API in front of Supabase for the websites (kharis.org and KP2) and
the Content Studio. It serves exactly the routes and JSON shapes those apps already
call, so switching to it only means pointing `NEXT_PUBLIC_KHARIS_API_URL` at it. No app
code changes.

The mobile app keeps using `Kharis-app-backend`. This project has none of its mobile
routes, Firebase, push notifications or migration scripts.

Interactive docs are served at `/api-docs` when running under Node (`npm run dev`).
The deployed Worker doesn't serve them.

## Run

```sh
npm install
cp .env.example .env   # then fill in your Supabase URL and keys
npm run dev            # http://localhost:4000
```

The apps already default to `http://localhost:4000` in their `.env.local`, so stop
`Kharis-app-backend` (or move it to another port) while this one runs locally.

## Deploy (Cloudflare Workers)

The API runs as the `kharis-web-backend` Worker (`src/worker.js`, `wrangler.jsonc`) at
`https://kharis-web-backend.itadmin-a94.workers.dev`.

Cloudflare Workers Builds is connected to this repository and deploys every push to
`main`. `.github/workflows/deploy.yml` runs the tests on every push and pull request.

One-time setup:

1. Cloudflare dashboard > Workers & Pages > Create application > Import a repository,
   and pick this repository. Project name `kharis-web-backend` (must match
   `wrangler.jsonc`), build command empty, deploy command `npx wrangler deploy`,
   root directory `/`.
2. In the Worker's Settings > Variables and Secrets, add `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_ANON_KEY` as type Secret. Deploys keep them.
3. Check `/health` and `/v1/site/branches` answer.
4. Point the apps at the Worker: set the `NEXT_PUBLIC_KHARIS_API_URL` repository
   variable in `kharis-website` and redeploy the three apps (the value is baked in at
   build time).

`CORS_ORIGINS` and `STUDIO_URL` are plain vars in `wrangler.jsonc`; each deploy
overwrites dashboard copies, so change them there. To serve the API on
`api.kharis.org`, uncomment the custom domain in `wrangler.jsonc`, push, then update
`NEXT_PUBLIC_KHARIS_API_URL`.

To run the Worker locally, copy the variables from `.env` into `.dev.vars` (ignored)
and run `npm run dev:worker` (http://localhost:8787).

## Environment

| Variable | Needed for |
|---|---|
| `PORT` | Defaults to 4000. |
| `SUPABASE_URL` | Everything. |
| `SUPABASE_SERVICE_ROLE_KEY` | Site reads, forms, and studio sign-in checks and account management. Server-only. |
| `SUPABASE_ANON_KEY` | Studio data routes, which run as the signed-in editor so Row Level Security applies. |
| `CORS_ORIGINS` | Comma-separated browser origins. Only the studio calls from a browser. |
| `STUDIO_URL` | Invite and password reset emails link to `{STUDIO_URL}/set-password`. |
| `SUPABASE_WORKSPACE` | Optional. Limits rows to one `workspace` value. |

The server refuses to start without `SUPABASE_URL` and one of the two keys. Without
the service role key the studio routes answer 503; without the anon key the studio
data routes answer 503. They never fall back to the service role.

## Routes

Successful responses are `{ status: true, message, data }`. Errors are
`{ status: false, message, data: null }`, form validation errors are `{ message }`,
unknown routes are `{ error: "Not found" }`, and unexpected failures are
`{ error: "Internal server error" }` (database details are never returned).

### Websites (`apps/main`, `apps/kp2`)

Public. Site reads send `Cache-Control: public, max-age=60`.

| Route | Returns |
|---|---|
| `GET /v1/site/branches` | Active branches with venues and active services, by `sort_order` |
| `GET /v1/site/branches/:slug` | One active branch, or 404 |
| `GET /v1/site/media?ownerType=branch-gallery,branch-video,department-video` | Public media rows |
| `GET /v1/site/testimonies` | Published testimonies; anonymous ones show "Anonymous" |
| `GET /v1/site/events` | Every event, oldest first |
| `POST /api/contact` | Saves a `contact_messages` row, 201 `{ data: { id } }` |
| `POST /api/visitors` | Saves a `visitors` row |
| `POST /api/quiz` | Saves a `quiz_results` row |
| `GET /health` | `{ status: "ok" }` |

Forms accept a `company` honeypot field; when it is filled the request gets a 201 and
nothing is saved.

### Content Studio (`apps/content`)

Every route needs `Authorization: Bearer <Supabase access token>`.

| Route | Who |
|---|---|
| `GET /v1/studio/me` | Any signed-in account, including ones still waiting for access |
| `GET /v1/studio/users` | Super admins |
| `POST /v1/studio/users` `{ email, role, branchIds }` | Super admins |
| `PATCH /v1/studio/users/:id` `{ role?, branchIds? }` | Super admins |
| `DELETE /v1/studio/users/:id` | Super admins |
| `POST /v1/studio/users/:id/password-reset` | Super admins |
| `POST /v1/studio/data/:resource/query` `{ where, order, limit, view }` | Editors |
| `POST /v1/studio/data/:resource/count` `{ where }` | Editors |
| `POST /v1/studio/data/:resource/delete` `{ where }` | Editors |
| `POST /v1/studio/data/:resource` `{ row }` | Editors |
| `PUT /v1/studio/data/:resource` `{ row, onConflict, returning }` | Editors |
| `PATCH /v1/studio/data/:resource` `{ where, patch }` | Editors |
| `PATCH /v1/studio/data/:resource/:key` `{ patch }` | Editors |
| `DELETE /v1/studio/data/:resource/:key` | Editors |
| `POST /v1/studio/branches/:id/deactivate` | Super admins |
| `POST /v1/studio/storage/remove` `{ paths }` | Editors (legacy Supabase `content` bucket) |

Editors are branch admins and super admins. Other accounts get 403 "Your account is
waiting for access." Resources, their filterable, sortable and writable columns, and
which operations each allows are listed in `src/modules/studio/studio.data.rules.js`.

## Layout

```
src/
  app.js, index.js, config.js   # app, server entry, all env vars
  config/                       # supabase clients, http helper, swagger
  shared/                       # errors, response shape, table names
  modules/site/                 # public website reads
  modules/forms/                # contact, visit and quiz forms
  modules/studio/               # studio accounts (studio.*) and data (studio.data.*)
test/                           # node --test
```

## Tests

```sh
npm test
```

`test/routes.test.js` starts the app with sign-in stubbed and checks every route the
apps call is mounted with the expected status codes and response shapes. It does not
reach Supabase.
