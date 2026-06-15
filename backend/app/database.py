from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

if settings.DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False}
    )
else:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
        pool_recycle=60,       # recycle connections every 60s — Supabase drops idle SSL
        pool_timeout=30,
        connect_args={
            "keepalives": 1,
            "keepalives_idle": 30,    # trimite keepalive după 30s idle
            "keepalives_interval": 10, # retry la fiecare 10s
            "keepalives_count": 5,     # max 5 retry-uri
            "connect_timeout": 10,
        },
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency for database sessions"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def warmup_pool():
    """Pre-warm the connection pool to avoid cold-start latency."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("🔌 DB connection pool warmed up")
    except Exception as e:
        print(f"⚠️  DB warmup failed: {e}")
