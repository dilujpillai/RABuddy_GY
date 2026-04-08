# Second API Endpoint for Parallel Processing

Deploy this folder as a **separate Vercel project** to get a second API endpoint.

## Setup

1. `cd server`
2. `vercel login`
3. `vercel --prod`
4. Set environment variable: `vercel env add OPENROUTER_API_KEY` → paste your key
5. Copy the deployed URL (e.g. `https://risk-assessment-api-two.vercel.app`)
6. Update the `AI_URLS` array in `Index.HTML` to include both API URLs

## Why Two APIs?

Having two Vercel projects means:
- **Parallel requests** hit separate serverless function pools
- **OpenRouter rate limits** are per-request, not per-origin — parallel calls are fine
- **Redundancy** — if one endpoint has issues, the other still works
- **2x throughput** — cuts processing time roughly in half

## Architecture

```
Browser  ──┬──▶  API 1 (risk-assessment-api-nine.vercel.app)  ──▶  OpenRouter  ──▶  GPT-4o-mini
            │
            └──▶  API 2 (risk-assessment-api-two.vercel.app)   ──▶  OpenRouter  ──▶  GPT-4o-mini
```
