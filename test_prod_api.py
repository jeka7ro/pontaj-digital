import requests

API_BASE = "https://pontaj-digital.onrender.com/api"

login_data = {
    "email": "cazmaleugeniu@gmail.com",
    "password": "123"
}
resp = requests.post(f"{API_BASE}/admin/login", json=login_data)
if resp.status_code != 200:
    print(f"Login failed: {resp.text}")
    exit(1)

token = resp.json()["access_token"]
print("Logged in successfully.")

# Get Muncitor role ID
roles_resp = requests.get(f"{API_BASE}/admin/roles/", headers={"Authorization": f"Bearer {token}"})
roles = roles_resp.json()
muncitor_role = next((r for r in roles if r["name"] == "Muncitor"), None)

# Create user
payload = {
    "employee_code": "PAV03MIS",
    "last_name": "Paraschiv",
    "first_name": "Andrei",
    "role_id": muncitor_role["id"],
    "pin": "1234",
    "cnp": "5030921134215",
    "birth_date": "2003-09-21",
    "id_card_series": "KZ 755483",
    "birth_place": None,
    "phone": None,
    "email": None,
    "address": None,
    "avatar_path": None,
    "is_active": True
}

create_resp = requests.post(
    f"{API_BASE}/admin/users/", 
    json=payload,
    headers={"Authorization": f"Bearer {token}"}
)

print(f"Status Code: {create_resp.status_code}")
print(f"Response: {create_resp.text}")
