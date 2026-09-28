# V Foods Landing Page (Standalone Deployment)

This directory contains the independent, standalone production landing page for **V Foods** (Campus Smart Dining & Food Ordering). It is completely decoupled from the backend Supabase database, authentication tokens, and private vendor API keys, making it ultra-fast, zero-cost to host, and safe to deploy publicly.

---

## 🚀 Option 1: Deploy to Vercel (Recommended)

### Method A: Via Vercel Web Dashboard (1 Minute)
1. Push your code to GitHub.
2. Go to [vercel.com](https://vercel.com) and click **"Add New Project"**.
3. Select your repository.
4. In the **Root Directory** setting, click **Edit** and choose `landing`.
5. Framework Preset: **Vite** (auto-detected).
6. Build Command: `npm run build` (default).
7. Output Directory: `dist` (default).
8. *(Optional)* Add Environment Variable:
   - `VITE_APP_URL`: The URL of your main app (e.g., `https://v-buy.vercel.app` or `https://vfoods.onrender.com`).
9. Click **Deploy**.

### Method B: Via Vercel CLI
```bash
cd landing
npx vercel
# Follow the prompts and select production deploy:
npx vercel --prod
```

---

## ⚡ Option 2: Deploy to Render (Static Site)

### Method A: Via Render Blueprint (Instant)
1. Push the repo to GitHub.
2. In Render dashboard, click **New +** → **Blueprint**.
3. Connect your repo; Render will automatically detect `landing/render.yaml` and provision a free static site.

### Method B: Manual Static Site on Render
1. Go to [dashboard.render.com](https://dashboard.render.com).
2. Click **New +** → **Static Site**.
3. Select your GitHub repository.
4. Set the following fields:
   - **Name**: `v-foods-landing`
   - **Root Directory**: `landing`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
5. Click **Create Static Site**.

---

## 💻 Local Development

The `landing/node_modules` is a Windows Junction pointing to `e:\v-buy\frontend\node_modules`, so all dependencies are already installed — **no `npm install` needed locally**.

```bash
cd landing
npm run dev   # Starts on http://localhost:5174 (different port from main app)
```

Open [http://localhost:5174](http://localhost:5174) in your browser.

> **Note:** On Vercel/Render, the CI environment performs a clean `npm install` automatically, so the junction is irrelevant for production deploys.

---

## 📦 Production Build Verification
```bash
cd landing
npm run build
npm run preview
```
Output is in `landing/dist/` — 228 KB gzipped (Three.js 3D campus included).
