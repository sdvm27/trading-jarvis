# Trading Jarvis

Personal trading dashboard: macro charts, market rotation, and ChartInk screeners.

## Run locally

```bash
cp .env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Screener search

Use the header search or home hero:

- **Stock symbol** (e.g. `RELIANCE`) → stock page with ChartInk link + screener checks
- **Screener name or slug** → open in app
- **ChartInk screener URL** → open in app or new tab

## Macro pulse

Add metrics from **Tigzig** (built-ins), **NSE** indices, or **Yahoo** global tickers via the home **Add new** search.

## Data

- Nifty P/B, USD/INR, Brent: [Tigzig](https://api.tigzig.com)
- India VIX / Nifty index levels: Yahoo or NSE where applicable
- Screeners: ChartInk (in-app table may be empty if ChartInk blocks automated results — use **Open on ChartInk**)

Not investment advice.
