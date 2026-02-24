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
        pool_size=10,
        max_overflow=20,
        pool_recycle=300,  # recycle connections every 5 min
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
