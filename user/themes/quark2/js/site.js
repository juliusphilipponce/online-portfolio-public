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

  new BackToTop();
})();
