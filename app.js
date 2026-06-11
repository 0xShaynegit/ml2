/* ==========================================================================
   MODERN LENDING   app.js
   Native only: Freedom Calculator, scroll reveal, header state.
   ========================================================================== */
(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ========================================================================
     1. THE FREEDOM CALCULATOR
     Standard P&I amortisation: M = P * r * (1+r)^n / ((1+r)^n - 1)
     Broker panel rate is modelled as the bank retail rate minus a 0.60%
     illustrative panel advantage, floored at 4.80%.
     ======================================================================== */
  const PANEL_ADVANTAGE = 0.60;
  const PANEL_FLOOR = 4.80;

  const els = {
    amount: document.getElementById('loan-amount'),
    term: document.getElementById('loan-term'),
    bankRate: document.getElementById('bank-rate'),
    amountOut: document.getElementById('loan-amount-out'),
    termOut: document.getElementById('loan-term-out'),
    bankRateOut: document.getElementById('bank-rate-out'),
    bankRateDisplay: document.getElementById('bank-rate-display'),
    brokerRateDisplay: document.getElementById('broker-rate-display'),
    bankMonthly: document.getElementById('bank-monthly'),
    brokerMonthly: document.getElementById('broker-monthly'),
    gapMonthly: document.getElementById('gap-monthly'),
    gapLifetime: document.getElementById('gap-lifetime'),
    gapBar: document.getElementById('gap-bar')
  };

  const aud = new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency: 'AUD',
    maximumFractionDigits: 0
  });

  function monthlyRepayment(principal, annualRatePct, years) {
    const r = annualRatePct / 100 / 12;
    const n = years * 12;
    if (r === 0) return principal / n;
    const growth = Math.pow(1 + r, n);
    return principal * r * growth / (growth - 1);
  }

  function paintSliderFill(slider) {
    const min = Number(slider.min);
    const max = Number(slider.max);
    const pct = ((Number(slider.value) - min) / (max - min)) * 100;
    slider.style.setProperty('--fill', pct + '%');
  }

  function updateCalculator() {
    const principal = Number(els.amount.value);
    const years = Number(els.term.value);
    const bankRate = Number(els.bankRate.value);
    const brokerRate = Math.max(PANEL_FLOOR, bankRate - PANEL_ADVANTAGE);

    const bankMonthly = monthlyRepayment(principal, bankRate, years);
    const brokerMonthly = monthlyRepayment(principal, brokerRate, years);
    const gapMonthly = Math.max(0, bankMonthly - brokerMonthly);
    const gapLifetime = gapMonthly * years * 12;

    els.amountOut.textContent = aud.format(principal);
    els.termOut.textContent = years + (years === 1 ? ' year' : ' years');
    els.bankRateOut.textContent = bankRate.toFixed(2) + '% p.a.';
    els.bankRateDisplay.textContent = bankRate.toFixed(2) + '% p.a.';
    els.brokerRateDisplay.textContent = brokerRate.toFixed(2) + '% p.a.';
    els.bankMonthly.textContent = aud.format(Math.round(bankMonthly));
    els.brokerMonthly.textContent = aud.format(Math.round(brokerMonthly));
    els.gapMonthly.textContent = aud.format(Math.round(gapMonthly));
    els.gapLifetime.textContent = aud.format(Math.round(gapLifetime));

    /* Gap bar: scale against the bank repayment so the bar reads as
       "the slice of every payment you get back". Min 4% so it never vanishes. */
    const gapPct = bankMonthly > 0 ? (gapMonthly / bankMonthly) * 100 : 0;
    els.gapBar.style.width = Math.max(4, Math.min(100, gapPct * 6)).toFixed(1) + '%';

    [els.amount, els.term, els.bankRate].forEach(paintSliderFill);
  }

  const calculatorReady = els.amount && els.term && els.bankRate && els.gapBar;
  if (calculatorReady) {
    [els.amount, els.term, els.bankRate].forEach((slider) => {
      slider.addEventListener('input', updateCalculator);
    });
    updateCalculator();
  }

  /* ========================================================================
     2. SCROLL REVEAL (IntersectionObserver)
     Adds .is-revealed once per element. Hero children get a FadeInUp
     cascade via staggered --reveal-delay. Reduced motion: reveal instantly.
     ======================================================================== */
  const revealItems = document.querySelectorAll('.reveal-item');

  if (!('IntersectionObserver' in window) || prefersReducedMotion) {
    document.documentElement.classList.add('no-observer');
    revealItems.forEach((el) => el.classList.add('is-revealed'));
  } else {
    /* Stagger siblings within each parent for the cascade effect */
    const parents = new Map();
    revealItems.forEach((el) => {
      const parent = el.parentElement;
      const index = parents.get(parent) || 0;
      el.style.setProperty('--reveal-delay', Math.min(index * 120, 600) + 'ms');
      parents.set(parent, index + 1);
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });

    revealItems.forEach((el) => observer.observe(el));

    /* Loyalty tax drift bars animate when the figure scrolls into view */
    const driftFigure = document.querySelector('.loyalty-figure');
    if (driftFigure) {
      const driftObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            driftObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.4 });
      driftObserver.observe(driftFigure);
    }
  }

  /* ========================================================================
     3. HEADER STATE
     Drop a shadow under the sticky header once the page has scrolled.
     ======================================================================== */
  const header = document.querySelector('.site-header');
  if (header) {
    let ticking = false;
    const setHeaderState = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(setHeaderState);
      }
    }, { passive: true });
    setHeaderState();
  }

  /* ========================================================================
     4. FAQ: one open at a time (class-toggle pattern, native <details>)
     ======================================================================== */
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach((item) => {
    item.addEventListener('toggle', () => {
      if (item.open) {
        faqItems.forEach((other) => {
          if (other !== item) other.open = false;
        });
      }
    });
  });
})();
