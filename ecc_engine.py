"""
ECC Engine: Mathematical Logic for Elliptic Curve Cryptography and ECDH Key Exchange.
Preserves the core mathematical implementation from ecc_key_exchange.py while providing
parameterization, primality/singularity validation, step-by-step arithmetic tracing,
and finite field point enumeration.
"""

from typing import Optional, Tuple, List, Dict, Any


def is_prime(n: int) -> bool:
    """Check if n is a prime number >= 2."""
    if n < 2:
        return False
    if n in (2, 3):
        return True
    if n % 2 == 0 or n % 3 == 0:
        return False
    i = 5
    w = 2
    while i * i <= n:
        if n % i == 0:
            return False
        i += w
        w = 6 - w
    return True


def check_singularity(a: int, b: int, p: int) -> Tuple[bool, int]:
    """
    Check if the curve y^2 = x^3 + ax + b is non-singular.
    Condition: 4a^3 + 27b^2 != 0 (mod p).
    Returns (is_non_singular, discriminant_mod_p).
    """
    disc = (4 * (a ** 3) + 27 * (b ** 2)) % p
    return (disc != 0), disc


def is_on_curve(P: Optional[Tuple[int, int]], a: int, b: int, p: int) -> bool:
    """
    Check whether point P is on the curve y^2 = x^3 + ax + b (mod p).
    Point at infinity (None) is considered on the curve.
    Direct implementation matching ecc_key_exchange.py.
    """
    if P is None:
        return True

    x, y = P
    return (y * y - (x * x * x + a * x + b)) % p == 0


def point_add_traced(P: Optional[Tuple[int, int]], 
                     Q: Optional[Tuple[int, int]], 
                     a: int, 
                     p: int) -> Tuple[Optional[Tuple[int, int]], Optional[Dict[str, Any]]]:
    """
    Add two points P and Q on the curve y^2 = x^3 + ax + b (mod p)
    and return (result_point, trace_dict).
    Preserves exact formulas:
      - Point doubling:
          numerator = (3*x1^2 + a) % p
          denominator = (2*y1) % p
      - Point addition:
          numerator = (y2 - y1) % p
          denominator = (x2 - x1) % p
      - Modular inverse: inverse = pow(denominator, -1, p)
      - slope = (numerator * inverse) % p
      - x3 = (slope^2 - x1 - x2) % p
      - y3 = (slope * (x1 - x3) - y1) % p
    """
    if P is None:
        trace = {
            "type": "identity_P_none",
            "description": "P is Identity (Point at Infinity), result is Q",
            "P": None,
            "Q": Q,
            "result": Q
        }
        return Q, trace

    if Q is None:
        trace = {
            "type": "identity_Q_none",
            "description": "Q is Identity (Point at Infinity), result is P",
            "P": P,
            "Q": None,
            "result": P
        }
        return P, trace

    x1, y1 = P
    x2, y2 = Q

    # P + (-P) = Point at Infinity
    if x1 == x2 and (y1 + y2) % p == 0:
        trace = {
            "type": "vertical_opposite",
            "description": f"P + (-P) = Point at Infinity because x1 == x2 ({x1}) and (y1 + y2) % p == 0",
            "P": P,
            "Q": Q,
            "result": None
        }
        return None, trace

    # Point doubling
    if P == Q:
        op_type = "doubling"
        num_formula = f"(3 * {x1}² + {a}) mod {p}"
        raw_num = (3 * x1 * x1 + a)
        numerator = raw_num % p

        den_formula = f"(2 * {y1}) mod {p}"
        raw_den = 2 * y1
        denominator = raw_den % p
    else:
        op_type = "addition"
        num_formula = f"({y2} - {y1}) mod {p}"
        raw_num = y2 - y1
        numerator = raw_num % p

        den_formula = f"({x2} - {x1}) mod {p}"
        raw_den = x2 - x1
        denominator = raw_den % p

    # Modular inverse
    try:
        inverse = pow(denominator, -1, p)
    except ValueError:
        # Denominator has no inverse modulo p (can happen if denominator % p == 0)
        trace = {
            "type": "tangent_vertical",
            "description": f"Denominator {denominator} has no modular inverse mod {p}. Result is Point at Infinity.",
            "P": P,
            "Q": Q,
            "result": None
        }
        return None, trace

    slope = (numerator * inverse) % p
    x3 = (slope * slope - x1 - x2) % p
    y3 = (slope * (x1 - x3) - y1) % p

    trace = {
        "type": op_type,
        "P": P,
        "Q": Q,
        "x1": x1, "y1": y1,
        "x2": x2, "y2": y2,
        "num_formula": num_formula,
        "raw_numerator": raw_num,
        "numerator": numerator,
        "den_formula": den_formula,
        "raw_denominator": raw_den,
        "denominator": denominator,
        "inverse": inverse,
        "slope": slope,
        "x3_formula": f"({slope}² - {x1} - {x2}) mod {p}",
        "x3": x3,
        "y3_formula": f"({slope} * ({x1} - {x3}) - {y1}) mod {p}",
        "y3": y3,
        "result": (x3, y3)
    }

    return (x3, y3), trace


def point_add(P: Optional[Tuple[int, int]], 
              Q: Optional[Tuple[int, int]], 
              a: int = 2, 
              p: int = 17) -> Optional[Tuple[int, int]]:
    """Standard point addition returning only the resulting point."""
    res, _ = point_add_traced(P, Q, a, p)
    return res


def scalar_multiply_traced(k: int, 
                           P: Optional[Tuple[int, int]], 
                           a: int, 
                           p: int) -> Tuple[Optional[Tuple[int, int]], List[Dict[str, Any]]]:
    """
    Scalar multiplication using the exact double-and-add algorithm from ecc_key_exchange.py:
        result = None
        while k > 0:
            if k % 2 == 1:
                result = point_add(result, P)
            P = point_add(P, P)
            k = k // 2
    Captures step-by-step trace for visualization.
    """
    result = None
    steps = []
    bit_index = 0
    k_current = k
    curr_P = P

    while k_current > 0:
        bit = k_current % 2
        step_info: Dict[str, Any] = {
            "iteration": bit_index,
            "k_val": k_current,
            "bit": bit,
            "point_power_2": curr_P,
            "prev_result": result,
            "added": False,
            "add_trace": None,
            "double_trace": None,
            "new_result": None
        }

        if bit == 1:
            step_info["added"] = True
            result, add_tr = point_add_traced(result, curr_P, a, p)
            step_info["add_trace"] = add_tr

        step_info["new_result"] = result

        # Compute next power of P: 2 * curr_P
        next_P, dbl_tr = point_add_traced(curr_P, curr_P, a, p)
        step_info["double_trace"] = dbl_tr
        curr_P = next_P

        steps.append(step_info)
        k_current = k_current // 2
        bit_index += 1

    return result, steps


def scalar_multiply(k: int, 
                    P: Optional[Tuple[int, int]], 
                    a: int = 2, 
                    p: int = 17) -> Optional[Tuple[int, int]]:
    """Standard scalar multiplication matching ecc_key_exchange.py."""
    res, _ = scalar_multiply_traced(k, P, a, p)
    return res


def get_all_curve_points(a: int, b: int, p: int) -> List[Tuple[int, int]]:
    """
    Enumerate all finite affine points (x, y) over F_p satisfying:
      y^2 = x^3 + ax + b (mod p).
    Useful for plotting on the coordinate grid.
    """
    points = []
    # Precompute squares modulo p for fast lookup
    # y^2 mod p -> list of y values
    squares = {}
    for y in range(p):
        sq = (y * y) % p
        if sq not in squares:
            squares[sq] = []
        squares[sq].append(y)

    for x in range(p):
        rhs = (x * x * x + a * x + b) % p
        if rhs in squares:
            for y in squares[rhs]:
                points.append((x, y))

    points.sort()
    return points


def perform_ecdh(a: int, b: int, p: int, 
                 Gx: int, Gy: int, 
                 alice_priv: int, 
                 bob_priv: int) -> Dict[str, Any]:
    """
    Execute full ECDH key exchange with complete validation,
    scalar multiplication traces, and shared secret verification.
    """
    G = (Gx, Gy)

    # 1. Parameter checks
    if not is_prime(p):
        return {"success": False, "error": f"Modulus p = {p} is not a prime number."}

    is_non_sing, disc = check_singularity(a, b, p)
    if not is_non_sing:
        return {
            "success": False, 
            "error": f"Curve is singular! 4a³ + 27b² ≡ {disc} ≡ 0 (mod {p}). Must be non-zero."
        }

    # 2. Generator check
    if not is_on_curve(G, a, b, p):
        return {
            "success": False, 
            "error": f"Generator point G = ({Gx}, {Gy}) does not lie on the curve y² = x³ + {a}x + {b} (mod {p})."
        }

    # 3. Private key checks
    if alice_priv <= 0 or bob_priv <= 0:
        return {"success": False, "error": "Private keys must be positive integers (> 0)."}

    # 4. Public key generation: A = d_A * G, B = d_B * G
    alice_pub, alice_pub_steps = scalar_multiply_traced(alice_priv, G, a, p)
    bob_pub, bob_pub_steps = scalar_multiply_traced(bob_priv, G, a, p)

    if alice_pub is None:
        return {"success": False, "error": "Alice's public key evaluates to Point at Infinity."}
    if bob_pub is None:
        return {"success": False, "error": "Bob's public key evaluates to Point at Infinity."}

    # 5. Shared Secret computation:
    # Alice computes: S_A = d_A * B
    # Bob computes:   S_B = d_B * A
    alice_shared, alice_shared_steps = scalar_multiply_traced(alice_priv, bob_pub, a, p)
    bob_shared, bob_shared_steps = scalar_multiply_traced(bob_priv, alice_pub, a, p)

    match = (alice_shared == bob_shared) and (alice_shared is not None)

    # All points for plotting
    all_points = get_all_curve_points(a, b, p)

    return {
        "success": True,
        "curve": {
            "a": a,
            "b": b,
            "p": p,
            "equation": f"y² = x³ + {a}x + {b} (mod {p})",
            "discriminant": disc,
            "generator": G,
            "total_points": len(all_points) + 1  # including point at infinity
        },
        "all_points": all_points,
        "keys": {
            "alice_private": alice_priv,
            "alice_public": alice_pub,
            "bob_private": bob_priv,
            "bob_public": bob_pub
        },
        "shared_secrets": {
            "alice_shared": alice_shared,
            "bob_shared": bob_shared,
            "matched": match
        },
        "traces": {
            "alice_pub_steps": alice_pub_steps,
            "bob_pub_steps": bob_pub_steps,
            "alice_shared_steps": alice_shared_steps,
            "bob_shared_steps": bob_shared_steps
        }
    }
