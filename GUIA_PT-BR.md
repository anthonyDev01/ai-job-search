# Guia rápido: versão brasileira (Gupy)

Esta branch (`template-generico`) é o [ai-job-search](https://github.com/ai-job-search-dev/ai-job-search) adaptado para o mercado brasileiro. Os dados de quem usou a primeira versão foram tirados e trocados por campos `[ENTRE_COLCHETES]` para você preencher com os seus.

## O que mudou em relação ao original

| O quê | Onde |
|---|---|
| **Portal Gupy novo** (busca pública em `portal.gupy.io`, sem chave de API) | `.agents/skills/gupy-search/` (veja o `url-reference.md`) |
| LinkedIn e freehire desligados (`enabled: false`); só a Gupy roda no `/scrape` | `.agents/skills/*/SKILL.md` |
| Consultas de busca em português, filtro de localização e filtro opcional de vagas afirmativas/exclusivas | `.claude/skills/job-scraper/search-queries.md` |
| Seção **Respostas padrão para formulários** (turno, disponibilidade, pretensão, PcD...) | `CLAUDE.md` |
| Arquivo de progresso que o Claude lê no início de cada sessão | `PROGRESSO.md` |
| Títulos de seção do CV em português e carta de apresentação em pt-BR | `05-cv-templates.md`, `06-cover-letter-templates.md` |

## Como usar com os seus dados

1. **Clone só esta branch e mantenha o seu clone privado** (ele vai guardar telefone, e-mail e o seu histórico de candidaturas):
   ```bash
   git clone -b template-generico https://github.com/anthonyDev01/ai-job-search
   ```
2. **Instale as ferramentas:** [Claude Code](https://claude.com/claude-code), [bun](https://bun.sh), Python 3 e, se quiser CV adaptado por vaga, um LaTeX com `lualatex` (MiKTeX no Windows). Depois:
   ```bash
   python tools/install_portal_clis.py
   ```
3. **Coloque o seu CV em PDF** em `documents/cv/` (essa pasta é ignorada pelo git).
4. Abra o Claude Code na pasta e rode **`/setup`**. Ele lê o CV e preenche o `CLAUDE.md`, os arquivos `01` a `07` de `.claude/skills/job-application-assistant/` e o `cv/main_example.tex`. Diga que o mercado é o Brasil, que o CV é em português e que o portal é a Gupy.
5. **Confira o que o `/setup` não sabe** e complete à mão:
   - `CLAUDE.md` → **Respostas padrão para formulários** e **Deal-breakers**;
   - `.claude/skills/job-scraper/search-queries.md` → suas áreas, cidade e se quer o filtro de vagas afirmativas;
   - `PROGRESSO.md` → as regras que você quer que o Claude siga.
6. **Fluxo do dia a dia:**
   - `/scrape` busca as vagas na Gupy;
   - `/rank` dá uma nota de 0 a 100 para cada vaga contra o seu perfil;
   - `/apply <link da vaga>` avalia o encaixe e gera o CV adaptado (e a carta, se quiser).
   - Para enviar a candidatura, você faz o login na Gupy/LinkedIn no navegador e pode pedir ao Claude para preencher o formulário. Ele pausa em pretensão salarial sem valor definido e **não faz os testes da Gupy**.

Para conferir se sobrou algum campo sem preencher:
```bash
grep -rn "\[YOUR_\|\[SEU\|\[SUA" CLAUDE.md PROGRESSO.md .claude/skills/
```

## Cuidados

- **Não faça push dos seus dados para um repositório público.** O `.gitignore` já ignora os CVs gerados, o `job_search_tracker.csv` e `documents/cv/`, mas o `CLAUDE.md` e os arquivos de perfil são versionados.
- O endpoint da Gupy é o mesmo que o site usa internamente; não é uma API oficial e pode mudar. Se parar de funcionar, o `url-reference.md` descreve o plano B.
- No LinkedIn, mantenha volume baixo (uma candidatura a cada ~5 minutos): automação vai contra os termos e pode restringir a conta.
