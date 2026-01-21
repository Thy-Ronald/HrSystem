# HR Management System

Internal HR console with two flows:
- Employee Contract form to capture HR details
- GitHub statistics dashboard powered by the public GitHub API

## Stack
- Frontend: React (Vite), Tailwind CSS
- Backend: Node.js + Express
- Integration: GitHub public REST API (optional PAT via `GITHUB_TOKEN`)

## Quickstart
```bash
# Backend
cd backend
npm install
npm run dev        # http://localhost:4000

# Frontend (new shell)
cd frontend
npm install
npm run dev        # http://localhost:5173
```

The Vite dev server proxies `/api` to `http://localhost:4000` for local development.  
Set `VITE_API_BASE` if you deploy the backend separately.

## Backend
- `GET /api/health` – health check
- `POST /api/contracts` – save a contract (in-memory demo store)
- `GET /api/github/:username` – profile + repos + language usage

Optional: create `.env` in `backend/`:
```
PORT=4000
GITHUB_TOKEN=your_pat   # improves rate limits
```

## Frontend
- Responsive, HR-styled layout
- Contract form with validation and inline status
- GitHub dashboard with profile summary, top languages, and recent repos
