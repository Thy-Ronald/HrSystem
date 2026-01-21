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

# EmailJS Configuration (for contract expiration notifications)
EMAILJS_SERVICE_ID=service_xre2ekc
EMAILJS_TEMPLATE_ID=template_1wwgxhv
EMAILJS_PUBLIC_KEY=OpoSKg71Mm4YSjsqt
EMAILJS_PRIVATE_KEY=your_private_key  # Get from EmailJS Account > API Keys (Private Key)
ADMIN_EMAIL=moranmoran930@gmail.com
```

### Contract Expiration Notifications

The system automatically checks for contracts expiring in 7 days and sends email notifications to the admin via EmailJS. The job runs daily at 9:00 AM.

**Setup EmailJS:**
1. Sign up at [EmailJS](https://www.emailjs.com/)
2. Create an email service (Gmail, Outlook, etc.)
3. Create an email template with these variables:
   - `{{to_email}}` - Admin email address
   - `{{employee_name}}` - Employee name
   - `{{position}}` - Employee position
   - `{{contract_type}}` - Contract type
   - `{{expiration_date}}` - Contract expiration date
   - `{{days_until_expiration}}` - Days until expiration (always "7")
4. Add your EmailJS credentials to `.env`

**Test endpoint:** `POST /api/contracts/test-expiration-notifications` - Manually trigger expiration check

## Frontend
- Responsive, HR-styled layout
- Contract form with validation and inline status
- GitHub dashboard with profile summary, top languages, and recent repos
