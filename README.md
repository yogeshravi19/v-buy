# CampusBite (V-BUY) — VIT Chennai Smart Dining & Wallet Platform

[![Vite](https://img.shields.io/badge/Vite-8.3-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![React](https://img.shields.io/badge/React-19.2-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![PWA Ready](https://img.shields.io/badge/PWA-Installable-blueviolet?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Deploy to Render](https://img.shields.io/badge/Render-Blueprint%20Deploy-46E3B7?logo=render&logoColor=black)](https://render.com/)

A modern, high-performance campus dining, prepaid wallet, and live kitchen management platform designed specifically for **VIT Chennai**. It replaces crowded canteen queues with instant pre-ordering, live token generation, and secure campus wallet payments.

---

## 🌟 Key Highlights

- **🍱 Redesigned Canteen System Cards:**
  - Distinctive visual banner, emoji badge, and color palette for every campus counter (Gazebo C1 Snacks, C2 Desserts, Dakshin Chitra, Lassi House, Georgia Chai/Maggi, Alpha Non-Veg, Sri's Meals, Juice Corner, AB3 Amphitheatre).
  - Live status beacon with glowing pulse (`● OPEN NOW` / `CLOSED`).
  - Star ratings, review counts, wait time estimates (`⏱️ 4-6 min`), and cuisine chips (`Bestseller`, `Quick Bites`, `Combos`).
  - Smooth interactive accordion transition box (`Hide Menu` / `View Menu (6 items)`).
- **⚡ In-Card Quantity Stepper:**
  - Clicking **`+ Add`** instantly transforms into a smooth **`[ - ]  qty  [ + ]`** stepper directly on the dish row.
  - Active in-card cart highlight badge (`🛒 1 item in cart (₹20)`).
- **💳 Unified Campus Wallet:**
  - Instant balance checks and top-ups via Razorpay UPI & PhonePe.
  - Full transaction ledger and auto-deductions upon order placement.
- **🎟️ Live Token & Order Tracker:**
  - Real-time token tracking (`Placed` → `Preparing` → `Ready for Pickup` → `Collected`).
  - Web Audio alert chimes for kitchen staff upon new incoming orders.
- **🎪 Riviera Event Mode:**
  - One-click toggle switching between regular canteens and 20+ Riviera Fest food stalls.
- **👨‍🍳 Staff Operations & Admin Consoles:**
  - Kitchen order queue management, item availability toggles, live TV display mode, and CSV analytics export.
- **📱 Installable PWA (Progressive Web App):**
  - Offline-first caching with Service Worker (`sw.js`).
  - Standalone app experience without browser address bar.
  - One-click "Install App" button on Android, Windows, Mac, and iOS Safari.

---

## 🏗️ Repository Architecture

```text
v-buy/
├── backend/                  # FastAPI Python backend service
│   ├── main.py               # REST API, Supabase client, PhonePe, QR logic
│   ├── requirements.txt      # Python dependencies
│   ├── render.yaml           # Backend-specific Render config
│   └── .env.example          # Environment variables template
├── frontend/                 # React 19 + Vite frontend
│   ├── public/
│   │   ├── manifest.json     # PWA Web App Manifest with shortcuts & maskable icons
│   │   ├── sw.js             # Service Worker for offline asset caching
│   │   └── vit-chennai-logo.png
│   ├── src/
│   │   ├── App.jsx           # Main customer, staff & admin dashboard
│   │   ├── styles.css        # VIT Chennai navy-and-white design system
│   │   └── main.jsx
│   ├── capacitor.config.json # Mobile app wrapper configuration
│   ├── index.html            # PWA tags & viewport optimization
│   └── package.json
├── supabase/
│   └── migrations/           # PostgreSQL schemas, RLS policies, seed data
├── .github/
│   └── workflows/ci.yml      # Automated GitHub CI pipeline
├── render.yaml               # Unified Render.com monorepo blueprint
├── .gitignore                # Production git ignore rules
└── README.md
```

---

## 🚀 One-Click Hosting on Render.com

Deploy both the **FastAPI backend** and the **React PWA frontend** on Render in minutes:

### Step 1: Push this repository to GitHub
```bash
git init
git add .
git commit -m "feat: initial commit of CampusBite"
git branch -M main
git remote add origin https://github.com/<your-username>/campusbite.git
git push -u origin main
```

### Step 2: Deploy using Render Blueprint
1. Sign in to [Render.com](https://render.com/).
2. In the Render Dashboard, click **New +** → **Blueprint**.
3. Select your GitHub repository (`campusbite`).
4. Render automatically reads the root [`render.yaml`](./render.yaml) and provisions:
   - **`campusbite-api`** (FastAPI Web Service)
   - **`campusbite-web`** (Vite Static Site with SPA routing)
5. Under Environment Variables for `campusbite-api`, enter your Supabase credentials:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
6. Click **Apply**. Both your backend API and frontend website will be live with free automatic SSL (`https://...onrender.com`).

---

## 📱 How to Run / Install as an App

CampusBite is engineered as a **Progressive Web App (PWA)**, allowing it to be installed and run like a native mobile app on any device without going through app store review:

### 1. Android (Chrome / Edge)
1. Open your live website URL in Chrome.
2. Tap the **"Install App"** button in the top navigation bar (or Chrome menu `⋮` → **Add to Home screen**).
3. The CampusBite app icon will appear in your app drawer and home screen. It launches full-screen with offline caching!

### 2. iOS (iPhone / iPad — Safari)
1. Open the website in **Safari**.
2. Tap the **Share** button (square with upward arrow 📤) at the bottom.
3. Scroll down and select **"Add to Home Screen"** (➕).
4. Tap **Add**. CampusBite runs in standalone fullscreen mode without the Safari browser chrome!

### 3. Desktop (Windows / macOS / Linux)
1. Open in Google Chrome or Microsoft Edge.
2. Click the **Install** icon on the right side of the address bar or click **"Install App"** in the topbar.
3. Runs in its own standalone desktop window with native taskbar integration.

### 4. Build a Native Android APK (Capacitor)
If you need a signed `.apk` or `.aab` file:
```bash
cd frontend
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap add android
npm run build
npx cap sync
npx cap open android
```
*(Open Android Studio and click **Build** → **Build Bundle(s) / APK(s)**).*

---

## 💻 Local Development Setup

### 1. Backend Setup
```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate
# Linux/macOS
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Backend API will be running at `http://localhost:8000` (Swagger docs at `/docs`).

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend will be running at `http://localhost:5173`.

---

## 🔒 Environment Variables Reference

### Backend (`backend/.env`)
```ini
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
QR_SECRET=your-random-jwt-secret-key
FRONTEND_URL=http://localhost:5173
PHONEPE_MERCHANT_ID=PGTESTPAYUAT
PHONEPE_SALT_KEY=099eb0cd-02cf-4e2a-8aca-3e6c6aff0399
PHONEPE_SALT_INDEX=1
PHONEPE_ENV=SANDBOX
```

### Frontend (`frontend/.env.local`)
```ini
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

---

## 📄 License
Created for VIT Chennai. Open-source under the MIT License.
