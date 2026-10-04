# ECC ECDH LAB — Elliptic Curve Cryptography & ECDH Simulator

An interactive, educational laboratory simulation and web dashboard for **Elliptic Curve Cryptography (ECC)** and the **Elliptic Curve Diffie-Hellman (ECDH) Key Exchange Protocol** over finite fields $\mathbb{F}_p$.

Designed for cryptography coursework, laboratory demonstrations, and academic vivas, this platform combines pure Python cryptographic algorithms, step-by-step mathematical execution traces, and a real-time animated laboratory simulation.

---

## 🌟 Key Features

* **Complete ECDH Simulation (8 Interactive Stages):**
  1. **Input Parameters:** Displays current active curve parameters ($a, b, p$), generator point $G$, and private keys ($d_A, d_B$).
  2. **Curve Validation:** Validates the Weierstrass equation $y^2 \equiv x^3 + ax + b \pmod p$, field primality, and non-singularity ($\Delta = 4a^3 + 27b^2 \not\equiv 0 \pmod p$).
  3. **Generator Verification:** Confirms that base point $G$ lies on the curve and highlights it on the finite field grid.
  4. **Alice Public Key Generation:** Traces scalar multiplication $A = d_A \times G$ using the double-and-add algorithm.
  5. **Bob Public Key Generation:** Traces scalar multiplication $B = d_B \times G$ with intermediate arithmetic steps.
  6. **Public Key Exchange (Animated Packet Transmission):** Physical animated packet transit across the communication channel (Alice $\to$ Bob, Bob $\to$ Alice), visually demonstrating that private keys remain secure in local vaults while only public keys travel.
  7. **Independent Shared Secret Calculation:** Traces $S_A = d_A \times B$ and $S_B = d_B \times A$ computed independently on both ends.
  8. **Verification & Convergence:** Verifies that $S_A = S_B = d_A d_B G$, confirming successful key agreement.

* **Full Playback Controls:**
  - `◀ Previous Step` and `▶ Next Step` for manual step-by-step inspection.
  - `▶ Play Simulation` with automatic stage progression and timing.
  - `⏸ Pause` to halt auto-advancement at any point.
  - `↻ Restart` to reset the simulation to Stage 1.
  - Direct stage selection via clickable timeline bubbles (01–08).

* **Interactive Finite Field Coordinate Grid ($\mathbb{F}_p \times \mathbb{F}_p$):**
  - Renders all discrete affine points on the curve.
  - Highlights $G$ (amber), Alice's public key $A$ (emerald), Bob's public key $B$ (orange), and the shared secret point $S$ (purple).
  - Traces intermediate scalar multiplication trajectories on the discrete lattice.
  - Hover tooltips display exact coordinates and point classifications.

* **Live Mathematical Trace Deck:**
  - Displays real algebraic substitutions for every stage (no mock or hardcoded values).
  - Quick-reference tabs for **Current Stage Math**, **Point Addition**, **Point Doubling**, and **Scalar Multiplication**.
  - Rendered via **MathJax 3** for LaTeX mathematical typography.

* **Curated Educational Presets:**
  - Pre-configured textbook curves with small primes ($p \in \{11, 13, 17, 19, 23\}$) for rapid classroom demonstration and manual calculation cross-checking.

* **Dual Interface (CLI & Web):**
  - Web UI powered by Flask, Vanilla CSS, and Vanilla JavaScript.
  - Standalone command-line script (`ecc_key_exchange.py`) for terminal-based execution.

---

## 📐 Mathematical Foundations

### 1. Short Weierstrass Equation over $\mathbb{F}_p$
The elliptic curve is defined over a prime field $\mathbb{F}_p$ ($p > 3$) by:
$$y^2 \equiv x^3 + ax + b \pmod p$$

To ensure the curve has no cusps, self-intersections, or singular points, the discriminant must satisfy:
$$\Delta = 4a^3 + 27b^2 \not\equiv 0 \pmod p$$

### 2. Group Law & Point Arithmetic

#### Point Addition ($P \ne Q$):
For distinct points $P = (x_1, y_1)$ and $Q = (x_2, y_2)$ where $x_1 \ne x_2$:
$$\lambda \equiv \frac{y_2 - y_1}{x_2 - x_1} \equiv (y_2 - y_1) \cdot (x_2 - x_1)^{-1} \pmod p$$
$$x_3 \equiv \lambda^2 - x_1 - x_2 \pmod p$$
$$y_3 \equiv \lambda(x_1 - x_3) - y_1 \pmod p$$

#### Point Doubling ($P = Q$):
For point doubling where $y_1 \not\equiv 0$:
$$\lambda \equiv \frac{3x_1^2 + a}{2y_1} \equiv (3x_1^2 + a) \cdot (2y_1)^{-1} \pmod p$$
$$x_3 \equiv \lambda^2 - 2x_1 \pmod p$$
$$y_3 \equiv \lambda(x_1 - x_3) - y_1 \pmod p$$

#### Point at Infinity & Inverses:
* The identity element is the Point at Infinity, denoted as $\mathcal{O}$ (`None`).
* $P + \mathcal{O} = P$.
* If $x_1 = x_2$ and $(y_1 + y_2) \equiv 0 \pmod p$, then $P + Q = \mathcal{O}$.
* Modular inverses are computed using Fermat's Little Theorem / Extended Euclidean Algorithm:
  $$(denominator)^{-1} \equiv denominator^{p - 2} \pmod p$$

### 3. Scalar Multiplication ($k \cdot P$)
Computed in $O(\log k)$ point additions and doublings via the **Double-and-Add** algorithm:
```text
result = Point_At_Infinity
current = P
while k > 0:
    if k is odd:
        result = result + current
    current = current + current  (point doubling)
    k = k // 2
return result
```

### 4. ECDH Protocol Exchange
1. Alice chooses private key $d_A \in [1, n-1]$ and computes public key $A = d_A \times G$.
2. Bob chooses private key $d_B \in [1, n-1]$ and computes public key $B = d_B \times G$.
3. Alice and Bob exchange their public keys $A$ and $B$ across the public channel.
4. Alice computes: $S_A = d_A \times B = d_A \times (d_B \times G) = (d_A d_B) \times G$.
5. Bob computes: $S_B = d_B \times A = d_B \times (d_A \times G) = (d_B d_A) \times G$.
6. Since scalar multiplication is associative and commutative over the curve group:
   $$S_A = S_B = S$$
7. Security relies on the **Elliptic Curve Discrete Logarithm Problem (ECDLP)**: given $G$ and $d \times G$, finding $d$ is computationally infeasible for cryptographically large primes.

---

## 📂 Project Architecture

```
Cryptography Assignment/
├── app.py                  # Flask web server & REST API controller
├── ecc_engine.py           # Core cryptographic engine (arithmetic, validation, traces)
├── ecc_key_exchange.py     # Standalone CLI ECDH demonstration script
├── test_endpoints.py       # Automated integration test suite
├── templates/
│   └── index.html          # Single-page web dashboard & visualization UI
├── static/
│   ├── css/
│   │   └── style.css       # Academic styling, animations, and responsive layouts
│   └── js/
│       └── app.js          # Client state management, MathJax hooks, canvas renderer
├── .gitignore              # Ignored files (caches, logs, virtual environments)
└── README.md               # Project documentation (this file)
```

---

## 🚀 Getting Started

### Prerequisites
* **Python 3.8+** installed on your system.
* Web browser (Chrome, Firefox, Edge, Safari).

### 1. Clone or Open the Repository
```bash
cd "Cryptography Assignment"
```

### 2. Set Up a Virtual Environment (Recommended)
```bash
# Windows
python -m venv venv
.\venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install flask flask-cors
```

### 4. Run the Web Application
```bash
python app.py
```
Open your browser and navigate to:
```
http://127.0.0.1:5000/
```

### 5. Run the Standalone CLI Demo
You can also run the direct command-line version:
```bash
python ecc_key_exchange.py
```

---

## 🧪 Running Tests

The automated test suite verifies all API routes, curve parameter validators, point arithmetic, modular inverses, and scalar multiplication traces:

```bash
python test_endpoints.py
```

Expected output:
```text
[PASS] Home page renders with status 200
[PASS] Presets endpoint returned 5 presets
[PASS] Valid curve check passed with 18 affine points
[PASS] Invalid generator properly rejected with informative error
[PASS] Keys generated: Alice Pub [10, 6], Bob Pub [0, 6]
[PASS] Shared secret matched: (6, 3) for both Alice and Bob
[PASS] End-to-end simulation passed with full traces

ALL BACKEND TESTS PASSED!
```

---

## 📡 REST API Reference

| Endpoint | Method | Description |
| :--- | :---: | :--- |
| `/` | `GET` | Serves the main single-page web application. |
| `/api/presets` | `GET` | Returns available educational curve presets. |
| `/api/validate_curve` | `POST` | Validates parameters ($a, b, p, G_x, G_y$), calculates discriminant $\Delta$, and returns all affine curve points. |
| `/api/generate_keys` | `POST` | Computes $A = d_A \cdot G$ and $B = d_B \cdot G$ with step-by-step arithmetic traces. |
| `/api/compute_shared_secret`| `POST` | Computes $S_A = d_A \cdot B$ and $S_B = d_B \cdot A$ and checks for equality. |
| `/api/simulate` | `POST` | Runs the full end-to-end ECDH protocol in one call, returning all traces, points, and validation flags. |

### Sample API Payload (`/api/simulate`):
```json
{
  "a": 2,
  "b": 2,
  "p": 17,
  "Gx": 5,
  "Gy": 1,
  "alice_private": 3,
  "bob_private": 7
}
```

### Sample Response (`/api/simulate`):
```json
{
  "success": true,
  "curve": {
    "equation": "y² = x³ + 2x + 2 (mod 17)",
    "discriminant": 9,
    "total_affine_points": 18
  },
  "generator": [5, 1],
  "alice_public": [10, 6],
  "bob_public": [0, 6],
  "shared_secrets": {
    "alice_shared": [6, 3],
    "bob_shared": [6, 3],
    "matched": true
  }
}
```

---

## 📚 Educational Curve Presets

The simulator includes pre-computed curves ideal for assignments and manual step verification:

| Preset Name | Equation | Prime $p$ | Base Point $G$ | Order $N$ |
| :--- | :--- | :---: | :---: | :---: |
| **Default Assignment Curve** | $y^2 \equiv x^3 + 2x + 2 \pmod{17}$ | $17$ | $(5, 1)$ | $19$ |
| **Small Prime Curve** | $y^2 \equiv x^3 + x + 6 \pmod{11}$ | $11$ | $(2, 7)$ | $13$ |
| **Compact Field Curve** | $y^2 \equiv x^3 + 3x + 8 \pmod{13}$ | $13$ | $(1, 7)$ | $10$ |
| **Slightly Larger Curve** | $y^2 \equiv x^3 + 2x + 3 \pmod{19}$ | $19$ | $(1, 5)$ | $20$ |
| **Rich Point Set Curve** | $y^2 \equiv x^3 + 3x + 4 \pmod{23}$ | $23$ | $(0, 2)$ | $25$ |

---

## 🎨 Design & Styling Principles

* **Academic & Professional Aesthetics:** Clean, light palette featuring emerald green (`#059669`), warm orange (`#ea580c`), subtle slate gray borders, and charcoal typography.
* **Vector Graphics:** Professional SVG illustrations for participants, vaults, and key packets.
* **Responsive Layout:** Responsive layout reflows seamlessly across desktop monitors, laptops, tablets, and smartphones.
* **Accessibility:** Supports `@media (prefers-reduced-motion: reduce)` to eliminate motion for sensitive users.
* **Zero External JS Frameworks:** Pure Vanilla JS DOM and Canvas rendering for fast load times and clean debugging.

---

## 📄 License & Academic Integrity

This project is created for educational and academic laboratory purposes. Feel free to use, modify, and extend this codebase for learning Elliptic Curve Cryptography.
