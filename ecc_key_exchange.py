# ============================================
# Elliptic Curve Cryptography (ECC) Key Exchange
# ============================================

print("==============================================")
print("   ELLIPTIC CURVE CRYPTOGRAPHY - ECC")
print("          KEY EXCHANGE USING ECDH")
print("==============================================")

# Elliptic Curve:
# y² = x³ + ax + b (mod p)

a = 2
b = 2
p = 17

# Valid generator point
G = (5, 1)


# --------------------------------------------
# Check whether point is on the curve
# --------------------------------------------
def is_on_curve(P, a_param=None, b_param=None, p_param=None):
    _a = a if a_param is None else a_param
    _b = b if b_param is None else b_param
    _p = p if p_param is None else p_param

    if P is None:
        return True

    x, y = P

    return (y * y - (x * x * x + _a * x + _b)) % _p == 0


# --------------------------------------------
# Add two points
# --------------------------------------------
def point_add(P, Q, a_param=None, p_param=None):
    _a = a if a_param is None else a_param
    _p = p if p_param is None else p_param

    if P is None:
        return Q

    if Q is None:
        return P

    x1, y1 = P
    x2, y2 = Q

    # P + (-P) = Point at Infinity
    if x1 == x2 and (y1 + y2) % _p == 0:
        return None

    # Point doubling
    if P == Q:

        numerator = (3 * x1 * x1 + _a) % _p
        denominator = (2 * y1) % _p

    # Point addition
    else:

        numerator = (y2 - y1) % _p
        denominator = (x2 - x1) % _p

    # Modular inverse
    inverse = pow(denominator, -1, _p)

    slope = (numerator * inverse) % _p

    x3 = (slope * slope - x1 - x2) % _p
    y3 = (slope * (x1 - x3) - y1) % _p

    return (x3, y3)


# --------------------------------------------
# Scalar Multiplication
# --------------------------------------------
def scalar_multiply(k, P, a_param=None, p_param=None):
    _a = a if a_param is None else a_param
    _p = p if p_param is None else p_param

    result = None

    while k > 0:

        if k % 2 == 1:
            result = point_add(result, P, _a, _p)

        P = point_add(P, P, _a, _p)

        k = k // 2

    return result


# --------------------------------------------
# Main Program
# --------------------------------------------
if __name__ == "__main__":
    print("\nElliptic Curve Parameters")
    print("----------------------------------------------")
    print("Curve : y² = x³ + 2x + 2 (mod 17)")
    print("Base Point G :", G)

    print("\nEnter Private Keys")
    print("----------------------------------------------")

    alice_private = int(input("Enter Alice's private key: "))
    bob_private = int(input("Enter Bob's private key: "))

    # --------------------------------------------
    # Generate Public Keys
    # --------------------------------------------

    alice_public = scalar_multiply(alice_private, G)
    bob_public = scalar_multiply(bob_private, G)

    print("\nGenerating Public Keys...")
    print("----------------------------------------------")

    print("Alice Private Key :", alice_private)
    print("Alice Public Key  :", alice_public)

    print()

    print("Bob Private Key   :", bob_private)
    print("Bob Public Key    :", bob_public)

    # --------------------------------------------
    # Generate Shared Secret
    # --------------------------------------------

    print("\nGenerating Shared Secret...")
    print("----------------------------------------------")

    alice_shared = scalar_multiply(
        alice_private,
        bob_public
    )

    bob_shared = scalar_multiply(
        bob_private,
        alice_public
    )

    print("Alice Shared Secret :", alice_shared)
    print("Bob Shared Secret   :", bob_shared)

    # --------------------------------------------
    # Verify
    # --------------------------------------------

    print("\n==============================================")

    if alice_shared == bob_shared and alice_shared is not None:

        print("       KEY EXCHANGE SUCCESSFUL!")
        print("==============================================")
        print("Shared Secret :", alice_shared)

    else:

        print("       KEY EXCHANGE FAILED!")
        print("==============================================")