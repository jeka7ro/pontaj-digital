import os
from dotenv import load_dotenv
load_dotenv("backend/.env")
from backend.app.api.admin_users import UserUpdate
try:
    u = UserUpdate(first_name='Eugen', last_name='Caz', cnp='')
    print("Success")
except Exception as e:
    print(f"Error: {e}")
