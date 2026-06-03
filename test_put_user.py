import requests
import json

url = "http://127.0.0.1:8000/api/admin/users/c35fbad5-6f30-4fdc-bc67-65cf2feba6af"

# We need to authenticate. Since I can't easily get the token, let's just make a script that imports the FastAPI app and uses TestClient!
