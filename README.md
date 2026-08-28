# Tree Plantation Calculator

**India's Premier Environmental Sustainability & Carbon Analytics Platform**

This repository contains the complete codebase for the Tree Plantation Calculator platform. It is fully production-ready for deployment on **Render** and **Vercel**, powered by a **PostgreSQL** database (Render PostgreSQL or Supabase).

---

## 🚀 Deployment Options

### 1. 🚀 Render Deployment (Recommended for Full Python/Node Production Backend)
This project is configured with a Render Blueprint (`render.yaml`), `Procfile`, and `runtime.txt`.

- **Automatic Blueprint Deploy**: Connect your GitHub repository to Render, select **Blueprint**, and Render will automatically set up the web service and environment variables.
- **Detailed Instructions**: See [DEPLOY_RENDER.md](file:///c:/Users/Dhanushkaran%20M/Desktop/Tree%20Plantation%20Calculator/ecotree%20impact%20analyzer/DEPLOY_RENDER.md) for full step-by-step guidance on environment variables, build commands, and database connection.

---

### 2. ⚡ Vercel Deployment (Static & Serverless)
Pre-configured for Vercel deployment with serverless functions:
1. Connect your GitHub repository to Vercel.
2. Configure `DATABASE_URL` in the Vercel project environment variables.
3. Deploy! `vercel.json` routes static frontend and serverless API endpoints.

---

## 🗄️ Database Setup (PostgreSQL)

1. Create a PostgreSQL instance on **Render PostgreSQL** or **Supabase**.
2. Set your `DATABASE_URL` environment variable:
   ```env
   DATABASE_URL=postgresql://username:password@host:5432/database
   ```
3. Tables are created automatically on first launch using SQLAlchemy models.

---

## 💻 Local Development

1. Copy `.env.example` to `.env` and fill in your PostgreSQL `DATABASE_URL`.
2. **Python Backend:**
   ```bash
   python -m venv .venv
   source .venv/bin/activate  # Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   python legacy/backend/app.py
   ```
3. **Node.js Backend:**
   ```bash
   cd server
   npm install
   npm run dev
   ```
