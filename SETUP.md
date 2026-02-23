# Pontaj Digital - Setup Guide

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 14+
- Redis (optional, for rate limiting)

## Quick Setup

### 1. Database Setup

```bash
# Create PostgreSQL database
createdb pontaj_digital

# Or using psql
psql -U postgres
CREATE DATABASE pontaj_digital;
\q
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and set DATABASE_URL

# Initialize database
python init_db.py

# Start backend (port 6001)
uvicorn main:app --host 0.0.0.0 --port 6001 --reload
```

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start frontend (port 3000)
npm run dev
```

### 4. Or Use Startup Script

```bash
chmod +x start.sh
./start.sh
```

## Demo Credentials

- **Worker**: EMP001 / PIN: 1234
- **Admin**: ADMIN / PIN: 0000

## Access

- Frontend: http://localhost:3000
- Backend API: http://localhost:6001
- API Docs: http://localhost:6001/docs

## Design Features

✨ **macOS Tahoe-Inspired Design**
- Rounded corners (12px, 16px, 20px)
- Smooth shadows and transitions
- Card-based layouts
- Clean, minimal interface
- Responsive for mobile and desktop

## Tech Stack

- **Backend**: FastAPI + PostgreSQL + SQLAlchemy
- **Frontend**: React 18 + Vite + Tailwind CSS
- **Auth**: JWT tokens + bcrypt PIN hashing
- **State**: Zustand
- **Icons**: Lucide React

## Next Steps

1. Complete timesheet CRUD endpoints
2. Add segments and activity lines
3. Implement team workflows
4. Build admin dashboard
5. Add Excel export
6. Deploy to production
