# Search Queries for Job Scraper

<!-- Versão BR (Gupy, consultas em português). Rode /setup para personalizar com o seu CV, ou preencha os [PLACEHOLDERS] à mão. -->

## Installed portal CLIs (primary for `/scrape`)

`/scrape` discovers every portal skill under `.agents/skills/*/SKILL.md` and runs its CLI first. Danish demos and any skill you add with `/add-portal` are included the same way. You do **not** need a matching `site:` line below for those CLIs to run.

**Portal configuration (versão BR):** the market is Brazil and the **only** portal in use is **Gupy** (`gupy-search`, under `.agents/skills/gupy-search/`). `linkedin-search` and `freehire-search` are set to `enabled: false`; the four Danish demos (Jobindex, Jobbank, Jobdanmark, Jobnet) ship disabled and stay disabled.

**gupy-search flags:** `--query` (the search term; one query string per term below), `--jobage` (recency, use 14 to match the Date Filter), `--state`, `--city`, `--remote`, `--type`, `--page`, `--limit`, `--format`. Gupy ANDs its filters, so "[SEU ESTADO] **or** remoto" is **two calls per term**: one with `--state "[SEU ESTADO]"` (then keep nearby cities client-side, see Location Filter) and one with `--remote remote`. Add `--type internship` for "estágio ..." terms only when a term returns too much noise. `gupy-search`'s own `SKILL.md` is the source of truth for the exact invocation; never pass a flag it does not document. Gupy matches the query against the job name *and* description and treats multi-word terms like a phrase, so keep terms to 1-3 words.

The `site:` query templates in this file are the **WebSearch fallback** — for when the Gupy CLI fails, or for company career pages.

**Language scope:** queries are written in **Portuguese only**. Gupy postings for this market are written in Portuguese, and English-language postings usually require fluent English. English role words that Brazilian postings use verbatim (full stack, front-end, back-end, BI, cloud) are kept as they appear in Portuguese ads. A posting requiring a language not declared, as a job condition, is excluded before scoring; a posting requiring a *higher level* of English is flagged — see `04-job-evaluation.md`'s Language Gate, the single source of truth for this rule.

## Search Sites

Primary (your market's job boards - scaffold one with `/add-portal`):
- **Gupy** (`portal.gupy.io`; vagas publicadas em `<empresa>.gupy.io/job/...`) - o único portal usado nesta busca; coberto pelo CLI `gupy-search`
- LinkedIn / freehire: CLIs instalados mas **desabilitados** (`enabled: false`); mude para `true` no `SKILL.md` de cada um para reativar

Secondary (company career pages via Google):
- Direct Google searches with `site:` filters for known target companies ([SUAS EMPRESAS-ALVO])

## Query Categories

<!-- PREENCHA COM AS SUAS ÁREAS. O /setup reescreve esta seção a partir do seu CV; os termos abaixo
são EXEMPLOS (perfil de estágio/júnior em tecnologia). Troque pelos cargos que você busca. -->

Queries are grouped by priority. Each line in the code blocks is one `--query` value for `gupy-search` (run with `--jobage 14`). Location is applied by the filter tiers below, not baked into the term. The `site:` lines are the WebSearch fallback only.

**Organize by function, not job title.** The same underlying work carries different titles across companies (estagiário, assistente, analista júnior, desenvolvedor júnior). Each category below covers one function with several title variants.

**Seniority filter for every category:** [AJUSTE: ex. keep estágio, trainee, júnior and assistente roles; discard pleno/sênior/especialista/lead or anything asking for 3+ anos de experiência]. Discard roles outside your area even if they match a keyword.

### Priority 1: [SUA ÁREA PRINCIPAL] (exemplo: desenvolvimento de software)

Por que esta área: [RESUMO DA SUA BASE NO CV].

```
desenvolvedor júnior
estágio desenvolvimento
estágio programação
java júnior
react júnior
full stack júnior
```

WebSearch fallback:
```
site:gupy.io "desenvolvedor júnior" [SUA CIDADE]
site:gupy.io "estágio" "desenvolvimento" [SUA CIDADE]
```

### Priority 2: [SUA SEGUNDA ÁREA] (exemplo: dados)

```
estágio dados
estágio análise de dados
analista de dados júnior
estágio BI
estágio sql
```

WebSearch fallback:
```
site:gupy.io "estágio em dados" [SUA CIDADE]
```

### Priority 3: [SUA TERCEIRA ÁREA] (exemplo: cloud)

```
estágio cloud
cloud júnior
aws júnior
azure júnior
```

## Location Filter

Candidate lives in **[SUA CIDADE] - [UF]**. Filter Gupy results client-side on city / state / `workplaceType`:
- **Ideal:** [SUA CIDADE] (presencial ou híbrido)
- **Ideal:** região metropolitana / cidades próximas: [LISTE AS CIDADES]
- **Acceptable:** 100% remoto no Brasil (qualquer cidade-sede)
- **Borderline:** presencial/híbrido em outras cidades ou estados - sinalizar e deixar o usuário decidir
- **Too far:** vagas fora do Brasil ou remoto internacional

## Affirmative-action Filter (opcional)

<!-- Use se você NÃO pertence aos grupos abaixo e quer descartar vagas exclusivas. Ajuste a lista aos
grupos a que você não pertence, ou apague esta seção inteira se não quiser o filtro. -->
Descartar vagas afirmativas ou exclusivas para grupos a que o candidato não pertence, olhando o título **e** a descrição. Termos que indicam isso:
- "afirmativa" ou "afirmativo";
- "exclusiva" ou "exclusivo" para PcD ou para pessoas com deficiência;
- "pessoas negras", "pretas e pardas";
- "LGBT", "LGBTQIA+", "pessoas trans";
- "exclusiva para mulheres".

Na dúvida, sinalizar em vez de manter em silêncio.

**Não confundir:** o selo "Também p/ PcD" da Gupy e frases como "vaga também para PcD" ou "aberta a todos" **não** tornam a vaga exclusiva. Essas continuam valendo.

## Language Filter

Your working languages and levels are in CLAUDE.md's Languages table. When filtering scraped results, apply `04-job-evaluation.md`'s Language Gate: a posting requiring a language you haven't declared at all is excluded; a posting requiring a higher level than you declared in a language you do work in is not excluded, flag it clearly instead (see `job-scraper/SKILL.md`'s Step 3 "Quick Fit Assessment" for how the flag surfaces in `/scrape` output). Postings simply *written* in a language you don't work in, that don't require it on the job, are fine.

## Date Filter

Only include jobs posted within the last 14 days, or with an application deadline that has not yet passed. If a posting date cannot be determined, include it but flag as "date unknown".

## Adapting Queries

If the user specifies a focus area, select queries from the matching category and also generate 2-3 custom queries for that focus. For example:
- "/scrape dados" -> the matching category + custom terms such as "estágio power bi" or "estágio engenharia de dados"
- "/scrape java" -> the matching category + custom terms such as "estágio back-end"
