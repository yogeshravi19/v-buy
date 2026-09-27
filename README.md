# V-BUY — VIT Chennai Campus Dining & Prepaid Wallet Platform

V-BUY is a campus food pre-ordering, prepaid wallet, and kitchen management system built for VIT Chennai canteens, food courts, and campus festival stalls. It eliminates physical counter lines by letting students load a digital campus wallet, browse live menus, pre-order meals, track kitchen progress in real time, and pick up food using digital token passes and QR codes.

---

## Documentation Directory

Explore the complete guides in the `/docs` folder for detailed breakdowns:

- [Tools & Stack (TOOLS.md)](docs/TOOLS.md): Plain-English overview of React, Vite, TypeScript, Tailwind CSS, Capacitor, FastAPI, Supabase, PhonePe, MSG91, GitHub, Render, and development MCP tools.
- [Database Deep Dive (DATABASE.md)](docs/DATABASE.md): Explanation of all live Supabase tables, how `outlet_id` connects food stalls, Row-Level Security, the step-by-step order journey, and financial margin rules.
- [Order Lifecycle (WORKFLOW.md)](docs/WORKFLOW.md): Step-by-step walk-through of the complete order workflow from PhonePe wallet top-up and instant wallet debit to live kitchen KDS dispatch and collection.
- [Role Hierarchy (ROLES.md)](docs/ROLES.md): Plain guide to the four user roles (Super Admin, Shop Admin, Shop Staff, Student) and how database rules protect each role's data.
- [Feature Catalog (FEATURES.md)](docs/FEATURES.md): Running catalog of active features (1-tap reorder, dish ratings, group ordering, scheduled pickup slots, coupons) and retired features.

---

## Local Development Setup

### 1. Prerequisites

- **Node.js**: Version 18 or newer (with npm)
- **Python**: Version 3.10 or newer (with `venv`)
- **Supabase Account**: A Supabase project with database credentials
- **PhonePe Merchant Credentials**: Sandbox or production credentials for wallet top-up testing

---

### 2. Environment Variables

#### Frontend Configuration (`frontend/.env` or `frontend/.env.local`)
- `VITE_SUPABASE_URL`: Your public Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous client API key
- `VITE_API_URL`: URL of the running FastAPI backend (for example: `http://localhost:8000`)

#### Backend Configuration (`backend/.env`)
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role secret key
- `PHONEPE_MERCHANT_ID`: Your PhonePe merchant identifier
- `PHONEPE_SALT_KEY`: PhonePe secret salt key used for SHA-256 signature verification
- `PHONEPE_SALT_INDEX`: PhonePe salt index (typically `1`)
- `PHONEPE_BASE_URL`: PhonePe API base endpoint (sandbox: `https://api-preprod.phonepe.com/apis/pg-sandbox`)
- `WEBHOOK_BASE_URL`: Public base URL where PhonePe sends callback webhooks (for example: `https://your-api.onrender.com`)
- `FRONTEND_URL`: Public web address of the frontend app (for example: `https://campusbite-web.onrender.com`)
- `MSG91_AUTH_KEY`: MSG91 API key for WhatsApp and SMS notification delivery
- `MSG91_WHATSAPP_NUM`: Registered integrated WhatsApp number for order alerts
- `QR_SECRET`: Secret key used to sign and verify order collection QR codes

---

### 3. Running the Project Locally

#### Frontend (React + Vite)
1. Open a terminal in the `frontend` folder:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
2. The application will start at `http://localhost:5173`.

#### Backend (FastAPI)
1. Open a terminal in the `backend` folder:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: .\venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn main:app --reload --port 8000
   ```
2. The API server will run at `http://localhost:8000` with interactive API documentation at `http://localhost:8000/docs`.

---

### 4. Database Setup & Migrations

- All database tables, Row-Level Security policies, and stored procedures are located in the `supabase/migrations/` directory.
- Apply migrations in sequential numerical order using the Supabase SQL Editor or Supabase CLI.
