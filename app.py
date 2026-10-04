"""
Flask Application for ECC ECDH Cryptography Laboratory.
Serves the responsive dashboard UI and provides REST APIs for
curve validation, public key generation, shared secret calculation,
step-by-step arithmetic traces, and finite field point plotting.
"""

from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import ecc_engine

app = Flask(__name__, static_folder="static", template_folder="templates")
CORS(app)


# Educational presets for college demonstration & viva
PRESETS = [
    {
        "name": "Default Assignment Curve",
        "description": "Standard textbook curve from original code (p = 17)",
        "a": 2,
        "b": 2,
        "p": 17,
        "Gx": 5,
        "Gy": 1,
        "alice_private": 3,
        "bob_private": 7
    },
    {
        "name": "Small Prime Curve (p = 11)",
        "description": "Compact finite field y² = x³ + x + 6 (mod 11)",
        "a": 1,
        "b": 6,
        "p": 11,
        "Gx": 2,
        "Gy": 7,
        "alice_private": 2,
        "bob_private": 4
    },
    {
        "name": "Compact Field Curve (p = 13)",
        "description": "y² = x³ + 3x + 8 (mod 13) with generator (1, 7)",
        "a": 3,
        "b": 8,
        "p": 13,
        "Gx": 1,
        "Gy": 7,
        "alice_private": 3,
        "bob_private": 5
    },
    {
        "name": "Slightly Larger Curve (p = 19)",
        "description": "y² = x³ + 2x + 3 (mod 19) with generator (1, 5)",
        "a": 2,
        "b": 3,
        "p": 19,
        "Gx": 1,
        "Gy": 5,
        "alice_private": 4,
        "bob_private": 6
    },
    {
        "name": "Rich Point Set Curve (p = 23)",
        "description": "y² = x³ + 3x + 4 (mod 23) with generator (0, 2)",
        "a": 3,
        "b": 4,
        "p": 23,
        "Gx": 0,
        "Gy": 2,
        "alice_private": 5,
        "bob_private": 8
    }
]


@app.route("/")
def index():
    """Render the dashboard application."""
    return render_template("index.html")


@app.route("/api/presets", methods=["GET"])
def get_presets():
    """Return available educational presets."""
    return jsonify({"success": True, "presets": PRESETS})


@app.route("/api/validate_curve", methods=["POST"])
def validate_curve():
    """
    Validate curve parameters (a, b, p) and generator point (Gx, Gy).
    Returns non-singularity, point validity, and all curve points.
    """
    data = request.get_json() or {}
    try:
        a = int(data.get("a"))
        b = int(data.get("b"))
        p = int(data.get("p"))
        gx = int(data.get("Gx"))
        gy = int(data.get("Gy"))
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "All parameters (a, b, p, Gx, Gy) must be valid integers."}), 400

    if p < 3:
        return jsonify({"success": False, "error": f"Modulus p = {p} must be an odd prime number >= 3."}), 400

    if not ecc_engine.is_prime(p):
        return jsonify({"success": False, "error": f"p = {p} is not a prime number! ECC finite fields require a prime modulus."}), 400

    is_non_sing, disc = ecc_engine.check_singularity(a, b, p)
    if not is_non_sing:
        return jsonify({
            "success": False,
            "error": f"Singular curve! Discriminant 4a³ + 27b² ≡ {disc} ≡ 0 (mod {p}). Elliptic curves must be non-singular."
        }), 400

    G = (gx, gy)
    g_valid = ecc_engine.is_on_curve(G, a, b, p)
    all_points = ecc_engine.get_all_curve_points(a, b, p)

    if not g_valid:
        # Calculate LHS and RHS to give clear feedback
        lhs = (gy * gy) % p
        rhs = (gx * gx * gx + a * gx + b) % p
        return jsonify({
            "success": False,
            "error": f"Generator point G=({gx}, {gy}) is NOT on the curve! LHS = {gy}² ≡ {lhs} (mod {p}), RHS = ({gx}³ + {a}·{gx} + {b}) ≡ {rhs} (mod {p}).",
            "curve_points": all_points,
            "equation": f"y² = x³ + {a}x + {b} (mod {p})"
        }), 400

    return jsonify({
        "success": True,
        "valid": True,
        "equation": f"y² = x³ + {a}x + {b} (mod {p})",
        "discriminant": disc,
        "generator": G,
        "total_affine_points": len(all_points),
        "total_points": len(all_points) + 1,  # + Point at Infinity
        "points": all_points,
        "message": f"✓ Generator point ({gx}, {gy}) is valid and lies on y² = x³ + {a}x + {b} (mod {p})"
    })


@app.route("/api/generate_keys", methods=["POST"])
def generate_keys():
    """
    Generate public keys A = d_A * G and B = d_B * G with scalar multiplication step traces.
    """
    data = request.get_json() or {}
    try:
        a = int(data.get("a"))
        b = int(data.get("b"))
        p = int(data.get("p"))
        gx = int(data.get("Gx"))
        gy = int(data.get("Gy"))
        alice_priv = int(data.get("alice_private"))
        bob_priv = int(data.get("bob_private"))
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "Invalid or missing inputs. All parameters must be integers."}), 400

    if alice_priv <= 0 or bob_priv <= 0:
        return jsonify({"success": False, "error": "Private keys must be positive integers (> 0)."}), 400

    G = (gx, gy)
    if not ecc_engine.is_on_curve(G, a, b, p):
        return jsonify({"success": False, "error": f"Generator point G=({gx}, {gy}) is not on the curve."}), 400

    alice_pub, alice_steps = ecc_engine.scalar_multiply_traced(alice_priv, G, a, p)
    bob_pub, bob_steps = ecc_engine.scalar_multiply_traced(bob_priv, G, a, p)

    if alice_pub is None:
        return jsonify({"success": False, "error": "Alice's public key computed to Point at Infinity. Please choose another private key."}), 400
    if bob_pub is None:
        return jsonify({"success": False, "error": "Bob's public key computed to Point at Infinity. Please choose another private key."}), 400

    return jsonify({
        "success": True,
        "alice_public": alice_pub,
        "bob_public": bob_pub,
        "alice_pub_steps": alice_steps,
        "bob_pub_steps": bob_steps
    })


@app.route("/api/compute_shared_secret", methods=["POST"])
def compute_shared_secret():
    """
    Compute Alice Shared Secret S_A = d_A * B and Bob Shared Secret S_B = d_B * A.
    Verify if S_A == S_B.
    """
    data = request.get_json() or {}
    try:
        a = int(data.get("a"))
        p = int(data.get("p"))
        alice_priv = int(data.get("alice_private"))
        bob_priv = int(data.get("bob_private"))
        alice_pub = tuple(data.get("alice_public"))
        bob_pub = tuple(data.get("bob_public"))
    except (TypeError, ValueError, KeyError):
        return jsonify({"success": False, "error": "Invalid inputs for shared secret computation."}), 400

    alice_shared, alice_shared_steps = ecc_engine.scalar_multiply_traced(alice_priv, bob_pub, a, p)
    bob_shared, bob_shared_steps = ecc_engine.scalar_multiply_traced(bob_priv, alice_pub, a, p)

    match = (alice_shared == bob_shared) and (alice_shared is not None)

    return jsonify({
        "success": True,
        "alice_shared": alice_shared,
        "bob_shared": bob_shared,
        "matched": match,
        "alice_shared_steps": alice_shared_steps,
        "bob_shared_steps": bob_shared_steps
    })


@app.route("/api/simulate", methods=["POST"])
def simulate():
    """
    Execute full end-to-end ECDH key exchange simulation in one shot,
    returning all data needed by the 7-step visualizer and coordinate plot.
    """
    data = request.get_json() or {}
    try:
        a = int(data.get("a"))
        b = int(data.get("b"))
        p = int(data.get("p"))
        gx = int(data.get("Gx"))
        gy = int(data.get("Gy"))
        alice_priv = int(data.get("alice_private"))
        bob_priv = int(data.get("bob_private"))
    except (TypeError, ValueError):
        return jsonify({"success": False, "error": "All inputs must be valid integers."}), 400

    result = ecc_engine.perform_ecdh(a, b, p, gx, gy, alice_priv, bob_priv)
    if not result.get("success"):
        return jsonify(result), 400

    return jsonify(result)


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
