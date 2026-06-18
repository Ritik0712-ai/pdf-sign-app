# Deployment Guide - PDF Sign App

## Prerequisites
- Vercel account (for frontend)
- Render account (for backend) or Railway/Railway
- Supabase project (already configured)

---

## Part 1: Deploy Backend to Render

### 1. Create Render Account
1. Go to https://render.com
2. Sign up with GitHub

### 2. Create Web Service
1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repo (or create new private repo)
3. Configure:
   - **Name:** `pdf-sign-backend`
   - **Region:** Singapore (closest to you)
   - **Branch:** `main`
   - **Root Directory:** `backend`
   - **Runtime:** `Node"
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`

### 3. Environment Variables
Add these in Render dashboard:

```
NODE_ENV=production
PORT=3001
SUPABASE_URL=https://vxegcleagjzqrdebbhbd.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET=pdf-sign-secret-key-2024
CLIENT_URL=https://your-frontend.vercel.app
RESEND_API_KEY=re_hWx9tsEE_AwoceiuW5hgHRFNRo4GoWDN2
```

### 4. Deploy
- Click **"Create Web Service"**
- Wait for deployment (2-3 minutes)
- Note your backend URL: `https://pdf-sign-backend.onrender.com`

---

## Part 2: Deploy Frontend to Vercel

### 1. Create Vercel Account
1. Go to https://vercel.com
2. Sign up with GitHub

### 2. Import Project
1. Click **"Add New..."** → **"Project"**
2. Import your GitHub repo
3. Configure:
   - **Framework Preset:** `Vite`
   - **Root Directory:** `./`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`

### 3. Environment Variables
Add in Vercel:

```
VITE_API_URL=https://pdf-sign-backend.onrender.com
```

**Important:** After getting backend URL, update Render's `CLIENT_URL` to match.

### 4. Deploy
- Click **"Deploy"**
- Wait for deployment (1-2 minutes)
- Get your URL: `https://your-app.vercel.app`

---

## Part 3: Update Supabase Auth Redirect URLs

In Supabase Dashboard → Authentication → URL Configuration:

```
Site URL: https://your-app.vercel.app
Redirect URLs:
- https://your-app.vercel.app/*
- http://localhost:5173
```

---

## Part 4: Update Backend Environment

In Render, update `CLIENT_URL` to your Vercel URL:
```
CLIENT_URL=https://your-app.vercel.app
```

Then redeploy the backend.

---

## Testing

1. Go to `https://your-app.vercel.app`
2. Sign up/Login
3. Upload a PDF
4. Place signatures
5. Generate signing link
6. Sign the document

---

## Troubleshooting

### CORS Errors
Make sure backend has correct `CLIENT_URL` in environment variables.

### Database Connection
Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are correct.

### API Not Working
Check Render logs for errors.
