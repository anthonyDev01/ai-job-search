# gupy-cli

Search jobs on [Gupy](https://portal.gupy.io) (Brazil) from the command line. Zero runtime
dependencies — `bun install` only pulls TypeScript dev types.

```bash
bun run src/cli.ts search -q "estágio dados" --state "São Paulo" --format table
bun run src/cli.ts detail "<jobUrl>" --format plain
bun test        # offline flag/parsing tests + one live smoke test
bun run typecheck
```

See `../SKILL.md` for all flags and `../url-reference.md` for the endpoints.
`src/sanitize.ts` is copied verbatim from `linkedin-search` (hidden-markup and
invisible-character stripping required by the portal-skill contract).
