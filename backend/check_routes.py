import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))
from main import app

for route in app.routes:
    if hasattr(route, "methods"):
        if "/admin/leaves" in route.path:
            print(f"{route.methods} {route.path}")
