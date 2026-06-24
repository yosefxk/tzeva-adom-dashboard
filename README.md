# Red Alerts - Hosted on BaileyTV

A high-performance, visually stunning, self-hosted web application for tracking rocket alerts and civil defense warnings in Israel in real-time. Designed to run in a Docker container (perfect for Portainer / Jellymini home servers) with an architecture optimized for maximum resilience.

![Aesthetic Alert Dashboard](https://raw.githubusercontent.com/yaniv-golan/pikud-haoref-alerts/master/references/common-patterns.md) <!-- Example placeholder for visual context -->

---

## Key Features

1. **Live Pulsing Radar Map**: Centered on Israel, displaying active warning zones highlighted with glowing orange/red overlay polygons and pulsating beacons (Leaflet.js + CartoDB Dark Matter).
2. **Real-time Push Notifications**: A Server-Sent Events (SSE) broadcaster that pushes new warnings to client browsers instantly without client-side polling.
3. **HTML5 Background Alerts**: Supports desktop push alerts even when the dashboard tab is in the background.
4. **Synthesized Siren Alarm**: A Web Audio API sound wave oscillator that plays synthesized alert sweep tones without bundling binary audio assets.
5. **Historical Alert Logs**: Searchable and filterable archive with pagination and support for exporting reports to **CSV format**.
6. **Analytical Widgets**: Interactive visual trends showing hourly alert frequencies, target zone pie distributions, and lists of top targeted cities (Recharts).

---

## System Architecture & Resilience

To excel in technical interviews, this project was built around standard production-grade resilience patterns:

*   **Geo-blocking Fallback Strategy**: The official Home Front Command (Pikud Haoref) API blocks connections from non-Israeli IP addresses. To solve this, the backend poller uses a state machine: it polls the official API first, but if it encounters three consecutive timeouts or HTTP 403 Forbidden errors (common in cloud deployments), it automatically switches to the unblocked Tzofar API history feed. It occasionally retries Oref to restore the primary stream once blocks are lifted.
*   **Built-in SQLite (WAL Mode)**: Uses Node.js's native `node:sqlite` driver (no C++ binary compilations required, making it 100% platform-agnostic) wrapped in **Drizzle ORM** under Write-Ahead Logging (WAL) mode for fast, concurrent database reads and writes.
*   **Single Container Orchestration**: Frontend Vite React assets are compiled and served directly from the Express Node.js server. This eliminates CORS complexities, simplifies network routing, and packages the entire app into a single Docker image exposed on port `8080`.

---

## Directory Structure

```
tzeva-adom-dashboard/
├── Dockerfile             # Multi-stage optimized production build
├── docker-compose.yml     # Compose file mapping SQLite volumes
├── package.json           # Monorepo workspaces and scripts
├── backend/               # Express + node:sqlite + Drizzle Poller
│   ├── data/              # cities.json, polygons.json, alerts.db
│   └── src/
│       ├── index.ts       # Express Server & SSE Handlers
│       ├── poller.ts      # Resilient API Poller & Fallback
│       ├── db.ts          # SQLite Drizzle client
│       └── schema.ts      # Tables schemas
└── frontend/              # Vite React + Leaflet + Recharts
    └── src/
        ├── components/    # AlertMap, AlertHistory, AlertStats, LiveFeed
        ├── index.css      # Glassmorphism dark styling sheet
        └── App.tsx        # SSE listeners and notification logic
```

---

## Local Development Setup

### Prerequisites
*   Node.js v22.5.0 or newer (required for native `node:sqlite` support)
*   npm

### Installation & Run

1. Clone the repository and navigate to the project directory:
   ```bash
   cd tzeva-adom-dashboard
   ```

2. Install backend and frontend dependencies:
   ```bash
   npm install --prefix backend
   npm install --prefix frontend --legacy-peer-deps
   ```

3. Launch development servers:
   *   **Backend Server** (runs on port `8080`):
       ```bash
       npm run backend:dev
       ```
    *   **Frontend Client** (runs on port `5173`, requests to `/api` are automatically proxied to the backend):
        ```bash
        npm run frontend:dev
        ```

### Database Historical Backfill

To download and populate your local database with the entire historical warning records (174,000+ alerts since June 2019) in one go, run the CSV bulk backfiller script:
```bash
npm run db:backfill-csv --prefix backend
```
This script downloads a pre-compiled dataset from the community archive repository, groups events by warning incidents, normalizes date timestamps to UTC, and batch-inserts them into the SQLite database.

---

## Docker & Portainer Deployment

This application is fully containerized and runs seamlessly on Portainer or generic Docker engines.

Every push to the `main` branch automatically triggers a GitHub Action that builds and publishes the production-ready Docker image to the **GitHub Container Registry (GHCR)**.

### Portainer Stack Deployment (Recommended)

To deploy this in Portainer, create a new Stack and paste the following configuration in the **Web Editor**. It pulls the pre-built image automatically:

```yaml
version: '3.8'

services:
  red-alert-radar:
    image: ghcr.io/yosefxk/red-alert-dashboard:latest
    container_name: red-alert-radar
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - PORT=8080
      - NODE_ENV=production
    volumes:
      - alert_radar_data:/app/database

volumes:
  alert_radar_data:
    driver: local
```

### Local Docker Build

If you prefer to compile and run the container locally:

```bash
docker-compose up -d --build
```
The application will compile and launch on port `8080`.

---

## License
MIT License.
