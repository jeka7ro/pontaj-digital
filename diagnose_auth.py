#!/usr/bin/env python3
"""
Diagnostic script to debug admin authentication issues
"""
import requests
import json
import sys

BASE_URL = "http://localhost:6001/api"

def test_auth():
    print("=" * 60)
    print("ADMIN AUTHENTICATION DIAGNOSTIC")
    print("=" * 60)
    
    # Test 1: Check if /admin/me returns 401 without token
    print("\n[1] Testing /api/admin/me WITHOUT token:")
    try:
        resp = requests.get(f"{BASE_URL}/admin/me", timeout=5)
        print(f"    Status: {resp.status_code}")
        print(f"    Response: {resp.text[:200]}")
    except Exception as e:
        print(f"    ERROR: {e}")
    
    # Test 2: Try to login with default admin credentials
    print("\n[2] Testing /api/admin/login with default admin credentials:")
    try:
        resp = requests.post(f"{BASE_URL}/admin/login", json={
            "email": "admin@pontaj.ro",
            "password": "admin123"
        }, timeout=5)
        print(f"    Status: {resp.status_code}")
        print(f"    Response: {resp.text[:500]}")
        if resp.status_code == 200:
            token = resp.json().get("access_token")
            print(f"    ✅ Got token: {token[:50]}...")
            return token
    except Exception as e:
        print(f"    ERROR: {e}")
    
    # Test 3: Check database for admins
    print("\n[3] Checking database for admin users:")
    try:
        import sys
        sys.path.insert(0, '/Users/eugeniucazmal/Downloads/dev_office/pontaj_digital/backend')
        from app.database import SessionLocal
        from app.models import Admin
        db = SessionLocal()
        admins = db.query(Admin).all()
        print(f"    Found {len(admins)} admin(s):")
        for admin in admins:
            print(f"      - {admin.email}: active={admin.is_active}, role={admin.role}")
        db.close()
    except Exception as e:
        print(f"    ERROR: {e}")
        import traceback
        traceback.print_exc()
    
    return None

def test_with_token(token):
    if not token:
        print("\n⚠️  No token available, skipping authenticated tests")
        return
    
    print("\n[4] Testing /api/admin/me WITH token:")
    headers = {"Authorization": f"Bearer {token}"}
    try:
        resp = requests.get(f"{BASE_URL}/admin/me", headers=headers, timeout=5)
        print(f"    Status: {resp.status_code}")
        print(f"    Response: {resp.text[:200]}")
    except Exception as e:
        print(f"    ERROR: {e}")
    
    print("\n[5] Testing /api/admin/users WITH token:")
    try:
        resp = requests.get(f"{BASE_URL}/admin/users/?page=1&page_size=10", 
                           headers=headers, timeout=5)
        print(f"    Status: {resp.status_code}")
        print(f"    Response: {resp.text[:200]}")
    except Exception as e:
        print(f"    ERROR: {e}")
    
    print("\n[6] Testing /api/admin/roles WITH token:")
    try:
        resp = requests.get(f"{BASE_URL}/admin/roles/", headers=headers, timeout=5)
        print(f"    Status: {resp.status_code}")
        print(f"    Response: {resp.text[:200]}")
    except Exception as e:
        print(f"    ERROR: {e}")

if __name__ == "__main__":
    print("Make sure the backend is running on http://localhost:6001")
    print()
    token = test_auth()
    test_with_token(token)
    print("\n" + "=" * 60)
