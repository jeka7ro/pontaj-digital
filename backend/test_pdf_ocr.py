import urllib.request
import os
from dotenv import load_dotenv
load_dotenv('.env')

from app.api.admin_users import extract_id_card_data

pdf_url = "https://yiusjksmpwbajssgopef.supabase.co/storage/v1/object/public/uploads/id_cards/c35fbad5-6f30-4fdc-bc67-65cf2feba6af_id_card.pdf"
temp_pdf = "test_download.pdf"
urllib.request.urlretrieve(pdf_url, temp_pdf)

print("Starting extraction...")
result = extract_id_card_data(temp_pdf)
print(f"Avatar path: {result.get('avatar_path')}")
