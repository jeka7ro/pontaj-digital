import requests
from datetime import date, timedelta

# Create a site if it doesn't exist
try:
    sites_res = requests.get('http://localhost:8000/api/admin/sites/?page_size=1000')
    sites = sites_res.json()
    if not sites:
        # Assuming there's an endpoint to create a site, but we can just use ID 1 if we force it, or maybe there are already sites?
        pass
    
    site_id = sites[0]['id'] if sites else 1
    
    for i in range(5):
        payload = {
            "site_id": site_id,
            "delivery_date": (date.today() - timedelta(days=i)).isoformat(),
            "materials_delivered": f"Materiale test {i+1} (Ciment, Fier)",
            "photo_url": None
        }
        res = requests.post('http://localhost:8000/api/admin/logistics/deliveries', json=payload)
        print(f"Inserted: {res.status_code}")
except Exception as e:
    print(f"Error: {e}")
