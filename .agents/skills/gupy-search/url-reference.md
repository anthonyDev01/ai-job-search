# Gupy URL Reference

Investigated 2026-11-05. Public, unauthenticated endpoints.

## robots.txt

- `https://portal.gupy.io/robots.txt` → `User-agent: *` / `Disallow:` (nothing disallowed).
- `https://<empresa>.gupy.io/robots.txt` → `Allow: /`, `Disallow: /companies`, `Disallow: /candidates`.
  Job pages live under `/job/...` and are allowed.

## Search (JSON)

```
GET https://portal.gupy.io/api/job-search/jobs?jobName=<q>&limit=<n>&offset=<n>[&workplaceType=..][&state=..][&city=..][&type=..]
```

This is the Next.js API route the portal's own search page (`/job-search/term=<q>`) calls
client-side. Found by reading the page's JS chunks (the request builder assembles
`{jobName, type, badge, isPWD, workplaceType, state, city, sortBy, sortOrder, limit, offset}`).
The older public endpoint `portal.api.gupy.io/api/v1/jobs` now returns 404.

| Param | Meaning | Example |
|-------|---------|---------|
| `jobName` | Search term (matches job name + description) | `estágio dados` |
| `workplaceType` | `remote` · `hybrid` · `on-site` | `remote` |
| `state` | State, full name | `São Paulo` |
| `city` | City | `Campinas` |
| `type` | `vacancy_type_internship`, `vacancy_type_effective`, `vacancy_type_apprentice`, `vacancy_type_trainee`, `vacancy_type_talent_pool`, … | `vacancy_type_internship` |
| `limit` / `offset` | Pagination | `20` / `40` |

Response:

```json
{ "data": [ { "id": 12803734, "name": "...", "description": "...", "careerPageName": "NCS",
    "careerPageUrl": "...", "type": "vacancy_type_internship", "publishedDate": "2026-10-29T13:09:10Z",
    "applicationDeadline": null, "workplaceType": "hybrid", "city": "São Paulo", "state": "São Paulo",
    "jobUrl": "https://ncs.gupy.io/job/<base64 {jobId,source}>?jobBoardSource=gupy_portal", "badges": {}, "disabilities": true } ],
  "pagination": { "total": 10, "limit": 12, "offset": 0 } }
```

Results come newest-first. There is no posting-age parameter.

Fallback if the API route moves: `https://portal.gupy.io/job-search/term=<q>` server-renders the
first 12 results into `<script id="__NEXT_DATA__">` at `props.pageProps.initialJobList.{data,pagination}`.

## Detail

```
GET https://<empresa>.gupy.io/job/<hash>?jobBoardSource=gupy_portal
```

`<hash>` is base64 of `{"jobId":<id>,"source":"gupy_portal"}`; the subdomain is required, so a
bare numeric id is not enough. The page embeds the posting in `__NEXT_DATA__` at
`props.pageProps.job`:

| Field | Content |
|-------|---------|
| `name`, `jobType`, `workplaceType`, `status` (`published`) | basics |
| `description`, `responsibilities`, `prerequisites`, `relevantExperiences` | HTML blocks (`relevantExperiences` is usually "informações adicionais"/benefícios) |
| `addressCity`, `addressStateShortName`, `addressLine` | location |
| `publishedAt`, `registerEndDate`, `expiresAt` | dates; `registerEndDate` = last day to apply |
| `jobSteps[] {name, type, category}` | hiring process (registration → evaluation tests → interviews → hiring) |
| `careerPage.name`, `company.subdomain` | employer |
| `questionForm`, `quickApply`, `requiredFields` | application-form hints |
