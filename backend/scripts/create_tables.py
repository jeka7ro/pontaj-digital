import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.database import engine
from app.models import Base

# This will create any missing tables
Base.metadata.create_all(bind=engine)
print("Tables created successfully")
