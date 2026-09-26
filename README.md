# V-BUY — VIT Chennai Smart Food & Wallet Platform

V-BUY is a campus food pre-ordering, prepaid wallet, and kitchen management system built for VIT Chennai's 13+ canteens and Riviera Fest stalls. It eliminates physical counter queues by enabling students to browse live menus, pay instantly from their campus wallet, receive real-time kitchen updates, and collect orders via QR token verification.

---

## Documentation

Comprehensive project documentation is organized in the `/docs` directory:

- [Tooling & Architecture](docs/TOOLS.md): Stack breakdown and technical justifications for React, Vite, Capacitor, FastAPI, Supabase, PhonePe, MSG91, and Render.
- [Order Workflow](docs/WORKFLOW.md): Step-by-step lifecycle from wallet top-up and transactional debit to real-time KDS dispatch, dual-path stock tracking, and collection.
- [Role Hierarchy](docs/ROLES.md): Access permissions, visibility rules, and creation flows across Super Admin, Shop Admin, Shop Staff, and Student accounts.
- [Feature Catalog](docs/FEATURES.md): Running catalog of all engagement and queue-reduction additions beyond the core loop, noting schema and procedure impacts.

---

## Local Development Setup

### 1. Prerequisites
- Node.js (v18+) and npm
- Python (3.10+) with `venv`
- Supabase project credentials

### 2. Environment Variables

Create `.env` in `frontend/`:
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous client API key
- `VITE_API_URL`: Backend URL (e.g. `http://localhost:8000`)

Create `.env` in `backend/`:
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role secret
- `PHONEPE_MERCHANT_ID`: PhonePe merchant identifier
- `PHONEPE_SALT_KEY`: PhonePe salt key for SHA-256 payload signing
- `PHONEPE_SALT_INDEX`: Key index (typically `1`)
- `PHONEPE_ENV`: `SANDBOX` or `PRODUCTION`
- `MSG91_AUTH_KEY`: MSG91 SMS gateway API authorization key
- `QR_SECRET`: Random HMAC secret string for validating pickup QR tokens
- `FRONTEND_URL`: Allowed CORS origin (e.g. `http://localhost:5173`)

### 3. Running Locally

#### Frontend (React + Vite)
- Navigate to frontend directory:
  ```bash
  cd frontend
  npm install
  npm run dev
  ```
- Application opens at `http://localhost:5173`.

#### Backend (FastAPI)
- Navigate to backend directory:
  ```bash
  cd backend
  python -m venv venv
  source venv/bin/activate  # On Windows: .\venv\Scripts\activate
  pip install -r requirements.txt
  uvicorn main:app --reload --port 8000
  ```
- API server runs at `http://localhost:8000` with Swagger docs at `http://localhost:8000/docs`.

### 4. Database Migrations
- Apply the SQL migrations located in `supabase/migrations/` in sequential numerical order using the Supabase SQL Editor or Supabase CLI.
