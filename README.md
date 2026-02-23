# Pontaj Digital - Construction Timesheet System

Enterprise-grade multi-site construction timesheet management system.

## Features

- 📱 Mobile-first PWA with macOS Tahoe-inspired design
- 👥 Multi-role support (Worker, Team Lead, Site Manager, Admin)
- 🏗️ Multi-site timesheet tracking
- ⏱️ Work time calculation with break management
- 📊 Admin dashboard with analytics
- 📤 Excel export functionality
- 🔒 Secure authentication with JWT
- 🌐 Multi-tenant ready

## Tech Stack

- **Backend**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL 14+
- **Frontend**: React 18 + Vite
- **UI**: Tailwind CSS + shadcn/ui
- **Auth**: JWT tokens

## Quick Start

### Backend (Port 6001)
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 6001 --reload
```

### Frontend (Port 3000)
```bash
cd frontend
npm install
npm run dev
```

## Design Philosophy

Inspired by macOS Tahoe aesthetic:
- Rounded corners and smooth shadows
- Card-based layouts
- Clean, minimal interface
- Responsive design for mobile and desktop
- Professional color palette

## Documentation

See `/docs` folder for complete specifications.
