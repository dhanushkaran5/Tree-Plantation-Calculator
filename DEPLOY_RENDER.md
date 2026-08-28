# Deployment Guide: Render & PostgreSQL

This guide provides instructions for deploying the **Tree Plantation Calculator** platform directly from GitHub to [Render](https://render.com/) with a production-ready PostgreSQL database (Render PostgreSQL or Supabase PostgreSQL).

---

## 📋 Overview & Prerequisites

- **GitHub Repository**: Pushed code containing `render.yaml`, `Procfile`, `runtime.txt`, and `requirements.txt`.
- **Render Account**: Free or paid account at [render.com](https://render.com/).
- **PostgreSQL Instance**: Either a **Render PostgreSQL database** or a **Supabase PostgreSQL instance**.

---

## 🛠️ Required Environment Variables

Configure these environment variables in your Render Dashboard under **Environment**:

| Variable Name | Description | Example / Value |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection URL | `postgresql://user:pass@ep-xyz.region.aws.neon.tech/dbname` |
| `SECRET_KEY` | Production encryption key | `a-long-random-secret-key-32-chars` |
| `API_URL` | Production API Endpoint | `https://tree-plantation-calculator.onrender.com/api` |
| `FRONTEND_URL` | Allowed CORS Frontend URL | `https://tree-plantation-calculator.onrender.com` |
| `BACKEND_URL` | Production Backend URL | `https://tree-plantation-calculator.onrender.com` |
| `FLASK_ENV` | Production Environment Flag | `production` |
| `DEBUG` | Development Debug Mode | `false` |

---

## 🚀 Option 1: Automatic Blueprint Deployment (Recommended)

1. Push your repository to **GitHub**.
2. Log into **Render Dashboard** and click **New +** → **Blueprint**.
3. Connect your GitHub repository.
4. Render will read `render.yaml` automatically.
5. Provide the `DATABASE_URL` and `FRONTEND_URL` when prompted.
6. Click **Apply**. Render will automatically build and deploy your app!

---

## 🛠️ Option 2: Manual Web Service Deployment

If deploying manually without Blueprint:

1. **New Web Service**: Click **New +** → **Web Service** in Render.
2. **Connect Repository**: Select your GitHub repository.
3. **Environment**: Select `Python 3`.
4. **Region**: Choose a region close to your database (e.g., Frankfurt, Oregon, Singapore).
5. **Branch**: `main` or `master`.
6. **Build Command**:
   ```bash
   pip install -r requirements.txt
   ```
7. **Start Command**:
   ```bash
   gunicorn --chdir legacy/backend app:app
   ```
   *(Or for Node.js backend: `node server/app.js`)*
8. **Environment Variables**: Add `DATABASE_URL`, `SECRET_KEY`, `FRONTEND_URL`, `API_URL`, and `BACKEND_URL`.
9. Click **Create Web Service**.

---

## 🗄️ Database Setup & PostgreSQL Migration

1. Create a PostgreSQL Database on **Render** (or copy connection string from **Supabase**).
2. Get the **Internal Connection String** (or External Connection String).
3. If the connection string starts with `postgres://`, the app automatically transforms it to `postgresql://` via `config/database.py`.
4. **Auto-Table Creation**: On first application startup, SQLAlchemy models (`KVStore`, `Tree`, `City`, `Recommendation`, `History`) will automatically create the required database tables if they do not exist.

---

## ❓ Common Deployment Issues & Troubleshooting

### 1. `DATABASE_URL environment variable is not set`
- **Cause**: Missing environment variable in Render dashboard.
- **Fix**: Open Web Service → **Environment** tab → Add `DATABASE_URL` with your full PostgreSQL URL.

### 2. `psycopg2.OperationalError: SSL connection failure` / Disconnects
- **Cause**: Idle pool disconnects from Supabase or Render DB.
- **Fix**: Connection pooling with `pool_pre_ping=True` is enabled in `config/database.py`. This automatically tests connections before sending queries.

### 3. Port Binding Issues (`Error: PORT bound failed`)
- **Cause**: Hardcoded port in application startup.
- **Fix**: The code reads `os.environ.get("PORT", 5000)` dynamically. Render automatically assigns `$PORT`.

### 4. CORS Errors on API Calls
- **Cause**: Frontend domain blocked by browser CORS policy.
- **Fix**: Set `FRONTEND_URL` in environment variables to match your domain (or `*` for public access).

### 5. `ModuleNotFoundError: No module named 'gunicorn'`
- **Cause**: Dependencies not installed.
- **Fix**: Ensure your Build Command is set to `pip install -r requirements.txt`.

---

## 🔒 Security Best Practices

- Never commit plain text passwords or real database credentials to Git.
- Always use `.env.example` as a template and set real secrets directly in Render environment settings.
- Ensure `DEBUG=false` in production.
