/*
 * Quark 2 — navigation, dropdowns, scroll state.
 */
(function () {
  'use strict';

  var body = document.body;

  // Mark nav items that have children so CSS can draw a caret
  document.querySelectorAll('.dropmenu li').forEach(function (li) {
    if (li.querySelector(':scope > ul')) li.classList.add('has-children');
  });

  // Click-to-open on touch devices (hover is flaky on iOS)
  var isTouch = matchMedia('(hover: none)').matches;
  if (isTouch) {
    document.querySelectorAll('.dropmenu li.has-children > a').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var li = a.parentNode;
        if (!li.classList.contains('open')) {
          e.preventDefault();
          document.querySelectorAll('.dropmenu li.open').forEach(function (other) {
            if (other !== li && !other.contains(li)) other.classList.remove('open');
          });
          li.classList.add('open');
        }
      });
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.dropmenu')) {
        document.querySelectorAll('.dropmenu li.open').forEach(function (li) { li.classList.remove('open'); });
      }
    });
  }

  // Mobile menu toggle
  var toggle = document.getElementById('toggle');
  var overlay = document.getElementById('overlay');
  if (toggle && overlay) {
    toggle.addEventListener('click', function () {
      toggle.classList.toggle('active');
      overlay.classList.toggle('open');
      document.body.classList.toggle('overlay-open');
    });
    overlay.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        toggle.classList.remove('active');
        overlay.classList.remove('open');
        document.body.classList.remove('overlay-open');
      }
    });
  }

  // Scroll state (for sticky header shadow + animated shrink)
  // Hysteresis: the navbar shrinks by 12px when `.scrolled` is on, which
  // shifts layout and can flip scrollY back over a single threshold. The
  // 16px dead zone between ON_AT and OFF_AT is wider than that delta so a
  // toggle-induced layout shift can never re-cross the opposite threshold.
  var SCROLL_ON_AT = 20;
  var SCROLL_OFF_AT = 4;
  var lastScrolled = false;
  function onScroll() {
    var y = window.scrollY;
    var scrolled = lastScrolled ? y > SCROLL_OFF_AT : y > SCROLL_ON_AT;
    if (scrolled !== lastScrolled) {
      body.classList.toggle('scrolled', scrolled);
      lastScrolled = scrolled;
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Smooth-scroll to #start for "angle-down" hero chevron
  var toStart = document.getElementById('to-start');
  if (toStart) {
    toStart.addEventListener('click', function () {
      var target = document.getElementById('start');
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  class BackToTop {
    constructor() {
      this.button = document.getElementById('back-to-top');
      if (this.button) {
        this.progressFill = this.button.querySelector('.back-to-top-progress-fill');
        this.circumference = 125.66;
        this.initialise();
      }
    }

    initialise() {
      this.setEventHandlers();
      this.updateProgress();
    }

    setEventHandlers() {
      window.addEventListener('scroll', () => this.updateProgress(), { passive: true });
      this.button.addEventListener('click', () => this.scrollToTop());
    }

    updateProgress() {
      var y = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
      this.button.classList.toggle('visible', y > 300);
      if (this.progressFill) {
        var docHeight = Math.max(
          document.body.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.clientHeight,
          document.documentElement.scrollHeight,
          document.documentElement.offsetHeight
        ) - window.innerHeight;
        var progress = docHeight > 0 ? y / docHeight : 0;
        var offset = this.circumference - (progress * this.circumference);
        this.progressFill.style.strokeDashoffset = Math.max(0, Math.min(this.circumference, offset));
      }
    }

    scrollToTop() {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  class FormAsyncModal {
    constructor() {
      this.init();
    }

    init() {
      this.createModal();
      this.setEventHandlers();
    }

    setEventHandlers() {
      // Use event delegation for submit event
      document.body.addEventListener('submit', (e) => {
        const form = e.target;
        if (form && form.id === 'contact') {
          e.preventDefault(); // Prevent standard page reload
          this.handleSubmit(form);
        }
      });

      // Manage submit button state based on Turnstile verification status
      const setupButtonState = () => {
        const form = document.querySelector('form#contact, form[name="contact"]') || document.querySelector('form');
        if (form) {
          const turnstile = form.querySelector('[data-captcha-provider="turnstile"]');
          const submitBtn = form.querySelector('.btn-primary, button[type="submit"], input[type="submit"], button');
          if (turnstile && submitBtn) {
            const tokenInput = form.querySelector('input[name="cf-turnstile-response"]');
            const hasToken = tokenInput && tokenInput.value.trim() !== '';
            const isAttrVerified = form.getAttribute('data-turnstile-verified') === 'true';
            const isVerified = isAttrVerified || hasToken;

            submitBtn.disabled = !isVerified;
            if (!isVerified) {
              submitBtn.style.opacity = '0.5';
              submitBtn.style.cursor = 'not-allowed';
              submitBtn.style.pointerEvents = 'none'; // Absolutely prevent clicks
            } else {
              submitBtn.style.opacity = '1';
              submitBtn.style.cursor = 'pointer';
              submitBtn.style.pointerEvents = 'auto'; // Re-enable clicks
            }
          }
        }
      };

      const formObserver = new MutationObserver((mutations) => {
        setupButtonState();
      });

      const observeForm = () => {
        const form = document.querySelector('form#contact, form[name="contact"]') || document.querySelector('form');
        if (form) {
          setupButtonState();
          formObserver.observe(form, { 
            attributes: true, 
            attributeFilter: ['data-turnstile-verified'],
            childList: true,
            subtree: true
          });
        }
      };

      observeForm();

      // Continuous poll to detect programmatic token value updates instantly
      setInterval(setupButtonState, 300);

      // Observer in case form loads dynamically or after scripts run
      const docObserver = new MutationObserver(() => {
        const form = document.querySelector('form#contact, form[name="contact"]') || document.querySelector('form');
        if (form) {
          observeForm();
          docObserver.disconnect();
        }
      });
      docObserver.observe(document.body, { childList: true, subtree: true });
    }

    createModal() {
      if (document.querySelector('.form-async-modal-overlay')) return;

      this.overlay = document.createElement('div');
      this.overlay.className = 'form-async-modal-overlay';
      this.overlay.innerHTML = `
        <div class="form-async-modal">
          <div class="form-async-spinner"></div>
          <div class="form-async-message">Sending your message...</div>
        </div>
      `;
      document.body.appendChild(this.overlay);
    }

    async handleSubmit(form) {
      // Check if Turnstile is present and verified
      const turnstileContainer = form.querySelector('[data-captcha-provider="turnstile"]');
      const tokenInput = form.querySelector('input[name="cf-turnstile-response"]');
      const hasToken = tokenInput && tokenInput.value.trim() !== '';
      const isAttrVerified = form.getAttribute('data-turnstile-verified') === 'true';
      const isVerified = isAttrVerified || hasToken;

      if (turnstileContainer && !isVerified) {
        this.overlay.classList.add('active');
        this.overlay.querySelector('.form-async-spinner').style.display = 'none';
        this.overlay.querySelector('.form-async-message').innerHTML = `
          <div style="font-size: 3rem; color: #ffc107; margin-bottom: 0.5rem; line-height: 1;">⚠</div>
          <div style="font-weight: 700; font-size: 1.2rem; color: #ffc107;">Security Check Required</div>
          <div style="font-size: 0.95rem; color: var(--q2-text-light, #666666); margin-top: 0.5rem; line-height: 1.4;">Please solve the Cloudflare Turnstile challenge before sending.</div>
          <button class="btn btn-primary" style="margin-top: 1.5rem; font-size: 0.875rem; padding: 0.5rem 1.5rem;" onclick="document.querySelector('.form-async-modal-overlay').classList.remove('active')">Go Back</button>
        `;
        return;
      }

      const buttons = form.querySelectorAll('button[type="submit"], input[type="submit"]');
      buttons.forEach(btn => {
        btn.disabled = true;
      });

      // Show spinner and reset message
      this.overlay.classList.add('active');
      this.overlay.querySelector('.form-async-spinner').style.display = 'block';
      this.overlay.querySelector('.form-async-message').innerHTML = 'Sending your message...';

      try {
        const formData = new FormData(form);
        const hostname = window.location.hostname;
        const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.test');
        
        let targetUrl = form.getAttribute('action');
        let fetchOptions = {};

        if (!isLocalhost && (!targetUrl || targetUrl === window.location.href || targetUrl === window.location.pathname)) {
          targetUrl = 'https://portfolio-contact.juliusphilipponce.workers.dev/';
          
          const cleanData = new FormData();
          const nameVal = form.querySelector('input[name*="name"], input[type="text"]')?.value || '';
          const emailVal = form.querySelector('input[name*="email"], input[type="email"]')?.value || '';
          const messageVal = form.querySelector('textarea')?.value || '';
          
          cleanData.append('name', nameVal);
          cleanData.append('email', emailVal);
          cleanData.append('message', messageVal);

          fetchOptions = {
            method: 'POST',
            body: cleanData
          };

          console.log('[FormSubmit Debug] Live environment detected. Target Worker URL:', targetUrl);
          console.log('[FormSubmit Debug] Sending payload:', { name: nameVal, email: emailVal, message: messageVal });
        } else {
          targetUrl = targetUrl || window.location.href;
          fetchOptions = {
            method: form.getAttribute('method') || 'POST',
            body: new URLSearchParams(formData),
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'X-Requested-With': 'XMLHttpRequest'
            }
          };
          console.log('[FormSubmit Debug] Local environment detected. Target URL:', targetUrl);
        }

        console.log('[FormSubmit Debug] Initiating fetch request to:', targetUrl);
        const response = await fetch(targetUrl, fetchOptions);
        console.log('[FormSubmit Debug] Response status:', response.status, response.statusText);

        if (response.ok) {
          let messageText = 'Thank you! Your message has been sent successfully.';
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            console.log('[FormSubmit Debug] Worker returned JSON response:', data);
            if (data.message) {
              messageText = data.message;
            }
          } else {
            const responseText = await response.text();
            console.log('[FormSubmit Debug] Server returned text response:', responseText);
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = responseText;
            const successMsg = tempDiv.querySelector('.form-message, .alert, .toast');
            if (successMsg) {
              messageText = successMsg.textContent.trim();
            }
          }

          console.log('[FormSubmit Debug] Form submission SUCCESS!');

          // Show success state
          this.overlay.querySelector('.form-async-spinner').style.display = 'none';
          this.overlay.querySelector('.form-async-message').innerHTML = `
            <div style="font-size: 3rem; color: #28a745; margin-bottom: 0.5rem; line-height: 1;">✓</div>
            <div style="font-weight: 700; font-size: 1.2rem; color: var(--q2-text, #111111);">Success!</div>
            <div style="font-size: 0.95rem; color: var(--q2-text-light, #666666); margin-top: 0.5rem; line-height: 1.4;">${messageText}</div>
            <button class="btn btn-primary" style="margin-top: 1.5rem; font-size: 0.875rem; padding: 0.5rem 1.5rem;" onclick="document.querySelector('.form-async-modal-overlay').classList.remove('active')">Close</button>
          `;

          form.reset();
        } else {
          const errText = await response.text();
          console.error('[FormSubmit Debug] Response failed with status:', response.status, 'Error body:', errText);
          throw new Error(`HTTP ${response.status}: ${errText}`);
        }
      } catch (error) {
        console.error('[FormSubmit Debug] Caught submission error:', error);
        this.overlay.querySelector('.form-async-spinner').style.display = 'none';
        this.overlay.querySelector('.form-async-message').innerHTML = `
          <div style="font-size: 3rem; color: #dc3545; margin-bottom: 0.5rem; line-height: 1;">✗</div>
          <div style="font-weight: 700; font-size: 1.2rem; color: #dc3545;">Submission Failed</div>
          <div style="font-size: 0.95rem; color: var(--q2-text-light, #666666); margin-top: 0.5rem; line-height: 1.4;">Could not send message. Please try again later.</div>
          <button class="btn btn-primary" style="margin-top: 1.5rem; font-size: 0.875rem; padding: 0.5rem 1.5rem;" onclick="document.querySelector('.form-async-modal-overlay').classList.remove('active')">Try Again</button>
        `;
      } finally {
        buttons.forEach(btn => {
          btn.disabled = false;
        });
      }
    }
  }

  new BackToTop();
  new FormAsyncModal();
})();
