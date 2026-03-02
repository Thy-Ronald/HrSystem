# Deployment & Hosting Guide

This document covers the complete hosting setup for the HR System, including all services used, how to access them, how to re-deploy, environment variables, and billing considerations.

---

## Architecture Overview

```
Browser  ──HTTPS──►  Firebase Hosting (thyinc.web.app)
                          │  (serves static React/Vite bundle)
                          │
                     REST + WebSocket
                          │
                          ▼
               Google Cloud Run  ──ADC──►  Firebase Project B
         (hr-backend, us-central1)            (Firestore + Auth)
                          │
                          ├──────────────►  Upstash Redis
                          │              (cache + Socket.IO pub/sub)
                          │
                          └──────────────►  Firebase Project A
                                           (safedrain-b50e8 / employee tracking)
                                           via bundled service account JSON
```

---

## 1. Frontend — Firebase Hosting

| Property | Value |
|---|---|
| **Platform** | Firebase Hosting |
| **Firebase Project** | `capstone-31b9e` |
| **Hosting Site ID** | `thyinc` |
| **Live URL** | https://thyinc.web.app |
| **Alt URL** | https://capstone-31b9e.web.app |
| **Source directory** | `frontend/dist` (Vite production build) |
| **Framework** | React 18 + Vite 7 |

### What gets deployed
The Vite build output from `frontend/dist/` is uploaded as a static site. All routes are rewritten to `/index.html` (SPA routing). Assets under `/assets/**` are cached for 1 year (immutable hashing).

### Console
https://console.firebase.google.com/project/capstone-31b9e/hosting

---

## 2. Backend — Google Cloud Run

| Property | Value |
|---|---|
| **Platform** | Google Cloud Run (fully managed) |
| **GCP Project** | `capstone-31b9e` |
| **Service name** | `hr-backend` |
| **Region** | `us-central1` (Iowa) |
| **Live URL** | https://hr-backend-580487237653.us-central1.run.app |
| **Latest revision** | `hr-backend-00007-4d9` |
| **Container port** | `8080` (Cloud Run default) |
| **Runtime** | Node.js 20 (slim Docker image) |

### How it's containerized
A two-stage Dockerfile is used:

```
Stage 1 (deps)   — node:20-slim, installs production npm packages
Stage 2 (runtime)— node:20-slim, copies deps + source + Project A service account JSON
```

- `NODE_ENV=production` is baked into the image.
- Firebase Project B credentials are **not** bundled — Cloud Run uses **Application Default Credentials (ADC)** via the attached service account.
- The Project A credential (`safedrain-b50e8-firebase-adminsdk-fbsvc-c2b87409f7.json`) is bundled in the image because it is read-only and required for employee tracking.

### Cloud Run service account
```
580487237653-compute@developer.gserviceaccount.com
```
IAM roles granted:
- `roles/firebase.admin` — Firestore + Auth access for Project B
- `roles/iam.serviceAccountTokenCreator` — required for `createCustomToken()` (GitHub OAuth flow)

### Console
https://console.cloud.google.com/run/detail/us-central1/hr-backend/metrics?project=capstone-31b9e

---

## 3. Database & Auth — Firebase Project B (Firestore)

| Property | Value |
|---|---|
| **Firebase Project** | `capstone-31b9e` |
| **Services used** | Firestore (NoSQL), Firebase Authentication |
| **Auth providers** | Email/Password, GitHub OAuth |
| **Firestore location** | `nam5` (US multi-region) |

### Collections
| Collection | Purpose |
|---|---|
| `users` | User profiles, roles (`admin` / `employee`) |
| `monitoring_requests` | Admin → employee monitoring approval requests |
| `notifications` | In-app notifications with read/unread status |
| `settings` | Per-user app settings |
| `github_issues_cache` | Cached GitHub issue data with TTL |

### Console
https://console.firebase.google.com/project/capstone-31b9e/firestore

---

## 4. Cache + Socket.IO Pub/Sub — Upstash Redis

| Property | Value |
|---|---|
| **Provider** | Upstash (serverless Redis) |
| **Host** | `fun-sheepdog-28590.upstash.io` |
| **Port** | `6379` (TLS — `rediss://`) |
| **Used for** | HTTP response caching (contracts, personnel) + Socket.IO Redis adapter (cross-instance pub/sub) |

### Why Upstash
Cloud Run can scale to multiple instances. The `@socket.io/redis-adapter` uses Upstash as a pub/sub bus so that a Socket.IO event emitted on instance A is relayed to all sockets connected to instance B. Without this, monitoring sessions would break when users land on different instances.

### Dashboard
https://console.upstash.com

---

## 5. Environment Variables

### Backend (set on Cloud Run)
Set these in the Cloud Run console under **Edit & Deploy New Revision → Variables & Secrets**, or via CLI:

```bash
gcloud run services update hr-backend --region us-central1 \
  --set-env-vars "VAR_NAME=value"
```

| Variable | Description |
|---|---|
| `NODE_ENV` | `production` (baked into Docker image) |
| `FRONTEND_URL` | `https://thyinc.web.app` — used for CORS |
| `BACKEND_URL` | `https://hr-backend-580487237653.us-central1.run.app` — used in GitHub OAuth callback |
| `REDIS_URL` | `rediss://...@fun-sheepdog-28590.upstash.io:6379` |
| `GITHUB_CLIENT_ID` | GitHub OAuth App Client ID |
| `GITHUB_CLIENT_SECRET` | GitHub OAuth App Client Secret |
| `EMAILJS_SERVICE_ID` | EmailJS service ID (contract expiration emails) |
| `EMAILJS_TEMPLATE_ID` | EmailJS template ID |
| `EMAILJS_PUBLIC_KEY` | EmailJS public key |
| `EMAILJS_PRIVATE_KEY` | EmailJS private key |

> **Note:** Firebase Project B credentials do **not** need to be set — the Cloud Run service account handles authentication automatically via ADC.

### Frontend (build-time)
Stored in `frontend/.env.production`. These are embedded into the static bundle at build time by Vite.

| Variable | Value |
|---|---|
| `VITE_API_BASE` | `https://hr-backend-580487237653.us-central1.run.app` |
| `VITE_FIREBASE_API_KEY` | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `capstone-31b9e.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | `capstone-31b9e` |
| `VITE_FIREBASE_STORAGE_BUCKET` | `capstone-31b9e.firebasestorage.app` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `580487237653` |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | Google Analytics measurement ID |

---

## 6. How to Re-Deploy

### Prerequisites (one-time setup)
```bash
# Install Firebase CLI
npm install -g firebase-tools
firebase login

# Install Google Cloud SDK (Windows: download installer from cloud.google.com/sdk)
gcloud auth login
gcloud config set project capstone-31b9e
```

### Deploy Frontend
```bash
cd frontend
npm run build                              # creates frontend/dist/
firebase deploy --only hosting:thyinc     # uploads dist/ to Firebase Hosting
```

### Deploy Backend
```bash
cd backend

# Uses Dockerfile + source upload — Cloud Build compiles the image
"C:\Users\Admin\AppData\Local\Google\Cloud SDK\google-cloud-sdk\bin\gcloud.cmd" ^
  run deploy hr-backend --source . --region us-central1
```

Or if `gcloud` is in your PATH:
```bash
gcloud run deploy hr-backend --source . --region us-central1
```

### Deploy Both at Once
```bash
# From repo root
cd frontend && npm run build && firebase deploy --only hosting:thyinc
cd ../backend && gcloud run deploy hr-backend --source . --region us-central1
```

### Deploy Firebase Rules / Indexes only
```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

---

## 7. GitHub OAuth Setup (manual step if rotating credentials)

1. Go to https://github.com/settings/developers → your OAuth App
2. Set **Authorization callback URL** to:
   ```
   https://hr-backend-580487237653.us-central1.run.app/api/auth/github/callback
   ```
3. Copy the new **Client ID** and **Client Secret** to Cloud Run env vars (`GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`)

---

## 8. Admin User Management

To grant a user admin rights, run the promotion script locally:

```bash
cd backend
# edit the email address in src/scripts/promote_admin.js first
node src/scripts/promote_admin.js
```

This sets `role: 'admin'` in the user's Firestore document under the `users` collection.

---

## 9. Billing & Costs

### Firebase Hosting — Free (Spark plan)
| Metric | Free limit |
|---|---|
| Storage | 10 GB |
| Data transfer | 360 MB/day |
| Custom domains | Included |

Static files for this project are ~3 MB — well within free tier. Upgrades to Blaze plan only needed if traffic exceeds the daily data transfer limit.

### Cloud Run — Pay-per-use (Blaze plan required)
| Metric | Price | Free tier |
|---|---|---|
| vCPU time | $0.00002400 / vCPU-second | 180,000 vCPU-seconds/month |
| Memory | $0.00000250 / GiB-second | 360,000 GiB-seconds/month |
| Requests | $0.40 / million | 2 million requests/month |
| Networking egress | $0.12 / GB (after 1 GB/month free) | 1 GB/month |

**Typical cost at low traffic (< 100 daily users):** ~$0–$5/month, mostly within free tier.  
**Configuration:** The service is set to scale to 0 when idle — no cost during zero-traffic periods.

### Firestore — Pay-per-use (Blaze plan)
| Metric | Price | Free tier |
|---|---|---|
| Reads | $0.06 / 100,000 | 50,000/day |
| Writes | $0.18 / 100,000 | 20,000/day |
| Deletes | $0.02 / 100,000 | 20,000/day |
| Storage | $0.18 / GiB | 1 GiB |

**Typical cost at low traffic:** ~$0–$3/month.

### Upstash Redis — Free tier
| Metric | Free limit |
|---|---|
| Commands/day | 10,000 |
| Max data size | 256 MB |
| Max connections | 20 simultaneous |

Free tier is sufficient for development and moderate production. Pay-as-you-go kicks in above 10,000 commands/day at $0.2 per 100,000 commands.

### Estimated monthly total (low traffic)
| Service | Est. monthly cost |
|---|---|
| Firebase Hosting | $0.00 |
| Cloud Run | $0.00 – $5.00 |
| Firestore | $0.00 – $3.00 |
| Upstash Redis | $0.00 |
| **Total** | **$0 – $8/month** |

> To monitor actual spend: https://console.cloud.google.com/billing

---

## 10. Monitoring & Logs

### Cloud Run logs (real-time)
```bash
gcloud run services logs read hr-backend --region us-central1 --limit 100
# Or stream live:
gcloud beta run services logs tail hr-backend --region us-central1
```

Or in the console:
https://console.cloud.google.com/run/detail/us-central1/hr-backend/logs?project=capstone-31b9e

### Firebase Hosting logs
https://console.firebase.google.com/project/capstone-31b9e/hosting

### Health check endpoint
```
GET https://hr-backend-580487237653.us-central1.run.app/api/health
```
Returns:
```json
{ "status": "ok", "timestamp": "...", "database": "firestore" }
```

---

## 11. Quick Reference

| Item | Value |
|---|---|
| Frontend URL | https://thyinc.web.app |
| Backend URL | https://hr-backend-580487237653.us-central1.run.app |
| GCP Project ID | `capstone-31b9e` |
| Firebase Project | `capstone-31b9e` |
| Cloud Run region | `us-central1` |
| Firebase Hosting site | `thyinc` |
| Cloud Run service account | `580487237653-compute@developer.gserviceaccount.com` |
| Upstash host | `fun-sheepdog-28590.upstash.io:6379` |
