// Data source: Gupy's public job portal (portal.gupy.io), Brazil. No authentication.
// Search uses the JSON endpoint the portal's own front-end calls
// (GET https://portal.gupy.io/api/job-search/jobs). Detail fetches the company's
// public job page (<subdomain>.gupy.io/job/<hash>) and reads the posting from the
// Next.js __NEXT_DATA__ JSON embedded in it. See ../../url-reference.md.

import { decodeHtmlEntities, stripTags, visibleHtml } from "./sanitize.js"

export { stripInvisible } from "./sanitize.js"

export const SEARCH_URL = "https://portal.gupy.io/api/job-search/jobs"

export function writeError(error: string, code: string): void {
  process.stderr.write(JSON.stringify({ error, code }) + "\n")
}

const UA = "Mozilla/5.0 (compatible; gupy-cli/1.0)"

/** Fetch text with exponential backoff + jitter on 429/5xx. Returns "" on a 404. */
export async function httpFetch(url: string, accept = "application/json"): Promise<string> {
  const maxRetries = 6
  let delay = 500
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const response = await fetch(url, {
      headers: { "User-Agent": UA, Accept: accept, "Accept-Language": "pt-BR,pt;q=0.9" },
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
    })
    if (response.status === 429 || response.status >= 500) {
      if (attempt === maxRetries) throw new Error(`Request failed: ${response.status} ${response.statusText}`)
      const jitter = Math.floor(Math.random() * 500)
      await new Promise((r) => setTimeout(r, delay + jitter))
      delay = Math.min(delay * 2, 8000)
      continue
    }
    if (response.status === 404) return ""
    if (!response.ok) throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    return response.text()
  }
  throw new Error("Request failed after max retries")
}

export function clean(html: string): string {
  return decodeHtmlEntities(stripTags(html))
}

/** HTML block -> readable text, keeping paragraph and list-item breaks. */
export function htmlToText(html: unknown): string | null {
  if (typeof html !== "string" || !html.trim()) return null
  // Hidden markup goes before the line split: a hidden element can span breaks.
  const withBreaks = visibleHtml(html)
    .replace(/\s+/g, " ")
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<\/(p|li|ul|ol|div|h\d)>/gi, "\n")
  const text = withBreaks
    .split("\n")
    .map((line) => {
      const bullet = line.trimStart().startsWith("- ")
      const c = clean(line)
      return bullet && !c.startsWith("-") ? `- ${c}` : c
    })
    .filter((l) => l !== "-")
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\n+(?=- )/g, "\n")
    .trim()
  return text || null
}

// ---------------------------------------------------------------------------
// Gupy-specific mapping
// ---------------------------------------------------------------------------

export interface JobCard {
  id: string
  title: string
  company: string | null
  location: string | null
  workplaceType: string | null // remote | hybrid | on-site
  jobType: string | null // internship | effective | apprentice | trainee | talent_pool | ...
  date: string | null // ISO publishedDate
  deadline: string | null // applicationDeadline (YYYY-MM-DD) when the employer set one
  url: string
}

/** CLI value -> Gupy workplaceType query value. */
export const WORKPLACE: Record<string, string> = {
  remote: "remote",
  remoto: "remote",
  hybrid: "hybrid",
  hibrido: "hybrid",
  onsite: "on-site",
  "on-site": "on-site",
  presencial: "on-site",
}

/** CLI value -> Gupy jobType query value. */
export const JOB_TYPES: Record<string, string> = {
  internship: "vacancy_type_internship",
  estagio: "vacancy_type_internship",
  effective: "vacancy_type_effective",
  efetivo: "vacancy_type_effective",
  apprentice: "vacancy_type_apprentice",
  aprendiz: "vacancy_type_apprentice",
  trainee: "vacancy_type_trainee",
  temporary: "vacancy_type_temporary",
  associate: "vacancy_type_associate",
  talent_pool: "vacancy_type_talent_pool",
  freelancer: "vacancy_type_freelancer",
  autonomous: "vacancy_type_autonomous",
  summer: "vacancy_type_summer",
}

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null
}

export function shortJobType(t: unknown): string | null {
  const s = str(t)
  return s ? s.replace(/^vacancy_type_/, "") : null
}

/** Map one item of the search endpoint's `data` array. Returns null when id/name/url are missing. */
export function mapSearchItem(item: Record<string, unknown>): JobCard | null {
  const id = item.id !== undefined && item.id !== null ? String(item.id) : null
  const title = str(item.name)
  const url = str(item.jobUrl)
  if (!id || !title || !url) return null
  const city = str(item.city)
  const state = str(item.state)
  const wt = str(item.workplaceType)
  let location = [city, state].filter(Boolean).join(", ") || null
  if (!location && wt === "remote") location = "Remoto"
  const deadline = str(item.applicationDeadline)
  return {
    id,
    title: clean(title),
    company: str(item.careerPageName) ? clean(item.careerPageName as string) : null,
    location,
    workplaceType: wt,
    jobType: shortJobType(item.type),
    date: str(item.publishedDate),
    deadline: deadline ? deadline.slice(0, 10) : null,
    url,
  }
}

const GUPY_HOST = /^[a-z0-9-]+\.gupy\.io$/i

/**
 * Accept only a Gupy company job URL: https://<subdomain>.gupy.io/job/<hash>[?...].
 * Host and path go through real URL parsing, so look-alike hosts
 * (x.gupy.io.evil.com) and userinfo tricks fall on the reject side.
 */
export function normalizeJobUrl(input: string): string | null {
  const trimmed = input.trim()
  let parsed: URL
  try {
    parsed = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`)
  } catch {
    return null
  }
  if (parsed.username || parsed.password) return null
  const host = parsed.hostname.toLowerCase()
  if (!GUPY_HOST.test(host) || host === "portal.gupy.io" || host === "login.gupy.io") return null
  if (!/^\/(?:[a-z]{2}\/)?jobs?\/[^/]+\/?$/i.test(parsed.pathname)) return null
  return `https://${host}${parsed.pathname}${parsed.search}`
}

/** Pull the Next.js __NEXT_DATA__ JSON out of a page. */
export function nextData(html: string): Record<string, any> | null {
  const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
  if (!m) return null
  try {
    return JSON.parse(m[1])
  } catch {
    return null
  }
}

export interface JobDetail {
  id: string
  title: string
  company: string | null
  location: string | null
  workplaceType: string | null
  jobType: string | null
  date: string | null
  deadline: string | null
  status: string | null
  isActive: boolean
  steps: string[]
  description: string | null
  responsibilities: string | null
  prerequisites: string | null
  benefits: string | null
  url: string
}

export function parseJobDetail(html: string, url: string): JobDetail | null {
  const nd = nextData(html)
  const job = nd?.props?.pageProps?.job
  if (!job || typeof job !== "object") return null
  const city = str(job.addressCity)
  const state = str(job.addressStateShortName) ?? str(job.addressState)
  const wt = str(job.workplaceType)
  let location = [city, state].filter(Boolean).join(", ") || null
  if (!location && wt === "remote") location = "Remoto"
  const status = str(job.status)
  const deadline = str(job.registerEndDate) ?? str(job.expiresAt)
  const steps: string[] = Array.isArray(job.jobSteps)
    ? job.jobSteps
        .map((s: any) => {
          const name = str(s?.name)
          const cat = str(s?.category)
          return name ? (cat ? `${clean(name)} (${cat})` : clean(name)) : null
        })
        .filter((s: string | null): s is string => s !== null)
    : []
  const today = new Date().toISOString().slice(0, 10)
  return {
    id: String(job.id ?? ""),
    title: clean(String(job.name ?? "(sem título)")),
    company: str(job.careerPage?.name) ? clean(job.careerPage.name) : null,
    location,
    workplaceType: wt,
    jobType: shortJobType(job.jobType),
    date: str(job.publishedAt),
    deadline: deadline ? deadline.slice(0, 10) : null,
    status,
    // "published" and not past the registration deadline. Absence of a closed
    // marker is not proof the posting is open - /rank still verifies.
    isActive: status === "published" && (!deadline || deadline.slice(0, 10) >= today),
    steps,
    description: htmlToText(job.description),
    responsibilities: htmlToText(job.responsibilities),
    prerequisites: htmlToText(job.prerequisites),
    benefits: htmlToText(job.relevantExperiences),
    url,
  }
}
