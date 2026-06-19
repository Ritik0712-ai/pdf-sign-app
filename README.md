# 📄 PDF Sign - Document Signature App

> A secure, full-stack web application for digital document signing — upload PDFs, place signatures, share signing links, and generate legally traceable signed PDFs.

[![Status](https://img.shields.io/badge/Status-Live-success)](https://pdf-sign-app-opal.vercel.app)
[![Frontend](https://img.shields.io/badge/Frontend-Vercel-black)](https://pdf-sign-app-opal.vercel.app)
[![Backend](https://img.shields.io/badge/Backend-Render-46e3b7)](https://pdf-sign-app-rbj7.onrender.com)

---

## 🌐 Live Demo

| Service | URL |
|---------|-----|
| **Frontend (Live App)** | https://pdf-sign-app-opal.vercel.app |
| **Backend API** | https://pdf-sign-app-rbj7.onrender.com/api |
| **GitHub Repo** | https://github.com/Ritik0712-ai/pdf-sign-app |

---

## ✨ Features

### 🔐 Authentication
- ✅ Email/Password Registration & Login
- ✅ Google OAuth Integration
- ✅ JWT-based session management
- ✅ Protected routes & role-based access

### 📄 Document Management
- ✅ PDF Upload to Supabase Storage
- ✅ Document Dashboard with status filtering
- ✅ Document Detail view with audit trail
- ✅ Delete & manage documents

### ✍️ Signature Workflow
- ✅ Drag & drop signature placement on PDF pages
- ✅ Multiple signers per document
- ✅ Unique signing tokens for each signer
- ✅ Public signing links (no account required)
- ✅ Email notifications via Resend
- ✅ Reject with reason functionality

### 📊 Tracking & Compliance
- ✅ Audit logs (insert-only) for every action
- ✅ Document status tracking: Draft → Pending → Signed / Rejected
- ✅ Real-time updates

### 🎨 UI/UX
- ✅ Modern responsive design (Tailwind CSS)
- ✅ Loading states & error handling
- ✅ Toast notifications
- ✅ User profile with avatar

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | React 18 + TypeScript + Vite + Tailwind CSS |
| **State Management** | TanStack Query + React Context |
| **PDF Viewer** | react-pdf + pdfjs-dist |
| **Drag & Drop** | @dnd-kit |
| **Backend** | Node.js + Express + TypeScript |
| **Runtime** | tsx (TypeScript executor) |
| **Database** | Supabase (PostgreSQL) |
| **Storage** | Supabase Storage |
| **Auth** | Supabase Auth + JWT |
| **Email** | Resend |
| **PDF Generation** | pdf-lib |
| **Deployment** | Render (backend) + Vercel (frontend) |

---

## 📁 Project Structure

```
Project/
├── frontend/                    # React + Vite application
│   ├── src/
│   │   ├── api/                 # API clients (axios, supabase)
│   │   ├── context/             # Auth context
│   │   ├── layouts/             # Layout components
│   │   ├── pages/               # Page components
│   │   │   ├── Landing.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── Register.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Documents.tsx
│   │   │   ├── UploadDocument.tsx
│   │   │   ├── DocumentDetail.tsx
│   │   │   ├── SignatureEditor.tsx
│   │   │   ├── SigningPage.tsx
│   │   │   ├── SigningSuccess.tsx
│   │   │   ├── SigningRejected.tsx
│   │   │   ├── AuditLogs.tsx
│   │   │   └── Profile.tsx
│   │   └── types/               # TypeScript types
│   ├── vercel.json              # Vercel SPA routing config
│   └── ...
│
├── backend/                     # Express API
│   ├── src/
│   │   ├── config/              # Environment + Supabase config
│   │   ├── middleware/          # Auth, audit, error handling
│   │   ├── routes/              # API routes
│   │   │   ├── auth.ts          # /api/auth/*
│   │   │   ├── documents.ts     # /api/documents/*
│   │   │   ├── signatures.ts    # /api/signatures/*
│   │   │   ├── audit.ts         # /api/audit/*
│   │   │   └── profile.ts       # /api/profile/*
│   │   ├── services/            # Email, PDF generation
│   │   └── types/               # TypeScript types
│   └── ...
│
├── SUPABASE_SCHEMA.sql          # Database schema
├── STORAGE_POLICIES.sql         # Storage RLS policies
├── DEPLOY.md                    # Deployment guide
└── README.md                    # This file
```

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account
- Resend account (for emails)

### Installation

```bash
# Clone the repository
git clone https://github.com/Ritik0712-ai/pdf-sign-app.git
cd pdf-sign-app

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run `SUPABASE_SCHEMA.sql` in SQL Editor
3. Run `STORAGE_POLICIES.sql` to configure storage
4. Create storage buckets: `documents`, `signatures`
5. Enable Email + Google auth providers

### Environment Variables

**Backend** (`backend/.env`):
```env
PORT=3001
NODE_ENV=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
JWT_SECRET=your-random-secret
CLIENT_URL=http://localhost:5173
RESEND_API_KEY=your-resend-key
```

**Frontend** (`frontend/.env`):
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Run Development Servers

```bash
# Terminal 1 - Backend (port 3001)
cd backend
npm run dev

# Terminal 2 - Frontend (port 5173)
cd frontend
npm run dev
```

Open http://localhost:5173 in your browser.

---

## 🌐 Production Deployment

### Backend on Render
- **Service Type**: Web Service
- **Root Directory**: `backend`
- **Build Command**: `npm install`
- **Start Command**: `npx tsx src/server.ts`
- **Environment Variables**: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `CLIENT_URL`

### Frontend on Vercel
- **Root Directory**: `frontend`
- **Framework Preset**: Vite
- **Build Command**: `npm run build` (auto-detected)
- **Environment Variables**: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- **Special Config**: `vercel.json` for SPA routing

### Supabase Auth Configuration
- **Site URL**: `https://pdf-sign-app-opal.vercel.app`
- **Redirect URLs**: 
  - `https://pdf-sign-app-opal.vercel.app/*`
  - `https://pdf-sign-app-opal.vercel.app/auth/callback`

### Google OAuth Setup
1. Create OAuth credentials in [Google Cloud Console](https://console.cloud.google.com)
2. Add redirect URI: `https://your-project.supabase.co/auth/v1/callback`
3. Configure in Supabase → Authentication → Providers → Google

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login with email/password |
| `GET` | `/api/auth/me` | Get current user |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/documents` | List user's documents |
| `GET` | `/api/documents/:id` | Get single document |
| `POST` | `/api/documents` | Create document record |
| `PATCH` | `/api/documents/:id` | Update document status |
| `DELETE` | `/api/documents/:id` | Delete document |

### Signatures
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/signatures` | Create signature placement |
| `GET` | `/api/signatures/document/:id` | Get signatures for document |
| `PATCH` | `/api/signatures/:id` | Update signature status |
| `POST` | `/api/signatures/link` | Generate signing link |
| `GET` | `/api/signatures/link/:token` | Validate signing token |

### Audit
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/audit/:documentId` | Get audit logs |

### Profile
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/profile` | Get user profile |
| `PATCH` | `/api/profile` | Update profile |

---

## 🐛 Problems Faced & Solutions

### 1. Render Build Failure
**Problem**: `Cannot find module 'dist/server.js'`  
**Solution**: Changed start command to `npx tsx src/server.ts` to run TypeScript directly without compilation

### 2. Missing Supabase Credentials
**Problem**: Backend couldn't connect to Supabase  
**Solution**: Added `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Render environment variables

### 3. Frontend Black Screen
**Problem**: Vercel deployment showing black screen  
**Solution**: Added `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to Vercel environment variables

### 4. Localhost API in Production
**Problem**: Frontend still pointing to `localhost:3001`  
**Solution**: Updated `axios.ts` with production backend URL

### 5. Vercel 404 on Routes
**Problem**: `/auth/callback` returning 404  
**Solution**: Added `vercel.json` with rewrite rules for SPA routing

### 6. Google OAuth Not Working
**Problem**: After Google login, redirects back to login  
**Solution**: 
- Added `onAuthStateChange` listener in AuthCallback
- Properly handle OAuth tokens from URL hash fragment
- Configured Google OAuth redirect URIs in Google Cloud Console + Supabase

### 7. Audit Logs Foreign Key Issues
**Problem**: Audit log queries failing  
**Solution**: Fixed foreign key relationships and API paths

---

## 🔒 Security Features

- ✅ Row Level Security (RLS) on all Supabase tables
- ✅ JWT authentication for API endpoints
- ✅ Tokenized signing links (single-use, time-limited)
- ✅ Audit logs are insert-only (immutable)
- ✅ Service role key only used server-side
- ✅ CORS, Helmet, and rate limiting configured

---

## 📊 Database Schema

### Tables
- `users` - User profiles (linked to Supabase Auth)
- `documents` - Document metadata
- `signatures` - Signature placements & statuses
- `signing_links` - Tokenized public signing links
- `audit_logs` - Immutable audit trail

### Storage Buckets
- `documents` - Original uploaded PDFs
- `signatures` - Signature images
- `signed` - Generated signed PDFs

---

## 📜 License

MIT

---

## 👨‍💻 Author

**Ritik Agarwal**  
GitHub: [@Ritik0712-ai](https://github.com/Ritik0712-ai)

---

## 🙏 Acknowledgments

- [Supabase](https://supabase.com) - Backend infrastructure
- [Resend](https://resend.com) - Email service
- [Vercel](https://vercel.com) - Frontend hosting
- [Render](https://render.com) - Backend hosting
- [pdf-lib](https://pdf-lib.js.org) - PDF generation
- [react-pdf](https://react-pdf.org) - PDF viewing
