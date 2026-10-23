# Deployment & Production Guide

This document outlines deployment strategies for the **Multi-Tenant Event & Ticket Reservation System** across cloud platforms (Vercel, Render, Railway, Docker).

The project is structured into clean **`frontend/`** and **`backend/`** folders for independent or unified deployments.

---

## Option 1: Deploy Frontend on Vercel (Recommended for Frontend)

Vercel is optimized for blazing-fast static and SPA deployments with automatic global CDN edge caching.

### Step-by-Step Vercel Deployment:
1. Push your repository to **GitHub** (or GitLab/Bitbucket).
2. Go to your [Vercel Dashboard](https://vercel.com/dashboard) and click **"Add New Project"**.
3. Import your repository.
4. In the **Configure Project** screen:
   - **Framework Preset**: `Vite`
   - **Root Directory**: Click `Edit` and select **`frontend`** (or leave root since `vercel.json` is included at the root and inside `frontend/`).
   - **Build Command**: `npm run build` (or `npm --prefix frontend run build` if building from root).
   - **Output Directory**: `dist`
5. **Environment Variables**:
   - Add `VITE_API_URL` pointing to your deployed backend API URL (e.g. `https://your-backend.onrender.com` or `https://your-backend.up.railway.app`).
   - *(Note: If testing locally or against a local backend, leave `VITE_API_URL` blank to use Vite's built-in `/api` proxy).*
6. Click **Deploy**. Vercel will build the frontend and provide your production `https://*.vercel.app` URL.

SPA client-side routing is already configured in `frontend/vercel.json` with automatic fallback to `index.html`.

---

## Option 2: Deploy Backend on Render (Free / Starter Cloud)

Render allows hosting the Node.js Express backend service with managed or auto-fallback databases.

### 1. Web Service Setup on Render
1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New > Web Service**.
2. Connect your GitHub repository.
3. Configure settings:
   - **Root Directory**: `backend` (or leave empty if using root scripts)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm run seed && npm start`
4. Add Environment Variables:
   - `PORT`: `5000`
   - `NODE_ENV`: `production`
   - `JWT_SECRET`: `your_random_secure_jwt_secret_key`
   - *(Optional)* `DATABASE_URL`: Your PostgreSQL URL if using external PostgreSQL.
   - *(Optional)* `REDIS_URL`: Your Redis URL if using external Redis.
   - *(Note: If `DATABASE_URL` is omitted, the backend automatically boots with SQLite WAL mode in `backend/data/app.db` with zero configuration!)*
5. Click **Create Web Service**. Copy your backend URL (e.g. `https://your-backend.onrender.com`) and set it as `VITE_API_URL` in your Vercel frontend project settings!

---

## Option 3: Deploy Full-Stack on Railway (1-Click Container Deploy)

Railway provides instantaneous container deployment using the included root `Dockerfile`.

1. Go to [Railway.app](https://railway.app) and create a **New Project**.
2. Select **Deploy from GitHub repo**.
3. Add **PostgreSQL** and **Redis** plugins from Railway's template library (optional).
4. Railway will automatically build the multi-stage `Dockerfile` (which builds `frontend/` and starts `backend/`) and expose your production URL.

---

## Option 4: Local / VPS Docker Compose

To run the full stack (PostgreSQL 17, Redis 7, and Node Web App) with zero configuration:

```bash
# Clone and enter the repository
git clone <repo-url>
cd "Event Ticket Reservation System"

# Start the full stack
docker compose up -d --build

# Inspect running services
docker compose ps
```

The web application will be live at `http://localhost:5000`.

---

## Option 5: Zero-Config Local Run (Development & Grading)

```bash
# 1. Install dependencies for both backend and frontend
npm install
npm --prefix backend install
npm --prefix frontend install

# 2. Seed database
npm run seed

# 3. Start development server (boots backend on :5000 and frontend on :5173)
npm run dev
```

Open **`http://localhost:5173`** in your browser.
