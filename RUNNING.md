# Pontaj Digital - Aplicație Pornită! ✅

## 🚀 Servere Active

- **Backend API**: http://localhost:6001
- **Frontend**: http://localhost:5173
- **API Docs**: http://localhost:6001/docs

## 👤 Demo Credentials

| Rol | Cod Angajat | PIN |
|-----|-------------|-----|
| Muncitor | `EMP001` | `1234` |
| Admin | `ADMIN` | `0000` |

## 📱 Design Features

✨ **macOS Tahoe-Inspired**
- Rounded corners (12px, 16px, 20px)
- Card-based layouts
- Smooth shadows and transitions
- Clean, minimal interface
- Responsive mobile & desktop

## 🎨 Culori

- **Primary Blue**: #2563EB
- **Background**: #F9FAFB
- **Cards**: White cu shadow-tahoe

## 📂 Structură

```
pontaj_digital/
├── backend/          # FastAPI (port 6001)
│   ├── main.py       # Entry point
│   ├── app/
│   │   ├── models.py # SQLAlchemy models
│   │   ├── auth.py   # JWT + PIN auth
│   │   └── api/
│   │       └── auth.py # Login endpoint
│   └── pontaj_digital.db # SQLite database
│
└── frontend/         # React + Vite (port 5173)
    ├── src/
    │   ├── App.jsx
    │   ├── pages/
    │   │   ├── Login.jsx
    │   │   ├── Dashboard.jsx
    │   │   ├── TodayTimesheet.jsx
    │   │   └── History.jsx
    │   └── store/
    │       └── authStore.js
    └── tailwind.config.js
```

## ✅ Ce Funcționează

- [x] Login cu cod angajat + PIN
- [x] JWT authentication
- [x] Dashboard cu carduri Tahoe
- [x] Routing protejat
- [x] Mobile-responsive UI
- [x] SQLite database cu seed data

## 🔄 Next Steps

1. Implementare timesheet CRUD
2. Segment și activity management
3. Team workflows
4. Admin dashboard
5. Excel export

## 🛠️ Comenzi Utile

```bash
# Pornește aplicația
./start.sh

# Sau manual:
# Backend
cd backend && source venv/bin/activate
python -m uvicorn main:app --port 6001 --reload

# Frontend
cd frontend && npm run dev
```

---

**Nota**: Portul 5173 este portul standard Vite (nu mai folosim 3000 care era ocupat de tv_screen).
