import { httpFetch, normalizeJobUrl, parseJobDetail, stripInvisible, writeError } from "../helpers.js"

export interface DetailOpts {
  url: string
  format: "json" | "plain"
}

export async function runDetail(opts: DetailOpts): Promise<number> {
  const url = normalizeJobUrl(opts.url)
  if (!url) {
    writeError(
      `Not a Gupy job URL: "${opts.url}" - pass the jobUrl from search results (https://<empresa>.gupy.io/job/...)`,
      "BAD_URL",
    )
    return 1
  }
  try {
    const html = await httpFetch(url, "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8")
    if (!html) {
      writeError("Job not found", "NOT_FOUND")
      return 1
    }
    const parsed = parseJobDetail(html, url)
    if (!parsed) {
      writeError("Could not find the posting data (__NEXT_DATA__.props.pageProps.job) on the page", "PARSE_FAILED")
      return 1
    }
    const job = stripInvisible(parsed)

    if (opts.format === "plain") {
      const section = (label: string, text: string | null) => (text ? `\n## ${label}\n${text}` : "")
      const lines = [
        job.title,
        `${job.company || "—"} · ${job.location || "—"} · ${job.workplaceType || "—"} · ${job.jobType || "—"}`,
        `Publicada: ${(job.date || "—").slice(0, 10)} · Inscrições até: ${job.deadline || "—"} · Status: ${job.isActive ? "ACTIVE" : "CLOSED / EXPIRED"}`,
        job.steps.length ? `Etapas: ${job.steps.join(" → ")}` : "",
        section("Descrição", job.description),
        section("Responsabilidades", job.responsibilities),
        section("Requisitos", job.prerequisites),
        section("Informações adicionais / benefícios", job.benefits),
        "",
        `URL: ${job.url}`,
      ].filter((l) => l !== "")
      process.stdout.write(lines.join("\n") + "\n")
    } else {
      process.stdout.write(JSON.stringify(job, null, 2) + "\n")
    }
    return 0
  } catch (e) {
    writeError(e instanceof Error ? e.message : String(e), "DETAIL_FAILED")
    return 1
  }
}
