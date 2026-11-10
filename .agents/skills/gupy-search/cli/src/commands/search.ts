import {
  SEARCH_URL,
  JOB_TYPES,
  WORKPLACE,
  httpFetch,
  mapSearchItem,
  stripInvisible,
  writeError,
  type JobCard,
} from "../helpers.js"

export interface SearchOpts {
  query: string
  jobage?: number
  remote?: string // remote | hybrid | onsite
  state?: string
  city?: string
  type?: string // internship | effective | ...
  page: number
  limit?: number
  format: "json" | "table" | "plain"
}

/** Results requested per page from Gupy (the portal UI uses 12; the endpoint accepts more). */
export const PAGE_SIZE = 20

export function buildUrl(opts: SearchOpts): string {
  const params = new URLSearchParams()
  params.set("jobName", opts.query)
  if (opts.remote) params.set("workplaceType", WORKPLACE[opts.remote.toLowerCase()])
  if (opts.state) params.set("state", opts.state)
  if (opts.city) params.set("city", opts.city)
  if (opts.type) params.set("type", JOB_TYPES[opts.type.toLowerCase()])
  params.set("limit", String(PAGE_SIZE))
  params.set("offset", String((opts.page - 1) * PAGE_SIZE))
  return `${SEARCH_URL}?${params.toString()}`
}

function renderTable(cards: JobCard[]): string {
  if (cards.length === 0) return "No results."
  const header =
    "ID".padEnd(9) + " " + "TITLE".padEnd(48) + " " + "COMPANY".padEnd(26) + " " + "LOCATION".padEnd(22) + " " + "MODE".padEnd(8) + " " + "TYPE".padEnd(11) + " DATE"
  const rows = cards.map((c) =>
    [
      c.id.padEnd(9),
      (c.title || "").slice(0, 48).padEnd(48),
      (c.company || "—").slice(0, 26).padEnd(26),
      (c.location || "—").slice(0, 22).padEnd(22),
      (c.workplaceType || "—").slice(0, 8).padEnd(8),
      (c.jobType || "—").slice(0, 11).padEnd(11),
      (c.date || "—").slice(0, 10),
    ].join(" "),
  )
  return [header, "-".repeat(header.length), ...rows].join("\n")
}

export async function runSearch(opts: SearchOpts): Promise<number> {
  try {
    const body = await httpFetch(buildUrl(opts))
    if (!body) {
      writeError("Gupy search endpoint returned 404 - the portal API may have moved; see url-reference.md", "NOT_FOUND")
      return 1
    }
    let parsed: any
    try {
      parsed = JSON.parse(body)
    } catch {
      writeError("Gupy search endpoint did not return JSON - the portal API may have changed", "BAD_RESPONSE")
      return 1
    }
    const data: unknown[] = Array.isArray(parsed?.data) ? parsed.data : []
    let cards = stripInvisible(
      data
        .map((d) => (d && typeof d === "object" ? mapSearchItem(d as Record<string, unknown>) : null))
        .filter((c): c is JobCard => c !== null),
    )
    // Gupy has no posting-age parameter: filter client-side on publishedDate.
    if (opts.jobage !== undefined) {
      const cutoff = Date.now() - opts.jobage * 86400_000
      cards = cards.filter((c) => !c.date || Date.parse(c.date) >= cutoff)
    }
    if (opts.limit !== undefined) cards = cards.slice(0, opts.limit)

    if (opts.format === "table") {
      process.stdout.write(renderTable(cards) + "\n")
    } else if (opts.format === "plain") {
      process.stdout.write(
        cards
          .map(
            (c) =>
              `${c.title}\n  ${c.company || "—"} · ${c.location || "—"} · ${c.workplaceType || "—"} · ${c.jobType || "—"} · ${(c.date || "—").slice(0, 10)}\n  id: ${c.id}\n  ${c.url}`,
          )
          .join("\n\n") + "\n",
      )
    } else {
      const total = typeof parsed?.pagination?.total === "number" ? parsed.pagination.total : null
      process.stdout.write(
        JSON.stringify({ meta: { count: cards.length, page: opts.page, total }, results: cards }, null, 2) + "\n",
      )
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "SEARCH_FAILED")
    return 1
  }
}
