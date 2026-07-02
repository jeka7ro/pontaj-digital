import time as python_time
from datetime import time
try:
    time.fromisoformat("")
except Exception as e:
    print("Error:", type(e).__name__, str(e))
