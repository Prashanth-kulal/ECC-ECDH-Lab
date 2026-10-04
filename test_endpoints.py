"""
Unit and integration test for Flask ECC ECDH application.
"""
import app

client = app.app.test_client()

def test_home():
    res = client.get("/")
    assert res.status_code == 200
    assert b"ECC ECDH LAB" in res.data
    print("[PASS] Home page renders with status 200")

def test_presets():
    res = client.get("/api/presets")
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert len(data["presets"]) >= 3
    print(f"[PASS] Presets endpoint returned {len(data['presets'])} presets")

def test_validate_curve_valid():
    payload = {"a": 2, "b": 2, "p": 17, "Gx": 5, "Gy": 1}
    res = client.post("/api/validate_curve", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["valid"] is True
    assert len(data["points"]) == 18
    print(f"[PASS] Valid curve check passed with {len(data['points'])} affine points")

def test_validate_curve_invalid():
    # G=(4, 1) is not on y² = x³ + 2x + 2 (mod 17)
    payload = {"a": 2, "b": 2, "p": 17, "Gx": 4, "Gy": 1}
    res = client.post("/api/validate_curve", json=payload)
    assert res.status_code == 400
    data = res.get_json()
    assert data["success"] is False
    assert "NOT on the curve" in data["error"]
    print("[PASS] Invalid generator properly rejected with informative error")

def test_generate_keys():
    payload = {
        "a": 2, "b": 2, "p": 17,
        "Gx": 5, "Gy": 1,
        "alice_private": 3, "bob_private": 7
    }
    res = client.post("/api/generate_keys", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["alice_public"] == [10, 6]
    assert data["bob_public"] == [0, 6]
    print(f"[PASS] Keys generated: Alice Pub {data['alice_public']}, Bob Pub {data['bob_public']}")

def test_compute_shared_secret():
    payload = {
        "a": 2, "p": 17,
        "alice_private": 3, "bob_private": 7,
        "alice_public": [10, 6], "bob_public": [0, 6]
    }
    res = client.post("/api/compute_shared_secret", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["alice_shared"] == [6, 3]
    assert data["bob_shared"] == [6, 3]
    assert data["matched"] is True
    print("[PASS] Shared secret matched: (6, 3) for both Alice and Bob")

def test_simulate():
    payload = {
        "a": 2, "b": 2, "p": 17,
        "Gx": 5, "Gy": 1,
        "alice_private": 3, "bob_private": 7
    }
    res = client.post("/api/simulate", json=payload)
    assert res.status_code == 200
    data = res.get_json()
    assert data["success"] is True
    assert data["shared_secrets"]["matched"] is True
    assert len(data["traces"]["alice_pub_steps"]) > 0
    print("[PASS] End-to-end simulation passed with full traces")

if __name__ == "__main__":
    test_home()
    test_presets()
    test_validate_curve_valid()
    test_validate_curve_invalid()
    test_generate_keys()
    test_compute_shared_secret()
    test_simulate()
    print("\nALL BACKEND TESTS PASSED!")
