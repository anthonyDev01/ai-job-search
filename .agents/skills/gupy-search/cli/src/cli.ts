#!/usr/bin/env bun
// Self-contained CLI for searching jobs on Gupy (portal.gupy.io), the largest
// ATS/job portal in Brazil. Public pages only, no authentication, zero runtime
// dependencies. Keep volume low (personal job search, not bulk collection).

import { runSearch, type SearchOpts } from "./commands/search.js"
import { runDetail, type DetailOpts } from "./commands/detail.js"
import { JOB_TYPES, WORKPLACE } from "./helpers.js"

interface Flags {
  _: string[]
  [k: string]: string | boolean | string[]
}

function parseFlags(argv: string[]): Flags {
  const flags: Flags = { _: [] }
  const alias: Record<string, string> = { q: "query", n: "limit" }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith("-")) {
      const key = alias[a.replace(/^-+/, "")] ?? a.replace(/^-+/, "")
      const next = argv[i + 1]
      if (next === undefined || next.startsWith("-")) {
        flags[key] = true
      } else {
        flags[key] = next
        i++
      }
    } else {
      ;(flags._ as string[]).push(a)
    }
  }
  return flags
}

const HELP = `gupy-cli — search jobs on Gupy (portal.gupy.io, Brazil)

USAGE
  bun run src/cli.ts search --query "<termo>" [flags]
  bun run src/cli.ts detail <jobUrl> [--format json|plain]

SEARCH FLAGS
  --query, -q <text>      Termo de busca (cargo/skill). REQUIRED. Gupy matches it against
                          the job name and description.
  --remote <mode>         remote | hybrid | onsite (aliases: remoto, hibrido, presencial).
  --state <text>          Estado por extenso, ex. "São Paulo", "Rio de Janeiro".
  --city <text>           Cidade, ex. "São Paulo", "Campinas".
  --type <type>           internship (estagio) | effective (efetivo) | apprentice (aprendiz)
                          | trainee | temporary | associate | talent_pool | freelancer | ...
  --jobage <days>         Publicada nos últimos N dias (filtro client-side em publishedDate).
  --page <n>              1-indexed page (20 results/page). Default 1.
  --limit, -n <n>         Cap results emitted (client-side).
  --format <fmt>          json (default) | table | plain.

EXAMPLES
  bun run src/cli.ts search -q "estágio dados" --state "São Paulo" --format table
  bun run src/cli.ts search -q "desenvolvedor júnior" --remote remote --jobage 14 --format table
  bun run src/cli.ts search -q "java" --type internship --city "São Paulo" --format table
  bun run src/cli.ts detail "https://empresa.gupy.io/job/eyJqb2JJZCI6MTIzfQ==" --format plain
`

const KNOWN_FLAGS: Record<string, Set<string>> = {
  search: new Set(["query", "remote", "state", "city", "type", "jobage", "page", "limit", "format", "help", "h"]),
  detail: new Set(["format", "help", "h"]),
}

function fail(error: string, code: string): number {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
  return 1
}

async function main(): Promise<number> {
  const flags = parseFlags(process.argv.slice(2))
  const cmd = (flags._ as string[])[0]

  if (!cmd || flags.help || flags.h) {
    process.stdout.write(HELP)
    return cmd ? 0 : 1
  }

  const knownFlags = KNOWN_FLAGS[cmd]
  if (knownFlags) {
    for (const key of Object.keys(flags)) {
      if (key === "_" || knownFlags.has(key)) continue
      return fail(
        `unknown flag --${key} for '${cmd}' - flags are never silently ignored, because a discarded filter changes what the search returns; see --help for the supported flags`,
        "UNKNOWN_FLAG",
      )
    }
  }

  const textFlag = (name: string): string | undefined | null => {
    const v = flags[name]
    if (v === undefined) return undefined
    if (typeof v !== "string" || !v.trim()) return null
    return v.trim()
  }

  if (cmd === "search") {
    const query = textFlag("query")
    if (!query) return fail('the --query/-q flag is required and must be non-empty (e.g. -q "estágio dados")', "BAD_ARG")

    for (const name of ["state", "city"]) {
      if (textFlag(name) === null) return fail(`--${name} requires a non-empty value`, "BAD_ARG")
    }
    const remote = textFlag("remote")
    if (remote === null || (remote !== undefined && !WORKPLACE[remote.toLowerCase()])) {
      return fail(`--remote must be one of remote|hybrid|onsite, got ${remote ? `"${remote}"` : "no value"}`, "BAD_ARG")
    }
    const type = textFlag("type")
    if (type === null || (type !== undefined && !JOB_TYPES[type.toLowerCase()])) {
      return fail(
        `--type must be one of ${Object.keys(JOB_TYPES).join("|")}, got ${type ? `"${type}"` : "no value"}`,
        "BAD_ARG",
      )
    }
    const fmt = flags.format !== undefined ? String(flags.format) : "json"
    if (!["json", "table", "plain"].includes(fmt)) return fail(`--format must be one of json|table|plain, got "${fmt}"`, "BAD_ARG")

    const ints: Record<string, number | undefined> = {}
    for (const name of ["jobage", "page", "limit"]) {
      const raw = flags[name]
      if (raw === undefined) continue
      const val = typeof raw === "string" ? Number(raw.trim()) : NaN
      if (!Number.isInteger(val) || val < 1) return fail(`--${name} must be a whole number of at least 1, got "${raw}"`, "BAD_ARG")
      ints[name] = val
    }

    const opts: SearchOpts = {
      query,
      remote: remote ?? undefined,
      state: textFlag("state") ?? undefined,
      city: textFlag("city") ?? undefined,
      type: type ?? undefined,
      jobage: ints.jobage,
      page: ints.page ?? 1,
      limit: ints.limit,
      format: fmt as SearchOpts["format"],
    }
    return runSearch(opts)
  }

  if (cmd === "detail") {
    const url = (flags._ as string[])[1]
    if (!url) return fail("detail requires a <jobUrl>", "NO_ID")
    const fmt = flags.format !== undefined ? String(flags.format) : "json"
    if (!["json", "plain"].includes(fmt)) return fail(`--format must be one of json|plain, got "${fmt}"`, "BAD_ARG")
    const opts: DetailOpts = { url, format: fmt as DetailOpts["format"] }
    return runDetail(opts)
  }

  return fail(`Unknown command "${cmd}"`, "BAD_CMD")
}

main()
  .then((code) => process.exit(code))
  .catch((e) => {
    process.stderr.write(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e), code: "INTERNAL_ERROR" }) + "\n",
    )
    process.exit(1)
  })
