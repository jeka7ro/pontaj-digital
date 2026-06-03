import os
from dotenv import load_dotenv
load_dotenv("backend/.env")

from backend.app.api.admin_users import extract_id_card_data
try:
    print(extract_id_card_data("test.pdf", None))
except Exception as e:
    print("Error:", e)
