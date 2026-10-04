/**
 * ECC ECDH LAB - Client Application Controller
 * Handles state management, UI navigation, REST API communication,
 * HTML5 Canvas coordinate grid plotting, 7-stage visualizer stepper,
 * and concrete mathematical calculation formatting.
 */

const app = {
  // Global State
  state: {
    a: 2,
    b: 2,
    p: 17,
    Gx: 5,
    Gy: 1,
    alice_private: 3,
    bob_private: 7,
    // Calculated runtime data
    curveValid: true,
    allPoints: [],
    alice_public: null,
    bob_public: null,
    alice_shared: null,
    bob_shared: null,
    matched: null,
    traces: null,
    currentView: 'aim',
    vizStep: 1,
    vizMaxStep: 8,
    isPlaying: false,
    playInterval: null,
    animationTimers: [],
    highlightPoints: []
  },

  // Helper: re-typeset MathJax on an element (or entire page if no element)
  retypeset(element) {
    if (window.retypesetMath) {
      window.retypesetMath(element || null);
    }
  },

  // Initialization
  init() {
    this.bindEvents();
    this.setupLabToolsToggle();
    this.setupFeedbackForm();
    this.setupAssignmentWorkspace();
    this.loadPresets();
    this.updateDynamicEquationDisplay();
    this.validateCurveOnLoad();
    this.setupCanvas();
    this.fetchFullSimulation();
  },

  // Bind UI Events
  bindEvents() {
    // Sidebar navigation (handles all primary items and collapsible sub-items)
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const view = btn.getAttribute('data-view');
        this.navigateTo(view);
      });
    });

    // Mobile hamburger menu toggle
    const hamburger = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('app-sidebar');
    if (hamburger && sidebar) {
      hamburger.addEventListener('click', () => {
        sidebar.classList.toggle('open');
      });
    }

    // Dashboard CTA button
    const dashStartBtn = document.getElementById('dash-start-sim-btn');
    if (dashStartBtn) {
      dashStartBtn.addEventListener('click', () => {
        this.navigateTo('simulation');
      });
    }

    // Presets dropdown (Dashboard)
    const presetSelect = document.getElementById('dash-preset-select');
    if (presetSelect) {
      presetSelect.addEventListener('change', (e) => {
        const idx = e.target.value;
        if (idx !== "") {
          this.applyPreset(parseInt(idx, 10));
        }
      });
    }

    // Presets dropdown (Simulation Page Quick Bar)
    const simPresetSelect = document.getElementById('sim-preset-select');
    if (simPresetSelect) {
      simPresetSelect.addEventListener('change', (e) => {
        const idx = e.target.value;
        if (idx !== "") {
          this.applyPreset(parseInt(idx, 10));
        }
      });
    }

    // Simulation page recalculate button
    const simRecalcBtn = document.getElementById('sim-recalc-btn');
    if (simRecalcBtn) {
      simRecalcBtn.addEventListener('click', () => {
        this.handleRunFullSimulation(false);
      });
    }

    // Curve Setup Inputs - Dynamic equation preview
    ['param-a', 'param-b', 'param-p', 'param-gx', 'param-gy'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          this.readFormInputs();
          this.updateDynamicEquationDisplay();
          this.invalidateCalculations();
        });
      }
    });

    // Validate Curve Button
    const valCurveBtn = document.getElementById('btn-validate-curve');
    if (valCurveBtn) {
      valCurveBtn.addEventListener('click', () => this.handleValidateCurve());
    }

    // Proceed to ECDH Button
    const proceedEcdhBtn = document.getElementById('btn-proceed-to-ecdh');
    if (proceedEcdhBtn) {
      proceedEcdhBtn.addEventListener('click', () => {
        this.navigateTo('ecdh-exchange');
      });
    }

    // Reset Defaults Button
    const resetBtn = document.getElementById('curve-reset-defaults-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.applyPreset(0));
    }

    // Private key changes invalidate old public/shared keys
    ['alice-private-key', 'bob-private-key'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', () => {
          this.readFormInputs();
          this.invalidateKeys();
        });
      }
    });

    // Key Exchange Buttons
    const btnGenKeys = document.getElementById('btn-generate-keys');
    if (btnGenKeys) {
      btnGenKeys.addEventListener('click', () => this.handleGenerateKeys());
    }

    const btnComputeShared = document.getElementById('btn-compute-shared');
    if (btnComputeShared) {
      btnComputeShared.addEventListener('click', () => this.handleComputeShared());
    }

    const btnRunFullEcdh = document.getElementById('btn-run-full-ecdh');
    if (btnRunFullEcdh) {
      btnRunFullEcdh.addEventListener('click', () => this.handleRunFullSimulation());
    }

    // Stepper Controls (Top)
    document.getElementById('btn-viz-next')?.addEventListener('click', () => this.nextVizStep());
    document.getElementById('btn-viz-prev')?.addEventListener('click', () => this.prevVizStep());
    document.getElementById('btn-viz-play')?.addEventListener('click', () => this.playViz());
    document.getElementById('btn-viz-pause')?.addEventListener('click', () => this.pauseViz());
    document.getElementById('btn-viz-restart')?.addEventListener('click', () => this.goToVizStep(1));
    document.getElementById('viz-run-fresh-btn')?.addEventListener('click', () => this.handleRunFullSimulation(true));

    // Stepper Controls (Bottom)
    document.getElementById('btn-viz-next-bottom')?.addEventListener('click', () => this.nextVizStep());
    document.getElementById('btn-viz-prev-bottom')?.addEventListener('click', () => this.prevVizStep());
    document.getElementById('btn-viz-play-bottom')?.addEventListener('click', () => this.playViz());
    document.getElementById('btn-viz-pause-bottom')?.addEventListener('click', () => this.pauseViz());
    document.getElementById('btn-viz-restart-bottom')?.addEventListener('click', () => this.goToVizStep(1));

    // Timeline clicks
    document.querySelectorAll('.timeline-step').forEach(stepEl => {
      stepEl.addEventListener('click', () => {
        const stepNum = parseInt(stepEl.getAttribute('data-step'), 10);
        this.goToVizStep(stepNum);
      });
    });

    // Math tab buttons
    document.querySelectorAll('.tab-btn').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.math-tab-content').forEach(c => c.classList.remove('active'));
        tab.classList.add('active');
        const targetId = tab.getAttribute('data-tab');
        document.getElementById(targetId)?.classList.add('active');
      });
    });
  },

  // Read current numeric values from forms
  readFormInputs() {
    this.state.a = parseInt(document.getElementById('param-a').value, 10) || 0;
    this.state.b = parseInt(document.getElementById('param-b').value, 10) || 0;
    this.state.p = parseInt(document.getElementById('param-p').value, 10) || 3;
    this.state.Gx = parseInt(document.getElementById('param-gx').value, 10) || 0;
    this.state.Gy = parseInt(document.getElementById('param-gy').value, 10) || 0;
    this.state.alice_private = parseInt(document.getElementById('alice-private-key').value, 10) || 1;
    this.state.bob_private = parseInt(document.getElementById('bob-private-key').value, 10) || 1;
  },

  // Sync inputs back to form fields
  syncInputsToForm() {
    document.getElementById('param-a').value = this.state.a;
    document.getElementById('param-b').value = this.state.b;
    document.getElementById('param-p').value = this.state.p;
    document.getElementById('param-gx').value = this.state.Gx;
    document.getElementById('param-gy').value = this.state.Gy;
    document.getElementById('alice-private-key').value = this.state.alice_private;
    document.getElementById('bob-private-key').value = this.state.bob_private;
    this.updateDynamicEquationDisplay();
  },

  // Invalidate calculations when user modifies curve parameters
  invalidateCalculations() {
    this.state.curveValid = false;
    this.state.allPoints = [];
    this.invalidateKeys();
    this.updateDashboardCards();
    this.drawCanvas();
  },

  // Invalidate keys when private keys change
  invalidateKeys() {
    this.state.alice_public = null;
    this.state.bob_public = null;
    this.state.alice_shared = null;
    this.state.bob_shared = null;
    this.state.matched = null;
    this.state.traces = null;

    // Reset UI displays
    document.getElementById('alice-public-key-display').innerHTML = '<span class="empty-state">Not generated</span>';
    document.getElementById('bob-public-key-display').innerHTML = '<span class="empty-state">Not generated</span>';
    document.getElementById('alice-shared-secret-display').innerHTML = '<span class="empty-state">Not calculated</span>';
    document.getElementById('bob-shared-secret-display').innerHTML = '<span class="empty-state">Not calculated</span>';
    
    const computeBtn = document.getElementById('btn-compute-shared');
    if (computeBtn) computeBtn.disabled = true;

    const banner = document.getElementById('ecdh-verification-banner');
    if (banner) {
      banner.className = 'card verification-result-banner';
      document.getElementById('ecdh-result-icon').textContent = '⚖️';
      document.getElementById('ecdh-result-title').textContent = 'Awaiting Key Exchange';
      document.getElementById('ecdh-result-desc').textContent = 'Click "Generate Public Keys" and "Compute Shared Secrets" to execute the real Python ECDH protocol.';
      document.getElementById('ecdh-viz-cta-container').style.display = 'none';
    }

    document.getElementById('pill-alice-to-bob')?.classList.remove('active');
    document.getElementById('pill-bob-to-alice')?.classList.remove('active');

    this.updateDashboardCards();
    this.drawCanvas();
  },

  // Load Presets from API
  async loadPresets() {
    try {
      const res = await fetch('/api/presets');
      const data = await res.json();
      if (data.success) {
        this.presets = data.presets;
        ['dash-preset-select', 'sim-preset-select'].forEach(id => {
          const select = document.getElementById(id);
          if (select) {
            select.innerHTML = '<option value="">-- Choose Sample Curve --</option>';
            data.presets.forEach((p, idx) => {
              const opt = document.createElement('option');
              opt.value = idx;
              opt.textContent = `${p.name} (p=${p.p})`;
              select.appendChild(opt);
            });
          }
        });
      }
    } catch (e) {
      console.warn("Could not load presets from server:", e);
    }
  },

  // Apply a preset
  applyPreset(idx) {
    if (!this.presets || !this.presets[idx]) return;
    const p = this.presets[idx];
    this.state.a = p.a;
    this.state.b = p.b;
    this.state.p = p.p;
    this.state.Gx = p.Gx;
    this.state.Gy = p.Gy;
    this.state.alice_private = p.alice_private;
    this.state.bob_private = p.bob_private;

    this.syncInputsToForm();
    this.handleValidateCurve(true);
    this.showToast(`Loaded preset: ${p.name}`, 'info');
  },

  // Setup Collapsible Lab Tools Navigation
  setupLabToolsToggle() {
    const toggleBtn = document.getElementById('lab-tools-toggle');
    const content = document.getElementById('lab-tools-content');
    const chevron = document.getElementById('lab-tools-chevron');
    if (!toggleBtn || !content) return;

    toggleBtn.addEventListener('click', () => {
      const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
      if (isExpanded) {
        content.style.display = 'none';
        toggleBtn.setAttribute('aria-expanded', 'false');
        toggleBtn.classList.remove('expanded');
        if (chevron) chevron.textContent = '▾';
      } else {
        content.style.display = 'block';
        toggleBtn.setAttribute('aria-expanded', 'true');
        toggleBtn.classList.add('expanded');
        if (chevron) chevron.textContent = '▴';
      }
    });
  },

  // Auto-expand Lab Tools collapsible
  expandLabTools() {
    const toggleBtn = document.getElementById('lab-tools-toggle');
    const content = document.getElementById('lab-tools-content');
    const chevron = document.getElementById('lab-tools-chevron');
    if (toggleBtn && content) {
      content.style.display = 'block';
      toggleBtn.setAttribute('aria-expanded', 'true');
      toggleBtn.classList.add('expanded');
      if (chevron) chevron.textContent = '▴';
    }
  },

  // Setup Assignment workspace notes from localStorage
  setupAssignmentWorkspace() {
    for (let i = 1; i <= 10; i++) {
      const saved = localStorage.getItem(`ecc_assignment_note_${i}`);
      if (saved) {
        const textarea = document.getElementById(`assign-note-${i}`);
        if (textarea) textarea.value = saved;
      }
    }
  },

  // Toggle Assignment Model Answer & Viva Hint
  toggleAssignmentHint(qNum) {
    const drawer = document.getElementById(`assignment-hint-${qNum}`);
    if (!drawer) return;
    const isHidden = (drawer.style.display === 'none' || drawer.style.display === '');
    drawer.style.display = isHidden ? 'block' : 'none';
    if (isHidden) {
      this.retypeset(drawer);
    }
  },

  // Save Assignment Student Note
  saveAssignmentNote(qNum) {
    const textarea = document.getElementById(`assign-note-${qNum}`);
    const status = document.getElementById(`save-status-${qNum}`);
    if (!textarea) return;
    localStorage.setItem(`ecc_assignment_note_${qNum}`, textarea.value);
    if (status) {
      status.textContent = '✓ Note saved';
      setTimeout(() => { status.textContent = ''; }, 2500);
    }
    this.showToast(`Saved note for Question ${qNum}`, 'success');
  },

  // Setup Feedback Form with interactive star rating
  setupFeedbackForm() {
    const starBtns = document.querySelectorAll('.star-btn');
    const ratingVal = document.getElementById('feedback-rating-val');
    const ratingLabel = document.getElementById('feedback-rating-label');
    const ratingTexts = ['', '1 - Poor', '2 - Fair', '3 - Good', '4 - Very Good', '5 - Excellent'];

    starBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const r = parseInt(btn.getAttribute('data-rating'), 10);
        if (ratingVal) ratingVal.value = r;
        if (ratingLabel) ratingLabel.textContent = ratingTexts[r] || `${r} Stars`;
        starBtns.forEach(s => {
          const sr = parseInt(s.getAttribute('data-rating'), 10);
          if (sr <= r) {
            s.classList.add('active');
          } else {
            s.classList.remove('active');
          }
        });
      });
    });

    // Default 5 stars
    starBtns.forEach(s => s.classList.add('active'));
    if (ratingLabel) ratingLabel.textContent = '5 - Excellent';

    // Submit Feedback button
    const submitBtn = document.getElementById('btn-submit-feedback');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        const name = document.getElementById('feedback-name')?.value.trim();
        const email = document.getElementById('feedback-email')?.value.trim();
        const comments = document.getElementById('feedback-comments')?.value.trim();

        if (!name || !email || !comments) {
          this.showToast('Please fill in your name, institutional email, and comments.', 'error');
          return;
        }

        // Show friendly confirmation banner
        const banner = document.getElementById('feedback-success-banner');
        if (banner) {
          banner.style.display = 'flex';
          banner.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }

        this.showToast('Thank you for your feedback!', 'success');

        // Reset form inputs
        const nameEl = document.getElementById('feedback-name');
        const emailEl = document.getElementById('feedback-email');
        const commEl = document.getElementById('feedback-comments');
        if (nameEl) nameEl.value = '';
        if (emailEl) emailEl.value = '';
        if (commEl) commEl.value = '';
      });
    }

    // Clear Feedback button
    const clearBtn = document.getElementById('btn-clear-feedback');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        const nameEl = document.getElementById('feedback-name');
        const emailEl = document.getElementById('feedback-email');
        const commEl = document.getElementById('feedback-comments');
        if (nameEl) nameEl.value = '';
        if (emailEl) emailEl.value = '';
        if (commEl) commEl.value = '';
        const banner = document.getElementById('feedback-success-banner');
        if (banner) banner.style.display = 'none';
        if (ratingVal) ratingVal.value = '5';
        starBtns.forEach(s => s.classList.add('active'));
        if (ratingLabel) ratingLabel.textContent = '5 - Excellent';
        this.showToast('Feedback form cleared.', 'info');
      });
    }
  },

  // Navigation between the Academic & Lab Tools Views
  navigateTo(viewId) {
    let targetPanelId = viewId;
    if (viewId === 'visualization') {
      targetPanelId = 'simulation';
    }

    this.state.currentView = viewId;

    // Update active nav button across primary navigation and lab tools
    document.querySelectorAll('.nav-item').forEach(btn => {
      const bView = btn.getAttribute('data-view');
      if (bView === viewId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Auto-expand Lab Tools if navigating to a lab tool view
    const labToolsViews = ['dashboard', 'concepts', 'curve-setup', 'ecdh-exchange', 'visualization'];
    if (labToolsViews.includes(viewId)) {
      this.expandLabTools();
    }

    // Update view panels
    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.classList.remove('active');
    });
    const targetPanel = document.getElementById(`view-${targetPanelId}`);
    if (targetPanel) {
      targetPanel.classList.add('active');
    }

    // Close mobile sidebar if open
    document.getElementById('app-sidebar')?.classList.remove('open');

    // If entering simulation or visualization, initialize/redraw
    if (targetPanelId === 'simulation') {
      this.ensureSimulationData().then(() => {
        this.goToVizStep(this.state.vizStep || 1);
        setTimeout(() => this.drawCanvas(), 50);
      });
    } else if (targetPanelId === 'dashboard') {
      this.updateDashboardCards();
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Re-typeset math in the newly shown view panel
    if (targetPanel) {
      setTimeout(() => this.retypeset(targetPanel), 100);
    }
  },

  // Dynamic Equation display
  updateDynamicEquationDisplay() {
    const eq = `y² = x³ + ${this.state.a}x + ${this.state.b} (mod ${this.state.p})`;
    const eqElem = document.getElementById('dynamic-equation-text');
    if (eqElem) eqElem.textContent = eq;

    // Update active curve bars across views
    const activeCurveElem = document.getElementById('ecdh-active-curve');
    if (activeCurveElem) activeCurveElem.textContent = eq;
    const activeGenElem = document.getElementById('ecdh-active-gen');
    if (activeGenElem) activeGenElem.textContent = `(${this.state.Gx}, ${this.state.Gy})`;

    // Simulation Quick Bar indicator
    const simActiveCurve = document.getElementById('sim-active-curve-text');
    if (simActiveCurve) simActiveCurve.textContent = eq;
    const simActiveGen = document.getElementById('sim-active-gen-text');
    if (simActiveGen) simActiveGen.textContent = `(${this.state.Gx}, ${this.state.Gy})`;

    // Sidebar indicator
    const sidebarBadge = document.getElementById('sidebar-curve-badge');
    if (sidebarBadge) sidebarBadge.textContent = eq;

    // Discriminant preview
    const disc = (4 * Math.pow(this.state.a, 3) + 27 * Math.pow(this.state.b, 2)) % this.state.p;
    const discElem = document.getElementById('equation-meta-info');
    if (discElem) {
      const isSing = (disc === 0);
      discElem.innerHTML = `Discriminant: 4a³ + 27b² \u2261 ${disc} (mod ${this.state.p}) — ${isSing ? '<strong class="text-orange">Singular (Invalid)!</strong>' : '<strong class="text-success">Non-singular (Valid)</strong>'}`;
      this.retypeset(discElem);
    }
  },

  // Validate Curve on initial load
  validateCurveOnLoad() {
    this.readFormInputs();
    this.handleValidateCurve(false);
  },

  // Validate Curve API call
  async handleValidateCurve(silent = false) {
    this.readFormInputs();
    try {
      const res = await fetch('/api/validate_curve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          a: this.state.a,
          b: this.state.b,
          p: this.state.p,
          Gx: this.state.Gx,
          Gy: this.state.Gy
        })
      });

      const data = await res.json();
      const valBox = document.getElementById('validation-result-box');
      const valTitle = document.getElementById('validation-title');
      const valMsg = document.getElementById('validation-message');
      const valIcon = document.getElementById('validation-icon');

      if (data.success) {
        this.state.curveValid = true;
        this.state.allPoints = data.points || [];

        valBox.className = 'card validation-result-card';
        valIcon.textContent = '✓';
        valTitle.textContent = 'Curve & Generator Valid';
        valMsg.textContent = data.message || `✓ Generator point (${this.state.Gx}, ${this.state.Gy}) is valid and lies on the curve!`;

        this.renderDiscoveredPoints(data.points);
        this.updateDashboardCards();
        this.drawCanvas();

        if (!silent) this.showToast('Curve and Generator validated successfully!', 'success');
        // Re-typeset any math in the validation card
        const valBoxEl = document.getElementById('validation-result-box');
        if (valBoxEl) this.retypeset(valBoxEl);
      } else {
        this.state.curveValid = false;
        valBox.className = 'card validation-result-card is-invalid';
        valIcon.textContent = '✕';
        valTitle.textContent = 'Validation Failed';
        valMsg.textContent = data.error || 'Generator point is not on the selected curve.';
        
        if (data.curve_points) {
          this.state.allPoints = data.curve_points;
          this.renderDiscoveredPoints(data.curve_points);
        }

        this.updateDashboardCards();
        this.drawCanvas();

        if (!silent) this.showToast(data.error || 'Validation error', 'error');
        const valBoxEl2 = document.getElementById('validation-result-box');
        if (valBoxEl2) this.retypeset(valBoxEl2);
      }
    } catch (err) {
      console.error("Curve validation error:", err);
      if (!silent) this.showToast('Network error during curve validation.', 'error');
    }
  },

  // Populate list of discovered affine points on curve
  renderDiscoveredPoints(points) {
    const container = document.getElementById('curve-points-container');
    const countBadge = document.getElementById('points-count');
    if (!container) return;

    container.innerHTML = '';
    if (!points || points.length === 0) {
      container.innerHTML = '<span class="empty-state">No points found on this curve.</span>';
      if (countBadge) countBadge.textContent = '0';
      return;
    }

    if (countBadge) countBadge.textContent = `${points.length} affine + 𝒪`;

    points.forEach(pt => {
      const tag = document.createElement('span');
      tag.className = 'point-tag';
      const isGen = (pt[0] === this.state.Gx && pt[1] === this.state.Gy);
      if (isGen) tag.classList.add('is-gen');
      tag.textContent = `(${pt[0]}, ${pt[1]})`;
      tag.title = 'Click to set as Generator G';

      tag.addEventListener('click', () => {
        this.state.Gx = pt[0];
        this.state.Gy = pt[1];
        document.getElementById('param-gx').value = pt[0];
        document.getElementById('param-gy').value = pt[1];
        this.handleValidateCurve(false);
      });

      container.appendChild(tag);
    });
  },

  // Step 1: Generate Public Keys
  async handleGenerateKeys() {
    this.readFormInputs();
    if (!this.state.curveValid) {
      this.showToast('Please validate the curve and generator point first!', 'error');
      this.navigateTo('curve-setup');
      return;
    }

    try {
      const res = await fetch('/api/generate_keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          a: this.state.a,
          b: this.state.b,
          p: this.state.p,
          Gx: this.state.Gx,
          Gy: this.state.Gy,
          alice_private: this.state.alice_private,
          bob_private: this.state.bob_private
        })
      });

      const data = await res.json();
      if (data.success) {
        this.state.alice_public = data.alice_public;
        this.state.bob_public = data.bob_public;

        // Render Public Keys
        document.getElementById('alice-public-key-display').textContent = `(${data.alice_public[0]}, ${data.alice_public[1]})`;
        document.getElementById('bob-public-key-display').textContent = `(${data.bob_public[0]}, ${data.bob_public[1]})`;

        // Enable Shared Secret button
        const computeBtn = document.getElementById('btn-compute-shared');
        if (computeBtn) computeBtn.disabled = false;

        // Animate transmission arrows
        const pillA = document.getElementById('pill-alice-to-bob');
        const pillB = document.getElementById('pill-bob-to-alice');
        pillA?.classList.add('active');
        pillB?.classList.add('active');

        this.updateDashboardCards();
        this.drawCanvas();
        this.showToast('Public keys successfully generated using backend ECC logic!', 'success');
      } else {
        this.showToast(data.error || 'Failed to generate public keys', 'error');
      }
    } catch (err) {
      console.error(err);
      this.showToast('Network error while generating public keys', 'error');
    }
  },

  // Step 2: Compute Shared Secrets
  async handleComputeShared() {
    if (!this.state.alice_public || !this.state.bob_public) {
      this.showToast('Please generate public keys first!', 'error');
      return;
    }

    try {
      const res = await fetch('/api/compute_shared_secret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          a: this.state.a,
          p: this.state.p,
          alice_private: this.state.alice_private,
          bob_private: this.state.bob_private,
          alice_public: this.state.alice_public,
          bob_public: this.state.bob_public
        })
      });

      const data = await res.json();
      if (data.success) {
        this.state.alice_shared = data.alice_shared;
        this.state.bob_shared = data.bob_shared;
        this.state.matched = data.matched;

        // Display results
        document.getElementById('alice-shared-secret-display').textContent = data.alice_shared ? `(${data.alice_shared[0]}, ${data.alice_shared[1]})` : 'Point at Infinity';
        document.getElementById('bob-shared-secret-display').textContent = data.bob_shared ? `(${data.bob_shared[0]}, ${data.bob_shared[1]})` : 'Point at Infinity';

        const banner = document.getElementById('ecdh-verification-banner');
        const icon = document.getElementById('ecdh-result-icon');
        const title = document.getElementById('ecdh-result-title');
        const desc = document.getElementById('ecdh-result-desc');
        const cta = document.getElementById('ecdh-viz-cta-container');

        if (data.matched) {
          banner.className = 'card verification-result-banner success';
          icon.textContent = '✓';
          title.textContent = 'KEY EXCHANGE SUCCESSFUL';
          desc.textContent = `Alice and Bob derived the identical shared secret point (${data.alice_shared[0]}, ${data.alice_shared[1]}). The Diffie-Hellman property d_A · (d_B · G) == d_B · (d_A · G) is satisfied!`;
          cta.style.display = 'block';
          this.showToast('✓ Key Exchange Successful! Shared secrets match.', 'success');
        } else {
          banner.className = 'card verification-result-banner failed';
          icon.textContent = '✕';
          title.textContent = 'KEY EXCHANGE FAILED';
          desc.textContent = 'The derived shared secrets do not match or evaluated to Point at Infinity.';
          cta.style.display = 'none';
          this.showToast('✕ Key Exchange Failed! Secrets do not match.', 'error');
        }

        // Also fetch full simulation in background so visualizer and math traces are complete
        this.fetchFullSimulation();
        this.updateDashboardCards();
        this.drawCanvas();
      } else {
        this.showToast(data.error || 'Failed to compute shared secret', 'error');
      }
    } catch (err) {
      console.error(err);
      this.showToast('Network error while computing shared secret', 'error');
    }
  },

  // Run full simulation in one shot
  async handleRunFullSimulation(navToViz = false) {
    this.readFormInputs();
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          a: this.state.a,
          b: this.state.b,
          p: this.state.p,
          Gx: this.state.Gx,
          Gy: this.state.Gy,
          alice_private: this.state.alice_private,
          bob_private: this.state.bob_private
        })
      });

      const data = await res.json();
      if (data.success) {
        this.state.curveValid = true;
        this.state.allPoints = data.all_points || [];
        this.state.alice_public = data.keys.alice_public;
        this.state.bob_public = data.keys.bob_public;
        this.state.alice_shared = data.shared_secrets.alice_shared;
        this.state.bob_shared = data.shared_secrets.bob_shared;
        this.state.matched = data.shared_secrets.matched;
        this.state.traces = data.traces;

        // Update UI
        document.getElementById('alice-public-key-display').textContent = `(${data.keys.alice_public[0]}, ${data.keys.alice_public[1]})`;
        document.getElementById('bob-public-key-display').textContent = `(${data.keys.bob_public[0]}, ${data.keys.bob_public[1]})`;
        document.getElementById('alice-shared-secret-display').textContent = `(${data.shared_secrets.alice_shared[0]}, ${data.shared_secrets.alice_shared[1]})`;
        document.getElementById('bob-shared-secret-display').textContent = `(${data.shared_secrets.bob_shared[0]}, ${data.shared_secrets.bob_shared[1]})`;

        const banner = document.getElementById('ecdh-verification-banner');
        banner.className = 'card verification-result-banner success';
        document.getElementById('ecdh-result-icon').textContent = '✓';
        document.getElementById('ecdh-result-title').textContent = 'KEY EXCHANGE SUCCESSFUL';
        document.getElementById('ecdh-result-desc').textContent = `Shared secret derived: (${data.shared_secrets.alice_shared[0]}, ${data.shared_secrets.alice_shared[1]}).`;
        document.getElementById('ecdh-viz-cta-container').style.display = 'block';

        const computeBtn = document.getElementById('btn-compute-shared');
        if (computeBtn) computeBtn.disabled = false;

        document.getElementById('pill-alice-to-bob')?.classList.add('active');
        document.getElementById('pill-bob-to-alice')?.classList.add('active');

        this.renderDiscoveredPoints(data.all_points);
        this.updateDashboardCards();
        this.updateVizSlideContent();
        this.drawCanvas();

        if (navToViz) {
          this.navigateTo('visualization');
          this.goToVizStep(1);
        }

        this.showToast('Full ECDH simulation calculated with backend logic!', 'success');
      } else {
        this.showToast(data.error || 'Simulation error', 'error');
      }
    } catch (err) {
      console.error(err);
      this.showToast('Network error during simulation', 'error');
    }
  },

  // Ensure real simulation data is loaded
  async ensureSimulationData() {
    this.readFormInputs();
    if (!this.state.traces || !this.state.alice_public || !this.state.bob_public) {
      await this.fetchFullSimulation();
    }
  },

  // Fetch full simulation behind the scenes to populate traces
  async fetchFullSimulation() {
    this.readFormInputs();
    try {
      const res = await fetch('/api/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          a: this.state.a,
          b: this.state.b,
          p: this.state.p,
          Gx: this.state.Gx,
          Gy: this.state.Gy,
          alice_private: this.state.alice_private,
          bob_private: this.state.bob_private
        })
      });
      const data = await res.json();
      if (data.success) {
        this.state.curveValid = true;
        this.state.allPoints = data.all_points || [];
        this.state.alice_public = data.keys.alice_public;
        this.state.bob_public = data.keys.bob_public;
        this.state.alice_shared = data.shared_secrets.alice_shared;
        this.state.bob_shared = data.shared_secrets.bob_shared;
        this.state.matched = data.shared_secrets.matched;
        this.state.traces = data.traces;
        this.updateVizSlideContent();
        this.drawCanvas();
      }
    } catch (e) {
      console.warn("Could not fetch simulation traces:", e);
    }
  },

  // Update Dashboard Summary Cards
  updateDashboardCards() {
    const eq = `y² = x³ + ${this.state.a}x + ${this.state.b} (mod ${this.state.p})`;
    const gen = `(${this.state.Gx}, ${this.state.Gy})`;

    document.getElementById('dash-card-curve').textContent = eq;
    document.getElementById('dash-card-generator').textContent = gen;

    // Alice Pub
    const alicePubElem = document.getElementById('dash-card-alice-pub');
    if (this.state.alice_public) {
      alicePubElem.innerHTML = `<span class="text-emerald">(${this.state.alice_public[0]}, ${this.state.alice_public[1]})</span>`;
    } else {
      alicePubElem.innerHTML = '<span class="empty-state">Not calculated</span>';
    }

    // Bob Pub
    const bobPubElem = document.getElementById('dash-card-bob-pub');
    if (this.state.bob_public) {
      bobPubElem.innerHTML = `<span class="text-orange">(${this.state.bob_public[0]}, ${this.state.bob_public[1]})</span>`;
    } else {
      bobPubElem.innerHTML = '<span class="empty-state">Not calculated</span>';
    }

    // Shared Secret
    const sharedElem = document.getElementById('dash-card-shared');
    if (this.state.alice_shared && this.state.matched) {
      sharedElem.innerHTML = `<strong class="text-emerald">(${this.state.alice_shared[0]}, ${this.state.alice_shared[1]})</strong>`;
    } else {
      sharedElem.innerHTML = '<span class="empty-state">Not calculated</span>';
    }

    // Status Pill
    const statusElem = document.getElementById('dash-card-status');
    const statusSub = document.getElementById('dash-card-status-sub');
    const sideDot = document.getElementById('sidebar-status-dot');
    const sideText = document.getElementById('sidebar-status-text');

    if (this.state.matched === true) {
      statusElem.innerHTML = '<span class="status-pill status-success">✓ Key Exchange Successful</span>';
      statusSub.textContent = 'Shared secret derived successfully';
      if (sideDot) sideDot.style.backgroundColor = '#059669';
      if (sideText) sideText.textContent = 'Key Exchange Succeeded';
    } else if (this.state.matched === false) {
      statusElem.innerHTML = '<span class="status-pill status-failed">✕ Key Exchange Failed</span>';
      statusSub.textContent = 'Shared secrets did not match';
      if (sideDot) sideDot.style.backgroundColor = '#dc2626';
      if (sideText) sideText.textContent = 'Exchange Mismatch';
    } else if (this.state.alice_public && this.state.bob_public) {
      statusElem.innerHTML = '<span class="status-pill status-valid">Public Keys Generated</span>';
      statusSub.textContent = 'Ready to compute shared secret';
      if (sideDot) sideDot.style.backgroundColor = '#10b981';
      if (sideText) sideText.textContent = 'Public Keys Ready';
    } else if (this.state.curveValid) {
      statusElem.innerHTML = '<span class="status-pill status-valid">Curve Validated</span>';
      statusSub.textContent = 'Ready for key exchange';
      if (sideDot) sideDot.style.backgroundColor = '#10b981';
      if (sideText) sideText.textContent = 'Curve Validated';
    } else {
      statusElem.innerHTML = '<span class="status-pill status-failed">Invalid Parameters</span>';
      statusSub.textContent = 'Check curve setup';
      if (sideDot) sideDot.style.backgroundColor = '#f97316';
      if (sideText) sideText.textContent = 'Invalid Setup';
    }
  },

  // =========================================================
  // 8-STAGE VISUALIZER & ECDH SIMULATION CONTROLLER
  // =========================================================

  // Clear all pending visualizer timers cleanly (prevents ghost/duplicate animations)
  clearAllVizTimers() {
    if (this.state.playInterval) {
      clearInterval(this.state.playInterval);
      this.state.playInterval = null;
    }
    if (this.state.animationTimers && this.state.animationTimers.length > 0) {
      this.state.animationTimers.forEach(id => clearTimeout(id));
      this.state.animationTimers = [];
    }
  },

  // Synchronize Play/Pause button states across top and bottom controls
  updatePlayPauseButtons(isPlaying) {
    const playTop = document.getElementById('btn-viz-play');
    const pauseTop = document.getElementById('btn-viz-pause');
    const playBtm = document.getElementById('btn-viz-play-bottom');
    const pauseBtm = document.getElementById('btn-viz-pause-bottom');

    if (playTop) playTop.style.display = isPlaying ? 'none' : 'inline-flex';
    if (pauseTop) pauseTop.style.display = isPlaying ? 'inline-flex' : 'none';
    if (playBtm) playBtm.style.display = isPlaying ? 'none' : 'inline-flex';
    if (pauseBtm) pauseBtm.style.display = isPlaying ? 'inline-flex' : 'none';
  },

  // Main 8-Stage Step Navigator
  goToVizStep(stepNum) {
    if (stepNum < 1) stepNum = 1;
    if (stepNum > 8) stepNum = 8;

    this.clearAllVizTimers();
    this.state.vizStep = stepNum;

    const titles = [
      "Input Parameters",
      "Curve Validation & Non-Singularity",
      "Generator Point Verification",
      "Alice Public Key Generation (A = d_A × G)",
      "Bob Public Key Generation (B = d_B × G)",
      "Public Key Exchange",
      "Parallel Shared Secret Derivation",
      "Cryptographic Verification & Key Agreement"
    ];

    const statusMessages = [
      "Active parameters loaded: Curve equation, base point G, and private keys.",
      "Validating prime field and Weierstrass non-singularity condition (Δ ≠ 0)...",
      "Verifying that generator point G satisfies the Weierstrass curve equation...",
      "Alice is generating her public key using scalar multiplication A = d_A × G...",
      "Bob is generating his public key using scalar multiplication B = d_B × G...",
      "Initiating public key exchange over insecure communication channel...",
      "Both participants are calculating the shared secret independently: S_A = d_A × B and S_B = d_B × A...",
      "Key exchange successful: Both parties derived identical shared secret point S!"
    ];

    // Update Counter & Titles (Top and Bottom)
    const counterText = `Step ${stepNum} of 8`;
    const titleText = titles[stepNum - 1];

    const topCounter = document.getElementById('viz-step-counter');
    const topTitle = document.getElementById('viz-step-title');
    const btmBadge = document.getElementById('viz-bottom-step-badge');
    const btmTitle = document.getElementById('viz-bottom-step-title');

    if (topCounter) topCounter.textContent = counterText;
    if (topTitle) topTitle.textContent = titleText;
    if (btmBadge) btmBadge.textContent = counterText;
    if (btmTitle) btmTitle.textContent = titleText;

    // Update Live Status Message
    const statusMsg = document.getElementById('viz-live-status-message');
    if (statusMsg) statusMsg.textContent = statusMessages[stepNum - 1];

    // Update Timeline Stepper Bubbles (8 steps)
    document.querySelectorAll('.timeline-step').forEach(stepEl => {
      const s = parseInt(stepEl.getAttribute('data-step'), 10);
      stepEl.classList.remove('active', 'completed');
      if (s === stepNum) {
        stepEl.classList.add('active');
      } else if (s < stepNum) {
        stepEl.classList.add('completed');
      }
    });

    // Toggle 8 stage slide displays
    for (let i = 1; i <= 8; i++) {
      const slide = document.getElementById(`stage-slide-${i}`);
      if (slide) {
        slide.style.display = (i === stepNum) ? 'block' : 'none';
      }
    }

    // Update central simulation elements (Alice/Bob pods, packets, shared hub)
    this.updateSimulationArea(stepNum);

    // Update detailed slide textual data
    this.updateVizSlideContent();

    // Update mathematical trace for this active stage
    this.renderCurrentStageMath(stepNum);

    // Retypeset math on stage card
    const stageCard = document.getElementById('viz-active-stage-card');
    if (stageCard) setTimeout(() => this.retypeset(stageCard), 40);

    // Retypeset math on math tab
    const mathCard = document.getElementById('stage-math-tab');
    if (mathCard) setTimeout(() => this.retypeset(mathCard), 40);

    // Redraw canvas with dynamic highlights for this stage
    this.drawCanvas();

    // Auto-advance logic when simulation is Playing
    if (this.state.isPlaying) {
      if (stepNum === 6) {
        // Stage 6 has its own sequential packet animation
        this.animateStage6(() => {
          if (this.state.isPlaying) {
            const t = setTimeout(() => {
              if (this.state.isPlaying) this.goToVizStep(7);
            }, 1200);
            this.state.animationTimers.push(t);
          }
        });
      } else if (stepNum < 8) {
        // Timings tailored per stage for comfortable readability
        const delay = (stepNum === 4 || stepNum === 5) ? 3000 : 2500;
        const nextTimer = setTimeout(() => {
          if (this.state.isPlaying) {
            this.goToVizStep(stepNum + 1);
          }
        }, delay);
        this.state.animationTimers.push(nextTimer);
      } else {
        // Reached end of simulation (Stage 8)
        const endTimer = setTimeout(() => {
          this.pauseViz();
        }, 3000);
        this.state.animationTimers.push(endTimer);
      }
    } else {
      // If user stepped into Stage 6 manually, run the packet transit visually without auto-advance
      if (stepNum === 6) {
        this.animateStage6();
      }
    }
  },

  // Update Alice/Bob pods, central wire, packets, and shared secret hub
  updateSimulationArea(stepNum) {
    const { a, b, p, Gx, Gy, alice_private, bob_private, alice_public, bob_public, alice_shared, bob_shared, matched } = this.state;

    const alicePod = document.getElementById('alice-sim-pod');
    const bobPod = document.getElementById('bob-sim-pod');
    const hub = document.getElementById('shared-secret-hub');
    const hubVerifyBox = document.getElementById('hub-verification-box');
    const opBadge = document.getElementById('hub-op-badge');
    const opSymbol = document.getElementById('hub-op-symbol');

    // 1. Pod Active Highlights
    if (alicePod) {
      if (stepNum === 4 || stepNum === 7 || stepNum === 8) {
        alicePod.classList.add('active-pod');
      } else {
        alicePod.classList.remove('active-pod');
      }
    }

    if (bobPod) {
      if (stepNum === 5 || stepNum === 7 || stepNum === 8) {
        bobPod.classList.add('active-pod');
      } else {
        bobPod.classList.remove('active-pod');
      }
    }

    // 2. Private Key Vaults (Always local and secure)
    const simAlicePriv = document.getElementById('sim-alice-priv');
    const simBobPriv = document.getElementById('sim-bob-priv');
    if (simAlicePriv) simAlicePriv.textContent = alice_private;
    if (simBobPriv) simBobPriv.textContent = bob_private;

    // 3. Public Keys in Pods
    const simAlicePub = document.getElementById('sim-alice-pub');
    const alicePubBadge = document.getElementById('alice-pub-badge');
    const aliceTraceVal = document.getElementById('alice-trace-val');

    if (simAlicePub) {
      if (stepNum >= 4 && alice_public) {
        simAlicePub.textContent = `(${alice_public[0]}, ${alice_public[1]})`;
        if (alicePubBadge) {
          alicePubBadge.textContent = "Generated ✓";
          alicePubBadge.className = "pub-status-badge ready";
        }
        if (aliceTraceVal) {
          aliceTraceVal.textContent = `d_A · G = ${alice_private} · (${Gx}, ${Gy}) = (${alice_public[0]}, ${alice_public[1]})`;
        }
      } else {
        simAlicePub.textContent = "(Awaiting Calc)";
        if (alicePubBadge) {
          alicePubBadge.textContent = "Awaiting Calc";
          alicePubBadge.className = "pub-status-badge";
        }
        if (aliceTraceVal) aliceTraceVal.textContent = "G → 2G → ... → A";
      }
    }

    const simBobPub = document.getElementById('sim-bob-pub');
    const bobPubBadge = document.getElementById('bob-pub-badge');
    const bobTraceVal = document.getElementById('bob-trace-val');

    if (simBobPub) {
      if (stepNum >= 5 && bob_public) {
        simBobPub.textContent = `(${bob_public[0]}, ${bob_public[1]})`;
        if (bobPubBadge) {
          bobPubBadge.textContent = "Generated ✓";
          bobPubBadge.className = "pub-status-badge ready";
        }
        if (bobTraceVal) {
          bobTraceVal.textContent = `d_B · G = ${bob_private} · (${Gx}, ${Gy}) = (${bob_public[0]}, ${bob_public[1]})`;
        }
      } else {
        simBobPub.textContent = "(Awaiting Calc)";
        if (bobPubBadge) {
          bobPubBadge.textContent = "Awaiting Calc";
          bobPubBadge.className = "pub-status-badge";
        }
        if (bobTraceVal) bobTraceVal.textContent = "G → 2G → ... → B";
      }
    }

    // 4. Shared Secret Cards in Pods
    const simAliceSecret = document.getElementById('sim-alice-secret');
    const simBobSecret = document.getElementById('sim-bob-secret');
    const aliceSecBadge = document.getElementById('alice-secret-badge');
    const bobSecBadge = document.getElementById('bob-secret-badge');

    if (simAliceSecret) {
      if (stepNum >= 7 && alice_shared) {
        simAliceSecret.textContent = `(${alice_shared[0]}, ${alice_shared[1]})`;
        if (aliceSecBadge) {
          aliceSecBadge.textContent = "Derived ✓";
          aliceSecBadge.className = "secret-calc-badge ready";
        }
      } else {
        simAliceSecret.textContent = "Awaiting Key B";
        if (aliceSecBadge) {
          aliceSecBadge.textContent = "Awaiting Key B";
          aliceSecBadge.className = "secret-calc-badge";
        }
      }
    }

    if (simBobSecret) {
      if (stepNum >= 7 && bob_shared) {
        simBobSecret.textContent = `(${bob_shared[0]}, ${bob_shared[1]})`;
        if (bobSecBadge) {
          bobSecBadge.textContent = "Derived ✓";
          bobSecBadge.className = "secret-calc-badge ready";
        }
      } else {
        simBobSecret.textContent = "Awaiting Key A";
        if (bobSecBadge) {
          bobSecBadge.textContent = "Awaiting Key A";
          bobSecBadge.className = "secret-calc-badge";
        }
      }
    }

    // 5. Packet Coordinates on Channel
    const packetAliceCoords = document.getElementById('packet-alice-coords');
    const packetBobCoords = document.getElementById('packet-bob-coords');
    if (packetAliceCoords) {
      packetAliceCoords.textContent = alice_public ? `A = (${alice_public[0]}, ${alice_public[1]})` : 'A = (?, ?)';
    }
    if (packetBobCoords) {
      packetBobCoords.textContent = bob_public ? `B = (${bob_public[0]}, ${bob_public[1]})` : 'B = (?, ?)';
    }

    // 6. Packet Positions & Pills (Non-Stage-6 static positioning)
    const packetA = document.getElementById('packet-alice');
    const packetB = document.getElementById('packet-bob');
    const pillBob = document.getElementById('delivery-pill-bob');
    const pillAlice = document.getElementById('delivery-pill-alice');

    if (stepNum < 6) {
      if (packetA) {
        packetA.style.transition = 'none';
        packetA.style.left = '0%';
      }
      if (packetB) {
        packetB.style.transition = 'none';
        packetB.style.right = '0%';
      }
      if (pillBob) {
        pillBob.textContent = 'Awaiting Dispatch';
        pillBob.className = 'delivery-pill';
      }
      if (pillAlice) {
        pillAlice.textContent = 'Awaiting Dispatch';
        pillAlice.className = 'delivery-pill';
      }
    } else if (stepNum > 6) {
      if (packetA) {
        packetA.style.transition = 'none';
        packetA.style.left = 'calc(100% - 160px)';
      }
      if (packetB) {
        packetB.style.transition = 'none';
        packetB.style.right = 'calc(100% - 160px)';
      }
      if (pillBob) {
        pillBob.textContent = '✓ Received by Bob';
        pillBob.className = 'delivery-pill delivered';
      }
      if (pillAlice) {
        pillAlice.textContent = '✓ Received by Alice';
        pillAlice.className = 'delivery-pill delivered';
      }
    }

    // 7. Shared Secret Convergence Hub
    const hubAliceVal = document.getElementById('hub-alice-val');
    const hubBobVal = document.getElementById('hub-bob-val');
    const hubFinalPoint = document.getElementById('hub-final-point-coord');

    if (hubAliceVal) {
      hubAliceVal.textContent = (stepNum >= 7 && alice_shared) ? `(${alice_shared[0]}, ${alice_shared[1]})` : '(?, ?)';
    }
    if (hubBobVal) {
      hubBobVal.textContent = (stepNum >= 7 && bob_shared) ? `(${bob_shared[0]}, ${bob_shared[1]})` : '(?, ?)';
    }
    if (hubFinalPoint) {
      hubFinalPoint.textContent = (stepNum >= 7 && alice_shared) ? `S = (${alice_shared[0]}, ${alice_shared[1]})` : 'S = (?, ?)';
    }

    if (stepNum >= 7) {
      if (hub) hub.classList.add('active-hub');
      if (stepNum === 7) {
        if (opBadge) opBadge.textContent = "COMPARE";
        if (opSymbol) opSymbol.textContent = "≟";
        if (hubVerifyBox) hubVerifyBox.classList.remove('show');
      } else if (stepNum === 8) {
        if (opBadge) opBadge.textContent = "VERIFIED";
        if (opSymbol) opSymbol.textContent = "=";
        if (hubVerifyBox) hubVerifyBox.classList.add('show');
      }
    } else {
      if (hub) hub.classList.remove('active-hub');
      if (opBadge) opBadge.textContent = "IDLE";
      if (opSymbol) opSymbol.textContent = "···";
      if (hubVerifyBox) hubVerifyBox.classList.remove('show');
    }
  },

  // STAGE 6 — MAIN KEY PACKET ANIMATION
  // Physically moves Key Packet A across to Bob, then Packet B across to Alice
  animateStage6(onComplete) {
    const packetA = document.getElementById('packet-alice');
    const packetB = document.getElementById('packet-bob');
    const pillBob = document.getElementById('delivery-pill-bob');
    const pillAlice = document.getElementById('delivery-pill-alice');
    const statusMsg = document.getElementById('viz-live-status-message');

    // 1. Reset packets to starting ends
    if (packetA) {
      packetA.style.transition = 'none';
      packetA.style.left = '0%';
    }
    if (packetB) {
      packetB.style.transition = 'none';
      packetB.style.right = '0%';
    }
    if (pillBob) {
      pillBob.textContent = 'Awaiting Dispatch';
      pillBob.className = 'delivery-pill';
    }
    if (pillAlice) {
      pillAlice.textContent = 'Awaiting Dispatch';
      pillAlice.className = 'delivery-pill';
    }

    if (packetA) void packetA.offsetWidth; // force browser layout flush

    // 2. Dispatch Packet A: Alice -> Bob
    const t1 = setTimeout(() => {
      if (statusMsg) statusMsg.textContent = "Alice is sending her public key to Bob...";
      if (pillBob) {
        pillBob.textContent = "In Transit...";
        pillBob.className = "delivery-pill in-transit";
      }
      if (packetA) {
        packetA.style.transition = 'left 1.8s cubic-bezier(0.4, 0, 0.2, 1)';
        packetA.style.left = 'calc(100% - 160px)';
      }
    }, 250);
    this.state.animationTimers.push(t1);

    // 3. Packet A Arrives at Bob
    const t2 = setTimeout(() => {
      if (statusMsg) statusMsg.textContent = "Bob received Alice's public key.";
      if (pillBob) {
        pillBob.textContent = "✓ Delivered to Bob";
        pillBob.className = "delivery-pill delivered";
      }
    }, 2100);
    this.state.animationTimers.push(t2);

    // 4. Dispatch Packet B: Bob -> Alice
    const t3 = setTimeout(() => {
      if (statusMsg) statusMsg.textContent = "Bob is sending his public key to Alice...";
      if (pillAlice) {
        pillAlice.textContent = "In Transit...";
        pillAlice.className = "delivery-pill in-transit";
      }
      if (packetB) {
        packetB.style.transition = 'right 1.8s cubic-bezier(0.4, 0, 0.2, 1)';
        packetB.style.right = 'calc(100% - 160px)';
      }
    }, 2800);
    this.state.animationTimers.push(t3);

    // 5. Packet B Arrives at Alice
    const t4 = setTimeout(() => {
      if (statusMsg) statusMsg.textContent = "Alice received Bob's public key. Public keys successfully exchanged!";
      if (pillAlice) {
        pillAlice.textContent = "✓ Delivered to Alice";
        pillAlice.className = "delivery-pill delivered";
      }
      if (onComplete) onComplete();
    }, 4700);
    this.state.animationTimers.push(t4);
  },

  // Play continuous simulation
  playViz() {
    this.state.isPlaying = true;
    this.updatePlayPauseButtons(true);
    if (this.state.vizStep >= 8) {
      this.goToVizStep(1);
    } else {
      this.goToVizStep(this.state.vizStep);
    }
  },

  // Pause simulation
  pauseViz() {
    this.state.isPlaying = false;
    this.clearAllVizTimers();
    this.updatePlayPauseButtons(false);
  },

  // Step forward
  nextVizStep() {
    this.pauseViz();
    if (this.state.vizStep < 8) {
      this.goToVizStep(this.state.vizStep + 1);
    }
  },

  // Step backward
  prevVizStep() {
    this.pauseViz();
    if (this.state.vizStep > 1) {
      this.goToVizStep(this.state.vizStep - 1);
    }
  },

  // Fill in live data for each stage slide
  updateVizSlideContent() {
    const { a, b, p, Gx, Gy, alice_private, bob_private, alice_public, bob_public, alice_shared, bob_shared, matched } = this.state;
    const eq = `y² ≡ x³ + ${a}x + ${b} (mod ${p})`;

    // Stage 1
    const s1a = document.getElementById('stage1-a');
    const s1b = document.getElementById('stage1-b');
    const s1p = document.getElementById('stage1-p');
    const s1eq = document.getElementById('stage1-eq');
    const s1g = document.getElementById('stage1-g');
    const s1da = document.getElementById('stage1-da');
    const s1db = document.getElementById('stage1-db');

    if (s1a) s1a.textContent = a;
    if (s1b) s1b.textContent = b;
    if (s1p) s1p.textContent = p;
    if (s1eq) s1eq.textContent = eq;
    if (s1g) s1g.textContent = `(${Gx}, ${Gy})`;
    if (s1da) s1da.textContent = alice_private;
    if (s1db) s1db.textContent = bob_private;

    // Stage 2
    const disc = (4 * Math.pow(a, 3) + 27 * Math.pow(b, 2)) % p;
    const s2Title = document.getElementById('stage2-status-title');
    const s2Desc = document.getElementById('stage2-status-desc');
    const s2Form = document.getElementById('stage2-formula-detail');

    if (s2Title && s2Desc && s2Form) {
      if (disc !== 0) {
        s2Title.textContent = "Prime Field & Non-Singular Curve Confirmed";
        s2Desc.textContent = `Discriminant Δ = 4a³ + 27b² ≡ ${disc} (mod ${p}) ≠ 0. The curve possesses well-defined tangent lines everywhere with no cusps.`;
        s2Form.innerHTML = `4(${a})³ + 27(${b})² = ${4 * Math.pow(a, 3) + 27 * Math.pow(b, 2)} ≡ ${disc} (mod ${p}) ≠ 0`;
      } else {
        s2Title.textContent = "Warning: Curve is Singular!";
        s2Desc.textContent = `Discriminant Δ ≡ 0 (mod ${p}). Singular curves are cryptographically insecure.`;
      }
    }

    // Stage 3
    const lhs = (Gy * Gy) % p;
    const rhs = (Math.pow(Gx, 3) + a * Gx + b) % p;
    const s3Sub = document.getElementById('stage3-substitution');
    if (s3Sub) {
      s3Sub.innerHTML = `
        <strong>Weierstrass check:</strong> y² ≟ x³ + ax + b (mod p)<br>
        LHS = ${Gy}² = ${Gy * Gy} ≡ <strong>${lhs} (mod ${p})</strong><br>
        RHS = ${Gx}³ + ${a}(${Gx}) + ${b} = ${Math.pow(Gx, 3) + a * Gx + b} ≡ <strong>${rhs} (mod ${p})</strong><br>
        ${lhs === rhs ? `<span class="text-success font-weight-bold">✓ LHS ≡ RHS (${lhs} ≡ ${rhs}) — Generator point (${Gx}, ${Gy}) is VALID!</span>` : `<span class="text-orange font-weight-bold">✕ LHS ≠ RHS (${lhs} ≠ ${rhs}) — Point is NOT on curve!</span>`}
      `;
    }

    // Stage 4: Alice Pub
    const s4da = document.getElementById('stage4-da');
    const s4g = document.getElementById('stage4-g');
    const s4pub = document.getElementById('stage4-pub');
    if (s4da) s4da.textContent = alice_private;
    if (s4g) s4g.textContent = `(${Gx}, ${Gy})`;
    if (s4pub) s4pub.textContent = alice_public ? `(${alice_public[0]}, ${alice_public[1]})` : 'Awaiting computation';

    // Stage 5: Bob Pub
    const s5db = document.getElementById('stage5-db');
    const s5g = document.getElementById('stage5-g');
    const s5pub = document.getElementById('stage5-pub');
    if (s5db) s5db.textContent = bob_private;
    if (s5g) s5g.textContent = `(${Gx}, ${Gy})`;
    if (s5pub) s5pub.textContent = bob_public ? `(${bob_public[0]}, ${bob_public[1]})` : 'Awaiting computation';

    // Stage 6: Packet Labels
    const s6a = document.getElementById('stage6-packet-a');
    const s6b = document.getElementById('stage6-packet-b');
    if (s6a) s6a.textContent = alice_public ? `(${alice_public[0]}, ${alice_public[1]})` : '(?, ?)';
    if (s6b) s6b.textContent = bob_public ? `(${bob_public[0]}, ${bob_public[1]})` : '(?, ?)';

    // Stage 7: Parallel Derivations
    const s7apriv = document.getElementById('stage7-alice-priv');
    const s7bpub = document.getElementById('stage7-bob-pub');
    const s7ares = document.getElementById('stage7-alice-res');
    const s7bpriv = document.getElementById('stage7-bob-priv');
    const s7apub = document.getElementById('stage7-alice-pub');
    const s7bres = document.getElementById('stage7-bob-res');
    const s7aform = document.getElementById('stage7-alice-formula');
    const s7bform = document.getElementById('stage7-bob-formula');

    if (s7apriv) s7apriv.textContent = alice_private;
    if (s7bpub) s7bpub.textContent = bob_public ? `(${bob_public[0]}, ${bob_public[1]})` : '(?, ?)';
    if (s7ares) s7ares.textContent = alice_shared ? `(${alice_shared[0]}, ${alice_shared[1]})` : 'Not computed';
    if (s7bpriv) s7bpriv.textContent = bob_private;
    if (s7apub) s7apub.textContent = alice_public ? `(${alice_public[0]}, ${alice_public[1]})` : '(?, ?)';
    if (s7bres) s7bres.textContent = bob_shared ? `(${bob_shared[0]}, ${bob_shared[1]})` : 'Not computed';

    if (s7aform && bob_public) {
      s7aform.innerHTML = `\\(S_A = d_A \\times B = ${alice_private} \\times (${bob_public[0]}, ${bob_public[1]})\\)`;
    }
    if (s7bform && alice_public) {
      s7bform.innerHTML = `\\(S_B = d_B \\times A = ${bob_private} \\times (${alice_public[0]}, ${alice_public[1]})\\)`;
    }

    // Stage 8: Verification
    const s8MatchBox = document.getElementById('stage8-match-callout');
    const s8Icon = document.getElementById('stage8-icon');
    const s8Title = document.getElementById('stage8-match-title');
    const s8Desc = document.getElementById('stage8-match-desc');
    const s8Alice = document.getElementById('stage8-alice-val');
    const s8Bob = document.getElementById('stage8-bob-val');
    const s8FinalBox = document.getElementById('stage8-final-point-box');

    if (s8MatchBox && s8Alice && s8Bob && s8FinalBox) {
      if (matched === true && alice_shared) {
        s8MatchBox.className = 'stage-callout stage-match';
        if (s8Icon) s8Icon.textContent = '✓';
        if (s8Title) s8Title.textContent = 'KEY EXCHANGE SUCCESSFUL';
        if (s8Desc) s8Desc.textContent = 'Both Alice and Bob arrived at the exact same point on the elliptic curve.';
        s8Alice.textContent = `(${alice_shared[0]}, ${alice_shared[1]})`;
        s8Bob.textContent = `(${bob_shared[0]}, ${bob_shared[1]})`;
        s8FinalBox.innerHTML = `Agreed Shared Secret Point: <strong>(${alice_shared[0]}, ${alice_shared[1]})</strong>`;
      } else if (matched === false) {
        s8MatchBox.className = 'stage-callout stage-callout-failed';
        if (s8Icon) s8Icon.textContent = '✕';
        if (s8Title) s8Title.textContent = 'NOT MATCHED — KEY EXCHANGE FAILED';
        if (s8Desc) s8Desc.textContent = 'The two derived points differ or evaluated to Point at Infinity.';
        s8Alice.textContent = alice_shared ? `(${alice_shared[0]}, ${alice_shared[1]})` : 'None';
        s8Bob.textContent = bob_shared ? `(${bob_shared[0]}, ${bob_shared[1]})` : 'None';
        s8FinalBox.innerHTML = 'Shared Secret: <strong class="text-orange">No Agreement</strong>';
      }
    }

    // Populate concrete math tab boxes if traces exist
    this.renderMathematicalTraces();
  },

  // Render concrete numerical steps into math tabs
  renderMathematicalTraces() {
    if (!this.state.traces) return;

    // 1. Point Doubling (e.g. 2 * G)
    const dblContainer = document.getElementById('concrete-doubling-details');
    if (dblContainer && this.state.traces.alice_pub_steps) {
      const step0 = this.state.traces.alice_pub_steps[0];
      if (step0 && step0.double_trace && step0.double_trace.type === 'doubling') {
        const dt = step0.double_trace;
        dblContainer.innerHTML = `
          <div class="calc-step-card">
            <h6>Doubling Generator Point G = (${dt.x1}, ${dt.y1}) to find 2G:</h6>
            <div class="calc-step-detail">
              <strong>1. Slope (m):</strong><br>
              Formula: m = (3x₁² + a) / (2y₁) mod p<br>
              Substitution: m = (3·${dt.x1}² + ${this.state.a}) / (2·${dt.y1}) mod ${this.state.p}<br>
              Numerator: (3·${dt.x1 * dt.x1} + ${this.state.a}) = ${dt.raw_numerator} ≡ ${dt.numerator} (mod ${this.state.p})<br>
              Denominator: 2·${dt.y1} = ${dt.raw_denominator} ≡ ${dt.denominator} (mod ${this.state.p})<br>
              Modular Inverse of ${dt.denominator} mod ${this.state.p} = <strong>${dt.inverse}</strong><br>
              m = (${dt.numerator} · ${dt.inverse}) mod ${this.state.p} = <strong>${dt.slope}</strong><br><br>
              <strong>2. Resulting X Coordinate (x₃):</strong><br>
              x₃ = (m² - 2x₁) mod p<br>
              x₃ = (${dt.slope}² - 2·${dt.x1}) mod ${this.state.p} = (${dt.slope * dt.slope} - ${2 * dt.x1}) mod ${this.state.p} = <strong>${dt.x3}</strong><br><br>
              <strong>3. Resulting Y Coordinate (y₃):</strong><br>
              y₃ = (m(x₁ - x₃) - y₁) mod p<br>
              y₃ = (${dt.slope}(${dt.x1} - ${dt.x3}) - ${dt.y1}) mod ${this.state.p} = <strong>${dt.y3}</strong><br><br>
              <strong>Result: 2G = (${dt.x3}, ${dt.y3})</strong>
            </div>
          </div>
        `;
      }
    }

    // 2. Point Addition (e.g. G + 2G = 3G)
    const addContainer = document.getElementById('concrete-addition-details');
    if (addContainer && this.state.traces.alice_pub_steps) {
      let addTrace = null;
      for (const st of this.state.traces.alice_pub_steps) {
        if (st.add_trace && st.add_trace.type === 'addition') {
          addTrace = st.add_trace;
          break;
        }
      }

      if (addTrace) {
        const at = addTrace;
        addContainer.innerHTML = `
          <div class="calc-step-card">
            <h6>Adding P = (${at.x1}, ${at.y1}) and Q = (${at.x2}, ${at.y2}):</h6>
            <div class="calc-step-detail">
              <strong>1. Slope (m):</strong><br>
              Formula: m = (y₂ - y₁) / (x₂ - x₁) mod p<br>
              Substitution: m = (${at.y2} - ${at.y1}) / (${at.x2} - ${at.x1}) mod ${this.state.p}<br>
              Numerator: (${at.y2} - ${at.y1}) = ${at.raw_numerator} ≡ ${at.numerator} (mod ${this.state.p})<br>
              Denominator: (${at.x2} - ${at.x1}) = ${at.raw_denominator} ≡ ${at.denominator} (mod ${this.state.p})<br>
              Modular Inverse of ${at.denominator} mod ${this.state.p} = <strong>${at.inverse}</strong><br>
              m = (${at.numerator} · ${at.inverse}) mod ${this.state.p} = <strong>${at.slope}</strong><br><br>
              <strong>2. Resulting X Coordinate (x₃):</strong><br>
              x₃ = (m² - x₁ - x₂) mod p<br>
              x₃ = (${at.slope}² - ${at.x1} - ${at.x2}) mod ${this.state.p} = <strong>${at.x3}</strong><br><br>
              <strong>3. Resulting Y Coordinate (y₃):</strong><br>
              y₃ = (m(x₁ - x₃) - y₁) mod p<br>
              y₃ = (${at.slope}(${at.x1} - ${at.x3}) - ${at.y1}) mod ${this.state.p} = <strong>${at.y3}</strong><br><br>
              <strong>Result: P + Q = (${at.x3}, ${at.y3})</strong>
            </div>
          </div>
        `;
      } else {
        addContainer.innerHTML = '<div class="calc-step-card"><p>Point addition occurs when private key scalar binary bits have 1s. Change private key or view scalar trace.</p></div>';
      }
    }

    // 3. Scalar Multiplication trace (Alice scalar multiply d_A * G)
    const scalarContainer = document.getElementById('concrete-scalar-details');
    if (scalarContainer && this.state.traces.alice_pub_steps) {
      let rowsHtml = '';
      this.state.traces.alice_pub_steps.forEach((st, idx) => {
        const ptPower = st.point_power_2 ? `(${st.point_power_2[0]}, ${st.point_power_2[1]})` : 'None';
        const resPt = st.new_result ? `(${st.new_result[0]}, ${st.new_result[1]})` : 'None';
        rowsHtml += `
          <div class="trace-step-row">
            <span class="trace-step-badge">Bit ${idx} (k=${st.k_val}, bit=${st.bit})</span>
            <span>Power 2^${idx}·G: <strong>${ptPower}</strong></span>
            <span>${st.bit === 1 ? 'ADD to Accumulator' : 'Skip Add'}</span>
            <span>Accumulator: <strong class="text-emerald">${resPt}</strong></span>
          </div>
        `;
      });
      scalarContainer.innerHTML = `
        <div class="calc-step-card">
          <h6>Scalar Multiplication for Alice (d_A = ${this.state.alice_private}):</h6>
          <div class="trace-steps-container">${rowsHtml}</div>
          <p style="margin-top: 8px; font-size: 0.82rem; color: var(--text-subtle);">
            Final Public Key: A = ${this.state.alice_private} &middot; G = <strong>(${this.state.alice_public ? this.state.alice_public.join(', ') : '?'})</strong>
          </p>
        </div>
      `;
      this.retypeset(scalarContainer);
    }

    // Also populate Stage 4 and Stage 5 inline trace containers
    const stage4Trace = document.getElementById('stage4-trace-container');
    if (stage4Trace && this.state.traces.alice_pub_steps) {
      let html = '';
      this.state.traces.alice_pub_steps.forEach((st, idx) => {
        const ptPower = st.point_power_2 ? `(${st.point_power_2[0]}, ${st.point_power_2[1]})` : 'None';
        const resPt = st.new_result ? `(${st.new_result[0]}, ${st.new_result[1]})` : 'None';
        html += `
          <div class="trace-step-row">
            <span class="trace-step-badge">Bit ${idx} (bit=${st.bit})</span>
            <span>Point Power: <strong>${ptPower}</strong></span>
            <span>${st.bit === 1 ? 'Add to result' : 'Shift only'}</span>
            <span>Current Result: <strong class="text-blue">${resPt}</strong></span>
          </div>
        `;
      });
      stage4Trace.innerHTML = html;
    }

    const stage5Trace = document.getElementById('stage5-trace-container');
    if (stage5Trace && this.state.traces.bob_pub_steps) {
      let html = '';
      this.state.traces.bob_pub_steps.forEach((st, idx) => {
        const ptPower = st.point_power_2 ? `(${st.point_power_2[0]}, ${st.point_power_2[1]})` : 'None';
        const resPt = st.new_result ? `(${st.new_result[0]}, ${st.new_result[1]})` : 'None';
        html += `
          <div class="trace-step-row">
            <span class="trace-step-badge">Bit ${idx} (bit=${st.bit})</span>
            <span>Point Power: <strong>${ptPower}</strong></span>
            <span>${st.bit === 1 ? 'Add to result' : 'Shift only'}</span>
            <span>Current Result: <strong class="text-orange">${resPt}</strong></span>
          </div>
        `;
      });
      stage5Trace.innerHTML = html;
    }

    const addC = document.getElementById('concrete-addition-details');
    if (addC) this.retypeset(addC);
    const dblC = document.getElementById('concrete-doubling-details');
    if (dblC) this.retypeset(dblC);
  },

  // Render mathematical breakdown for CURRENT active stage
  renderCurrentStageMath(stepNum) {
    const card = document.getElementById('stage-math-live-card');
    if (!card) return;
    const { a, b, p, Gx, Gy, alice_private, bob_private, alice_public, bob_public, alice_shared, bob_shared, matched } = this.state;
    const disc = (4 * Math.pow(a, 3) + 27 * Math.pow(b, 2)) % p;

    let html = '';
    if (stepNum === 1) {
      html = `
        <div class="stage-math-box">
          <h5>Initial Parameters & Field Configuration:</h5>
          <div class="stage-math-detail">
            <strong>Finite Field:</strong> \\(\\mathbb{F}_{${p}}\\) (arithmetic modulo ${p})<br>
            <strong>Curve Equation:</strong> \\(y^2 \\equiv x^3 + ${a}x + ${b} \\pmod{${p}}\\)<br>
            <strong>Base Point G:</strong> \\((${Gx}, ${Gy})\\)<br>
            <strong>Alice Secret Scalar:</strong> \\(d_A = ${alice_private}\\)<br>
            <strong>Bob Secret Scalar:</strong> \\(d_B = ${bob_private}\\)
          </div>
        </div>
      `;
    } else if (stepNum === 2) {
      html = `
        <div class="stage-math-box">
          <h5>Weierstrass Discriminant Non-Singularity Check:</h5>
          <div class="stage-math-detail">
            <strong>Formula:</strong> \\(\\Delta = (4a^3 + 27b^2) \\bmod p\\)<br>
            <strong>Substitution:</strong> \\(4(${a})^3 + 27(${b})^2 = ${4 * Math.pow(a, 3)} + ${27 * Math.pow(b, 2)} = ${4 * Math.pow(a, 3) + 27 * Math.pow(b, 2)}\\)<br>
            <strong>Modulo ${p}:</strong> \\(${4 * Math.pow(a, 3) + 27 * Math.pow(b, 2)} \\equiv ${disc} \\pmod{${p}}\\)<br>
            <strong>Result:</strong> \\(\\Delta \\equiv ${disc} \\not\\equiv 0 \\pmod{${p}}\\) &mdash; <span class="text-success font-weight-bold">Non-singular & Valid!</span>
          </div>
        </div>
      `;
    } else if (stepNum === 3) {
      const lhs = (Gy * Gy) % p;
      const rhs = (Math.pow(Gx, 3) + a * Gx + b) % p;
      html = `
        <div class="stage-math-box">
          <h5>Generator Point Verification on Curve:</h5>
          <div class="stage-math-detail">
            <strong>Condition:</strong> \\(y^2 \\equiv x^3 + ax + b \\pmod{p}\\) for \\(G = (${Gx}, ${Gy})\\)<br>
            <strong>LHS:</strong> \\(${Gy}^2 = ${Gy * Gy} \\equiv ${lhs} \\pmod{${p}}\\)<br>
            <strong>RHS:</strong> \\(${Gx}^3 + ${a}(${Gx}) + ${b} = ${Math.pow(Gx, 3) + a * Gx + b} \\equiv ${rhs} \\pmod{${p}}\\)<br>
            <strong>Verification:</strong> \\(LHS \\equiv RHS\\) (${lhs} &equiv; ${rhs}) &mdash; <span class="text-success font-weight-bold">Point G lies on curve!</span>
          </div>
        </div>
      `;
    } else if (stepNum === 4) {
      const pubStr = alice_public ? `(${alice_public[0]}, ${alice_public[1]})` : '(?, ?)';
      html = `
        <div class="stage-math-box">
          <h5>Alice Public Key Derivation (Double-and-Add Algorithm):</h5>
          <div class="stage-math-detail">
            <strong>Target:</strong> \\(A = d_A \\times G = ${alice_private} \\times (${Gx}, ${Gy})\\)<br>
            <strong>Scalar in Binary:</strong> \\(${alice_private} = (${(alice_private).toString(2)})_2\\)<br>
            <strong>Accumulation:</strong> Double base point at each bit position; add to running accumulator when bit is 1.<br>
            <strong>Alice Public Key Result:</strong> \\(A = ${pubStr}\\)
          </div>
        </div>
      `;
    } else if (stepNum === 5) {
      const pubStr = bob_public ? `(${bob_public[0]}, ${bob_public[1]})` : '(?, ?)';
      html = `
        <div class="stage-math-box">
          <h5>Bob Public Key Derivation (Double-and-Add Algorithm):</h5>
          <div class="stage-math-detail">
            <strong>Target:</strong> \\(B = d_B \\times G = ${bob_private} \\times (${Gx}, ${Gy})\\)<br>
            <strong>Scalar in Binary:</strong> \\(${bob_private} = (${(bob_private).toString(2)})_2\\)<br>
            <strong>Accumulation:</strong> Double base point at each bit position; add to running accumulator when bit is 1.<br>
            <strong>Bob Public Key Result:</strong> \\(B = ${pubStr}\\)
          </div>
        </div>
      `;
    } else if (stepNum === 6) {
      const pubAStr = alice_public ? `(${alice_public[0]}, ${alice_public[1]})` : '(?, ?)';
      const pubBStr = bob_public ? `(${bob_public[0]}, ${bob_public[1]})` : '(?, ?)';
      html = `
        <div class="stage-math-box">
          <h5>Public Coordinates Transmission & ECDLP Security:</h5>
          <div class="stage-math-detail">
            <strong>Public Key A (sent over channel):</strong> \\(A = ${pubAStr}\\)<br>
            <strong>Public Key B (sent over channel):</strong> \\(B = ${pubBStr}\\)<br>
            <strong>Confidential Private Keys:</strong> \\(d_A = ${alice_private}\\) and \\(d_B = ${bob_private}\\) (NEVER transmitted)<br>
            <strong>Security Assumption:</strong> Given \\(G\\) and \\(A = d_A \\times G\\), computing \\(d_A\\) is intractable under the Elliptic Curve Discrete Logarithm Problem (ECDLP).
          </div>
        </div>
      `;
    } else if (stepNum === 7) {
      const pubAStr = alice_public ? `(${alice_public[0]}, ${alice_public[1]})` : '(?, ?)';
      const pubBStr = bob_public ? `(${bob_public[0]}, ${bob_public[1]})` : '(?, ?)';
      const secAStr = alice_shared ? `(${alice_shared[0]}, ${alice_shared[1]})` : '(?, ?)';
      const secBStr = bob_shared ? `(${bob_shared[0]}, ${bob_shared[1]})` : '(?, ?)';
      html = `
        <div class="stage-math-box">
          <h5>Independent Shared Secret Computations:</h5>
          <div class="stage-math-detail">
            <strong>Alice Computes:</strong> \\(S_A = d_A \\times B = ${alice_private} \\times ${pubBStr} = ${secAStr}\\)<br>
            <strong>Bob Computes:</strong> \\(S_B = d_B \\times A = ${bob_private} \\times ${pubAStr} = ${secBStr}\\)<br>
            Both parties compute scalar multiplication of their own secret scalar by the received peer public point.
          </div>
        </div>
      `;
    } else if (stepNum === 8) {
      const secAStr = alice_shared ? `(${alice_shared[0]}, ${alice_shared[1]})` : '(?, ?)';
      const secBStr = bob_shared ? `(${bob_shared[0]}, ${bob_shared[1]})` : '(?, ?)';
      html = `
        <div class="stage-math-box">
          <h5>Cryptographic Equality Proof & Agreement:</h5>
          <div class="stage-math-detail">
            <strong>Alice Secret:</strong> \\(S_A = ${secAStr}\\)<br>
            <strong>Bob Secret:</strong> \\(S_B = ${secBStr}\\)<br>
            <strong>Algebraic Identity:</strong><br>
            \\[S_A = d_A \\times B = d_A \\times (d_B \\times G) = (d_A \\cdot d_B) \\times G\\]
            \\[S_B = d_B \\times A = d_B \\times (d_A \\times G) = (d_B \\cdot d_A) \\times G\\]
            Since integer multiplication is commutative (\\(d_A \\cdot d_B = d_B \\cdot d_A\\)), \\(S_A \\equiv S_B\\).<br>
            <strong>Agreement:</strong> <span class="text-success font-weight-bold">&check; SHARED SECRETS MATCH! Protocol Successfully Completed.</span>
          </div>
        </div>
      `;
    }
    card.innerHTML = html;
    this.retypeset(card);
  },

  // =========================================================
  // HTML5 CANVAS COORDINATE GRID PLOT
  // =========================================================
  setupCanvas() {
    this.canvas = document.getElementById('ecc-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    // Tooltip event listener on canvas
    this.canvas.addEventListener('mousemove', (e) => this.handleCanvasHover(e));
    this.canvas.addEventListener('mouseleave', () => {
      const tip = document.getElementById('canvas-tooltip');
      if (tip) tip.style.display = 'none';
    });
  },

  drawCanvas() {
    if (!this.canvas || !this.ctx) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const p = Math.max(this.state.p, 3);
    const step = this.state.vizStep || 1;

    // Padding for axis labels
    const pad = 50;
    const plotW = w - 2 * pad;
    const plotH = h - 2 * pad;

    // Clear canvas
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    // Grid coordinate mapping function
    const toCanvasX = (gx) => pad + (gx / (p - 1)) * plotW;
    const toCanvasY = (gy) => h - pad - (gy / (p - 1)) * plotH;

    // Draw Grid lines
    ctx.lineWidth = 1;
    ctx.strokeStyle = '#e2e8f0';
    for (let i = 0; i < p; i++) {
      const cx = toCanvasX(i);
      const cy = toCanvasY(i);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(cx, pad);
      ctx.lineTo(cx, h - pad);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(pad, cy);
      ctx.lineTo(w - pad, cy);
      ctx.stroke();
    }

    // Draw Outer Box
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#94a3b8';
    ctx.strokeRect(pad, pad, plotW, plotH);

    // Draw Axis Numbers & Labels
    ctx.fillStyle = '#64748b';
    ctx.font = '11px JetBrains Mono, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const stepTicks = (p > 25) ? Math.ceil(p / 10) : 1;

    for (let i = 0; i < p; i += stepTicks) {
      // X labels
      ctx.fillText(i.toString(), toCanvasX(i), h - pad + 8);
      // Y labels
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(i.toString(), pad - 8, toCanvasY(i));
      ctx.textAlign = 'center';
    }

    // Axis titles
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 13px Outfit, sans-serif';
    ctx.fillText(`x (modulo ${p})`, pad + plotW / 2, h - 16);

    ctx.save();
    ctx.translate(16, pad + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText(`y (modulo ${p})`, 0, 0);
    ctx.restore();

    // Store points with canvas coords for hover detection
    this.screenPoints = [];

    // Plot all valid points on curve
    if (this.state.allPoints && this.state.allPoints.length > 0) {
      this.state.allPoints.forEach(pt => {
        const cx = toCanvasX(pt[0]);
        const cy = toCanvasY(pt[1]);

        this.screenPoints.push({
          x: pt[0],
          y: pt[1],
          cx: cx,
          cy: cy,
          isGen: (pt[0] === this.state.Gx && pt[1] === this.state.Gy),
          isAlice: (this.state.alice_public && pt[0] === this.state.alice_public[0] && pt[1] === this.state.alice_public[1]),
          isBob: (this.state.bob_public && pt[0] === this.state.bob_public[0] && pt[1] === this.state.bob_public[1]),
          isShared: (this.state.alice_shared && pt[0] === this.state.alice_shared[0] && pt[1] === this.state.alice_shared[1])
        });

        // Default point dot
        ctx.beginPath();
        ctx.arc(cx, cy, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = '#94a3b8';
        ctx.fill();
      });
    }

    // Helper function to draw key points with halos
    const drawSpecialPoint = (pt, color, label, radius = 7, pulse = false) => {
      if (!pt) return;
      const cx = toCanvasX(pt[0]);
      const cy = toCanvasY(pt[1]);

      // Outer halo
      ctx.beginPath();
      ctx.arc(cx, cy, radius + (pulse ? 7 : 4), 0, Math.PI * 2);
      ctx.fillStyle = color + (pulse ? '44' : '22');
      ctx.fill();

      // Main circle
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Text label
      ctx.fillStyle = color;
      ctx.font = '700 11px Outfit, sans-serif';
      ctx.fillText(label, cx, cy - radius - 6);
    };

    // Draw Stage-Specific Traces & Highlights on Coordinate Grid

    // 1. Stage 4: Alice Scalar Multiplication Trace
    if (step === 4 && this.state.traces && this.state.traces.alice_pub_steps) {
      let prevPt = [this.state.Gx, this.state.Gy];
      ctx.save();
      ctx.strokeStyle = '#2563eb66';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);

      this.state.traces.alice_pub_steps.forEach((st, idx) => {
        if (st.new_result) {
          const pt = st.new_result;
          ctx.beginPath();
          ctx.moveTo(toCanvasX(prevPt[0]), toCanvasY(prevPt[1]));
          ctx.lineTo(toCanvasX(pt[0]), toCanvasY(pt[1]));
          ctx.stroke();

          // Small intermediate dot
          ctx.beginPath();
          ctx.arc(toCanvasX(pt[0]), toCanvasY(pt[1]), 5, 0, Math.PI * 2);
          ctx.fillStyle = '#60a5fa';
          ctx.fill();

          prevPt = pt;
        }
      });
      ctx.restore();
    }

    // 2. Stage 5: Bob Scalar Multiplication Trace
    if (step === 5 && this.state.traces && this.state.traces.bob_pub_steps) {
      let prevPt = [this.state.Gx, this.state.Gy];
      ctx.save();
      ctx.strokeStyle = '#ea580c66';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);

      this.state.traces.bob_pub_steps.forEach((st, idx) => {
        if (st.new_result) {
          const pt = st.new_result;
          ctx.beginPath();
          ctx.moveTo(toCanvasX(prevPt[0]), toCanvasY(prevPt[1]));
          ctx.lineTo(toCanvasX(pt[0]), toCanvasY(pt[1]));
          ctx.stroke();

          // Small intermediate dot
          ctx.beginPath();
          ctx.arc(toCanvasX(pt[0]), toCanvasY(pt[1]), 5, 0, Math.PI * 2);
          ctx.fillStyle = '#fb923c';
          ctx.fill();

          prevPt = pt;
        }
      });
      ctx.restore();
    }

    // 3. Highlight Generator Point G (Emerald Green)
    if (this.state.Gx !== undefined && this.state.Gy !== undefined) {
      const isPulse = (step === 3);
      drawSpecialPoint([this.state.Gx, this.state.Gy], '#059669', 'G (Base)', isPulse ? 8.5 : 7, isPulse);
      const legGen = document.getElementById('legend-gen-text');
      if (legGen) legGen.textContent = `Generator G (${this.state.Gx}, ${this.state.Gy})`;
    }

    // 4. Highlight Alice Public Key A (Blue)
    if (this.state.alice_public && step >= 4) {
      drawSpecialPoint(this.state.alice_public, '#2563eb', 'A (Alice)', (step === 4) ? 8.5 : 7, (step === 4));
      const legA = document.getElementById('legend-alice-text');
      if (legA) legA.textContent = `Alice Public (${this.state.alice_public[0]}, ${this.state.alice_public[1]})`;
    } else {
      const legA = document.getElementById('legend-alice-text');
      if (legA) legA.textContent = 'Alice Public (Not computed)';
    }

    // 5. Highlight Bob Public Key B (Orange)
    if (this.state.bob_public && step >= 5) {
      drawSpecialPoint(this.state.bob_public, '#ea580c', 'B (Bob)', (step === 5) ? 8.5 : 7, (step === 5));
      const legB = document.getElementById('legend-bob-text');
      if (legB) legB.textContent = `Bob Public (${this.state.bob_public[0]}, ${this.state.bob_public[1]})`;
    } else {
      const legB = document.getElementById('legend-bob-text');
      if (legB) legB.textContent = 'Bob Public (Not computed)';
    }

    // 6. Highlight Shared Secret Point S (Purple)
    if (this.state.alice_shared && this.state.matched && step >= 7) {
      drawSpecialPoint(this.state.alice_shared, '#8b5cf6', 'S (Shared)', (step === 8) ? 9 : 8, (step === 8));
      const legS = document.getElementById('legend-shared-text');
      if (legS) legS.textContent = `Shared Secret (${this.state.alice_shared[0]}, ${this.state.alice_shared[1]})`;
    } else {
      const legS = document.getElementById('legend-shared-text');
      if (legS) legS.textContent = 'Shared Secret (Not computed)';
    }
  },

  // Canvas Hover Tooltip
  handleCanvasHover(e) {
    if (!this.screenPoints || this.screenPoints.length === 0) return;
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    // Find nearest point within 12px radius
    let nearest = null;
    let minDist = 12;

    for (const pt of this.screenPoints) {
      const dist = Math.hypot(pt.cx - mouseX, pt.cy - mouseY);
      if (dist < minDist) {
        minDist = dist;
        nearest = pt;
      }
    }

    const tip = document.getElementById('canvas-tooltip');
    if (!tip) return;

    if (nearest) {
      let label = `Point (${nearest.x}, ${nearest.y})`;
      if (nearest.isGen) label += ' ★ Generator G';
      if (nearest.isAlice) label += ' 👩 Alice Public (A)';
      if (nearest.isBob) label += ' 👨 Bob Public (B)';
      if (nearest.isShared) label += ' 🤝 Shared Secret (S)';

      tip.textContent = label;
      tip.style.left = `${(nearest.cx / scaleX) + 12}px`;
      tip.style.top = `${(nearest.cy / scaleY) - 28}px`;
      tip.style.display = 'block';
    } else {
      tip.style.display = 'none';
    }
  },


  // Toast notifications
  showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'error' ? 'error' : ''}`;
    toast.innerHTML = `
      <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
      <span>${msg}</span>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }
};

// Initialize application on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = app;
  app.init();
});
