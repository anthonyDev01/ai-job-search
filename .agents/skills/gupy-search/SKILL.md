---
name: gupy-search
version: 1.0.0
description: >
  Use this skill to search job openings on Gupy (portal.gupy.io), the largest job
  portal / ATS in Brazil, or to read the full text of a Gupy posting. Covers vagas de
  emprego, estágio, trainee, jovem aprendiz, efetivo, remoto/híbrido/presencial, in any
  Brazilian city or state. Trigger phrases: buscar vagas, vagas de emprego, vagas na
  Gupy, procurar estágio, vagas de estágio, vagas remotas, emprego em São Paulo,
  find jobs in Brazil, Gupy job search, look up this Gupy posting.
context: fork
enabled: true  # set to false to keep this portal installed but have /scrape skip it
allowed-tools: Bash(bun run .agents/skills/gupy-search/cli/src/cli.ts *)
---

# Gupy Search Skill

Searches live job listings on **Gupy** (`portal.gupy.io`), Brazil's main job portal —
thousands of companies (Vivo, Itaú, Ambev, consultorias, etc.) publish their vagas there.
No authentication, no API key, **zero runtime dependencies** (runs with plain `bun`).

Data comes from the same public JSON endpoint the portal's own search page calls, and
from each company's public job page (`<empresa>.gupy.io/job/...`). `robots.txt` on
`portal.gupy.io` disallows nothing; company pages allow `/job` (they disallow
`/companies` and `/candidates`, which this skill never touches). Keep volume low: this is
for a personal job search, not bulk collection.

## Commands

### Search

```bash
bun run .agents/skills/gupy-search/cli/src/cli.ts search --query "<termo>" [flags]
```

- `--query <text>` / `-q` — **required.** Termo de busca. Gupy matches it against the job
  name *and* description, so multi-word terms behave like a phrase ("desenvolvedor júnior"
  returns far fewer hits than "desenvolvedor"). Prefer 1–2 word terms and filter with flags.
- `--remote <mode>` — `remote` | `hybrid` | `onsite` (aliases `remoto`, `hibrido`, `presencial`).
- `--state <text>` — estado por extenso: `"São Paulo"`, `"Rio de Janeiro"`, `"Minas Gerais"`.
- `--city <text>` — cidade: `"São Paulo"`, `"Campinas"`, `"Barueri"`.
- `--type <type>` — `internship` (`estagio`), `effective` (`efetivo`), `apprentice`
  (`aprendiz`), `trainee`, `temporary`, `associate`, `talent_pool`, `freelancer`, `autonomous`, `summer`.
- `--jobage <days>` — publicada nos últimos N dias. **Client-side** filter on `publishedDate`
  (Gupy has no age parameter); results are already sorted newest-first, so pair it with `--page`.
- `--page <n>` — 1-indexed, 20 results per page.
- `--limit <n>` / `-n` — cap results emitted (client-side).
- `--format json|table|plain` — default `json`. JSON `meta.total` is Gupy's total hit count.

Each result: `id, title, company, location, workplaceType, jobType, date, deadline, url`.
Location filtering for "SP **or** remote" needs two calls (one `--state "São Paulo"`, one
`--remote remote`) — Gupy ANDs filters.

### Detail

```bash
bun run .agents/skills/gupy-search/cli/src/cli.ts detail "<jobUrl>" [--format json|plain]
```

`jobUrl` is the `url` from search results (`https://<empresa>.gupy.io/job/<hash>?...`).
Only `*.gupy.io/job/...` URLs are accepted. Returns description, responsabilidades,
requisitos, benefícios, registration deadline (`deadline`), `isActive`, and the hiring
`steps` — e.g. `Cadastro → Raciocínio Lógico (evaluation) → Case → Entrevista` — which
tells you up front whether the process includes online tests.

## Usage examples

```bash
# Estágio em dados em São Paulo (estado)
bun run .agents/skills/gupy-search/cli/src/cli.ts search -q "estágio dados" --state "São Paulo" --format table

# Vagas remotas de desenvolvedor publicadas nos últimos 14 dias
bun run .agents/skills/gupy-search/cli/src/cli.ts search -q "desenvolvedor" --remote remote --jobage 14 --format table

# Estágios de Java na cidade de São Paulo
bun run .agents/skills/gupy-search/cli/src/cli.ts search -q "java" --type internship --city "São Paulo" --format table

# Vagas de cloud/AWS, página 2
bun run .agents/skills/gupy-search/cli/src/cli.ts search -q "aws" --page 2 --format table

# Texto completo de uma vaga
bun run .agents/skills/gupy-search/cli/src/cli.ts detail "https://empresa.gupy.io/job/eyJqb2JJZCI6MTIzfQ==" --format plain
```

## Output formats

| Format | Best for |
|--------|----------|
| `json` | Default — programmatic use, passing `url` to `detail` |
| `table` | Quick human-readable scanning |
| `plain` | Reading a single job's full detail (`detail` command) |

All errors go to **stderr** as `{ "error": "...", "code": "..." }` with exit code `1`.

## Notes

- `vacancy_type_talent_pool` postings are banco de talentos (talent pools), not a concrete
  opening — rank them lower.
- Applying requires a Gupy candidate account (login at `login.gupy.io`); this skill only reads
  public pages and never logs in.
- If search starts returning 404/non-JSON, the portal front-end changed its API route; see
  `url-reference.md` for how it was discovered.
