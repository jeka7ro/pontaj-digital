import requests
import json
import os
from datetime import date

BASE_URL = "http://localhost:6001/api"
# Read token from file if exists (created during login tests)
TOKEN_FILE = "token.txt"

def get_token():
    if os.path.exists(TOKEN_FILE):
        with open(TOKEN_FILE, "r") as f:
            return f.read().strip()
    print("No token found. Please login first.")
    return None

def test_deliveries():
    token = get_token()
    if not token:
        # try to login as admin
        resp = requests.post(f"{BASE_URL}/admin/login", json={
            "email": "admin@jeka.ro",
            "password": "admin"
        })
        if resp.status_code == 200:
            token = resp.json().get("access_token")
            with open(TOKEN_FILE, "w") as f:
                f.write(token)
        else:
            print("Failed to login as admin")
            return

    headers = {"Authorization": f"Bearer {token}"}
    
    # 1. Get sites to pick one
    sites_resp = requests.get(f"{BASE_URL}/sites", headers=headers)
    if sites_resp.status_code != 200:
        print("Failed to get sites:", sites_resp.text)
        return
        
    sites = sites_resp.json()
    if not sites:
        print("No sites available")
        return
        
    site_id = sites[0]["id"]
    print(f"Picked site {sites[0]['name']}")
    
    # 2. Create delivery
    data = {
        "site_id": site_id,
        "delivery_date": date.today().isoformat(),
        "materials_delivered": "Test delivery - 3 paleți BCA",
        "photo_url": "http://example.com/photo.jpg"
    }
    
    print("Creating delivery...")
    create_resp = requests.post(f"{BASE_URL}/admin/logistics/deliveries", json=data, headers=headers)
    if create_resp.status_code == 200:
        delivery = create_resp.json()
        print("Successfully created delivery:", delivery["id"])
    else:
        print("Failed to create delivery:", create_resp.text)
        return
        
    # 3. List deliveries
    print("Listing deliveries...")
    list_resp = requests.get(f"{BASE_URL}/admin/logistics/deliveries", headers=headers)
    print("Deliveries count:", len(list_resp.json()))
    
if __name__ == "__main__":
    test_deliveries()
