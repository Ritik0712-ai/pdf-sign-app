# PDF Sign - Document Signature App

A secure, full-stack web application for digital document signing — upload PDFs, place signatures, share signing links, and generate legally traceable signed PDFs.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + TypeScript + Tailwind CSS + TanStack Query |
| Backend | Node.js + Express + TypeScript |
| Database | Supabase PostgreSQL |
| Storage | Supabase Storage |
| Auth | Supabase Auth + JWT |
| PDF | react-pdf + pdf-lib |

## Project Structure

```
Project/
├── frontend/          # React application
│   ├── src/
│   │   ├── api/          # Axios + Supabase setup
│   │   ├── context/      # Auth context
│   │   ├── layouts/      # Layout components
│   │   ├── pages/        # Page components
│   │   └── types/        # TypeScript types
│   └── ...
│
├── backend/          # Express API
│   ├── src/
│   │   ├── config/       # Environment + Supabase config
│   │   ├── middleware/   # Auth, audit, error
│   │   ├── routes/       # API routes
│   │   └── types/        # TypeScript types
│   └── ...
│
├── README.md
└── .gitignore
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Setup

1. **Clone and install**

```bash
cd Project

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

2. **Setup Supabase**

- Create a project at [supabase.com](https://supabase.com)
- Run the SQL schema from `SUPABASE_SCHEMA.sql`
- Create storage buckets: `documents`, `signatures`
- Enable Row Level Security (RLS) on all tables

3. **Configure environment**

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env with your Supabase credentials:
# - SUPABASE_URL
# - SUPABASE_SERVICE_ROLE_KEY
# - JWT_SECRET

# Frontend
cd ../frontend
cp .env.example .env
# Edit .env with your Supabase credentials:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
```

### Supabase API Keys Reference

| Key | Where to Use |
|-----|--------------|
| **Project URL** | Both `.env` files as `SUPABASE_URL` / `VITE_SUPABASE_URL` |
| **anon public key** | Frontend `.env` as `VITE_SUPABASE_ANON_KEY` |
| **service_role key** | Backend `.env` as `SUPABASE_SERVICE_ROLE_KEY` |

4. **Start development servers**

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

5. **Open the app in browser**

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001/api/health |

## Features

- [x] User Authentication (Supabase Auth + JWT)
- [x] Email Registration & Login
- [x] Google OAuth Integration
- [x] Protected Routes
- [x] PDF Upload (coming Day 4)
- [x] Document Dashboard
- [x] PDF Preview (coming Day 6)
- [x] Signature Placement (drag & drop) (coming Day 8)
- [x] Signing Links
- [x] Audit Logs
- [x] Status Tracking

## 14-Day Build Plan

| Week | Days | Focus |
|------|------|-------|
| Week 1 | Day 1-7 | Foundation + Auth + Documents |
| Week 2 | Day 8-14 | Signatures + Workflow + Polish |

### Week 1: Foundation
- **Day 1** ✅ Project Setup & Architecture
- **Day 2** ✅ Authentication System (Supabase Auth)
- **Day 3** Database Schema & User Management
- **Day 4** Document Upload System
- **Day 5** Documents Dashboard
- **Day 6** PDF Viewer Integration (react-pdf)
- **Day 7** Testing & Buffer Day

### Week 2: Signatures & Polish
- **Day 8** Signature Placement Engine (dnd-kit)
- **Day 9** Signature Database Integration
- **Day 10** PDF Generation Engine (pdf-lib)
- **Day 11** Public Signing Workflow
- **Day 12** Audit Logs & Status System
- **Day 13** UI Polish & Deployment
- **Day 14** Final Testing & Project Delivery

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login user |
| GET | `/api/auth/me` | Get current user |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/documents` | List user's documents |
| GET | `/api/documents/:id` | Get single document |
| POST | `/api/documents/upload` | Upload new document |
| DELETE | `/api/documents/:id` | Delete document |

### Signatures
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/signatures` | Create signature placement |
| GET | `/api/signatures/document/:id` | Get signatures for document |
| PATCH | `/api/signatures/:id` | Update signature status |
| POST | `/api/signatures/link` | Generate signing link |
| GET | `/api/signatures/link/:token` | Validate signing token |

### Audit
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/audit/:documentId` | Get audit logs |

## Critical Rules

⚠️ **Coordinates**: Always store signature positions as percentages (0-100), never pixels.

⚠️ **Signed PDFs**: Never overwrite the original — always generate a new signed version.

⚠️ **Audit Logs**: Insert-only — never update or delete audit records.

## License

MIT
