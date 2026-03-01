# Project B — Admin Dashboard Integration Guide

> Use this document as context when building the admin dashboard (Project B).
> It describes the Firestore schema written by the employee tracking app (Project A).

---

## Firestore Schema

### 1. Presence (Real-time — updates every ~2 minutes)

**Path:** `users/{uid}/presence/current`

```json
{
  "currentApp": "Visual Studio Code",
  "currentTitle": "activity-sync.ts",
  "category": "Development",
  "isIdle": false,
  "isPaused": false,
  "status": "active",
  "totalActiveMs": 9000000,
  "sessionStartedAt": 1740825600000,
  "lastSeen": "<Firestore Timestamp>"
}
```

| Field | Type | Description |
|---|---|---|
| `currentApp` | `string \| null` | App the user is currently using (`null` if idle/offline) |
| `currentTitle` | `string \| null` | Window title of the current app |
| `category` | `string` | One of: `Development`, `Communication`, `Browsing`, `Design`, `Documentation`, `Other`, `""` |
| `isIdle` | `boolean` | `true` when the system has been idle for 60+ seconds |
| `isPaused` | `boolean` | `true` when the employee manually paused tracking |
| `status` | `string` | One of: `active`, `idle`, `paused`, `offline` |
| `totalActiveMs` | `number` | Total active milliseconds tracked today |
| `sessionStartedAt` | `number \| null` | Epoch ms when the current session started |
| `lastSeen` | `Timestamp` | Firestore server timestamp of the last update |

---

### 2. Daily Activity (Batch — updates every ~5 minutes)

**Path:** `users/{uid}/activity/{YYYY-MM-DD}`

```json
{
  "totalActiveMs": 14400000,
  "totalIdleMs": 3600000,
  "apps": {
    "Code__dot__exe": 7200000,
    "chrome": 3600000
  },
  "activities": [
    {
      "app": "Code.exe",
      "title": "dashboard-shell.tsx",
      "start": 1740825600000,
      "end": 1740829200000,
      "durationMs": 3600000,
      "isIdle": false,
      "category": "Development"
    }
  ],
  "lastUpdated": "<Firestore Timestamp>"
}
```

| Field | Type | Description |
|---|---|---|
| `totalActiveMs` | `number` | Total active milliseconds for the day |
| `totalIdleMs` | `number` | Total idle milliseconds for the day |
| `apps` | `Record<string, number>` | Map of app name → total ms. **Dots are encoded as `__dot__`** |
| `activities` | `Array` | Array of activity entries (original names, no encoding) |
| `lastUpdated` | `Timestamp` | Firestore server timestamp of the last batch flush |

> **Important:** In the `apps` map, dots in app names are replaced with `__dot__`.
> To display correctly: `key.replace(/__dot__/g, ".")`
> The `activities` array contains original app names — no decoding needed.

---

### 3. User Profile

**Path:** `users/{uid}`

```json
{
  "uid": "abc123",
  "email": "john@company.com",
  "name": "John Doe",
  "role": "employee"
}
```

---

## What to Build

### 1. Live Team Overview

Use `onSnapshot` on every user's `presence/current` doc to display:

- **Name** and **status dot** (green = active, yellow = idle, gray = offline, blue = paused)
- **Current app** + window title
- **Category badge** (color-coded)
- **Total active time today** (format `totalActiveMs` as `Xh Ym`)
- **Last seen** relative time (e.g. "2 min ago")

### 2. Daily Summary Table

Read each user's `activity/{today}` doc to display:

- Total active time, total idle time
- Top 3 apps by duration
- Productivity % = `(Development + Design + Documentation ms) ÷ totalActiveMs × 100`

### 3. Employee Detail View

Click a user to see:

- Full **activity timeline** (from `activities` array, sorted by `end` desc)
- **App usage breakdown** (pie/bar chart from `apps` map)
- **Hourly active/idle chart** (derive from activities array by bucketing into hours)

---

## Important Notes

| Topic | Detail |
|---|---|
| **App name dots** | `apps` map keys use `__dot__` encoding. Decode with `.replace(/__dot__/g, ".")`. The `activities` array has original names. |
| **Presence staleness** | If `lastSeen` is older than 5 minutes, treat user as `offline` regardless of `status` (their app may have crashed). |
| **Date key format** | `YYYY-MM-DD` (e.g. `2026-03-01`) |
| **Categories** | `Development`, `Communication`, `Browsing`, `Design`, `Documentation`, `Other`, `Idle`, `Paused` |
| **Productive categories** | `Development`, `Design`, `Documentation` |
| **firebase-admin** | Bypasses security rules — full read access via service account, no auth needed. |

---

## Category Mappings

| Category | Apps (regex patterns used by tracker) |
|---|---|
| Development | `code`, `studio`, `terminal`, `powershell`, `cmd`, `git`, `node`, `vim`, `neovim`, `webstorm`, `intellij` |
| Communication | `slack`, `teams`, `discord`, `zoom`, `meet`, `telegram`, `whatsapp`, `skype` |
| Browsing | `chrome`, `edge`, `firefox`, `safari`, `opera`, `brave`, `vivaldi`, `arc`, `browser` |
| Design | `figma`, `xd`, `sketch`, `photoshop`, `illustrator`, `canva` |
| Documentation | `notion`, `word`, `docs`, `notepad`, `obsidian`, `onenote`, `evernote`, `pages` |
| Other | Everything else |

---

## Sample firebase-admin Code

```typescript
import admin from 'firebase-admin';
import serviceAccount from './serviceAccountKey.json';

// Initialize
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});
const db = admin.firestore();

// ─── 1. Get all employees ────────────────────────────────────
const usersSnap = await db.collection('users')
  .where('role', '==', 'employee')
  .get();

const employees = usersSnap.docs.map(doc => ({
  uid: doc.id,
  ...doc.data(),
}));

// ─── 2. Listen to presence in real-time ──────────────────────
employees.forEach(emp => {
  db.doc(`users/${emp.uid}/presence/current`)
    .onSnapshot(snap => {
      if (!snap.exists) return;
      const presence = snap.data()!;

      // Check staleness (treat as offline if lastSeen > 5 min ago)
      const lastSeenMs = presence.lastSeen?.toMillis?.() || 0;
      const isStale = Date.now() - lastSeenMs > 5 * 60 * 1000;
      const effectiveStatus = isStale ? 'offline' : presence.status;

      console.log(`${emp.name}: ${effectiveStatus} — ${presence.currentApp || 'N/A'}`);
      // → "John Doe: active — Visual Studio Code"
    });
});

// ─── 3. Get today's detailed activity ────────────────────────
function getTodayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

async function getUserActivity(uid: string) {
  const today = getTodayKey();
  const snap = await db.doc(`users/${uid}/activity/${today}`).get();
  if (!snap.exists) return null;

  const data = snap.data()!;

  // Unsanitize app keys for display
  const apps: Record<string, number> = {};
  Object.entries(data.apps || {}).forEach(([key, ms]) => {
    apps[key.replace(/__dot__/g, '.')] = ms as number;
  });

  return {
    totalActiveMs: data.totalActiveMs || 0,
    totalIdleMs: data.totalIdleMs || 0,
    apps,
    activities: data.activities || [],
    lastUpdated: data.lastUpdated,
  };
}

// ─── 4. Helper: format milliseconds ─────────────────────────
function formatMs(ms: number): string {
  const totalMin = Math.floor(ms / 60000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// ─── 5. Compute productivity % ──────────────────────────────
const PRODUCTIVE = ['Development', 'Design', 'Documentation'];

function getProductivity(activities: any[]): number {
  let productiveMs = 0;
  let totalMs = 0;
  activities.forEach(a => {
    if (a.isIdle) return;
    totalMs += a.durationMs;
    if (PRODUCTIVE.includes(a.category)) productiveMs += a.durationMs;
  });
  return totalMs > 0 ? Math.round((productiveMs / totalMs) * 100) : 0;
}
```

---

## Write Budget (for reference)

| Trigger | Per user/8hr day | 50 users |
|---|---|---|
| Activity batch (5 min) | 96 | 4,800 |
| App-switch flush (5 min cooldown) | ~48 | 2,400 |
| Presence (2 min cooldown) | ~120 | 6,000 |
| Eager flush + logout | 2 | 100 |
| **Total writes** | **~266** | **13,300 / 20k** ✅ |
| **Total reads** | **~15** | **750 / 50k** ✅ |
