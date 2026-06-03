import os
import requests
import json
from dotenv import load_dotenv
load_dotenv('backend/.env')

pdf_path = "test_download.pdf"
url = "https://pontaj-digital.onrender.com/api/admin/users/ocr/extract"
token = os.getenv("TEST_ADMIN_TOKEN") # I don't have the token.
