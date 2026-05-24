# Automation Blueprints

This directory contains campaign blueprints used by [SquidWeave](https://github.com/knol3j/squidweave) — the autonomous outbound automation engine.

Each `.json` file defines:
- Campaign config (audience, objective, channels, locales)
- Design system (theme, palette, guidelines)
- Content angles for sequencing
- Research records (target accounts with intent/recency/fit scores)
- Prospect contacts for enrichment and outreach sequencing

## How to use

1. Add/edit a blueprint file
2. Push to this repo
3. SquidWeave's orchestrator picks it up automatically on its 12h cron cycle

Or run on demand:
```bash
cd ../squidweave
npm run automation:orchestrate
```

## Current blueprints

| File | Campaign | Locales |
|------|----------|---------|
| `hashnhedge-launch.json` | HashNHedge Compute Launch Campaign | en-US, en-GB, es-ES, pt-BR, zh-CN, ru-RU |
