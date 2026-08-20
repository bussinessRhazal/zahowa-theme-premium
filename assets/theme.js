/* ============================================================
   Zahowa — Theme JS
   ============================================================ */

(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Theme toggle (light / dark) ---------- */
  const THEME_KEY = 'zahowa-theme';

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const isDark = theme === 'dark';
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
      const sun = btn.querySelector('.header__theme-sun');
      const moon = btn.querySelector('.header__theme-moon');
      if (sun) sun.hidden = isDark;
      if (moon) moon.hidden = !isDark;
    });
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      const bg = getComputedStyle(document.documentElement).getPropertyValue('--color-bg').trim();
      if (bg) meta.setAttribute('content', bg);
    }
  }

  function initTheme() {
    let theme = null;
    try {
      theme = localStorage.getItem(THEME_KEY);
    } catch (e) {}
    if (theme !== 'dark' && theme !== 'light') {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    applyTheme(theme);
    document.querySelectorAll('[data-theme-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        applyTheme(next);
        try {
          localStorage.setItem(THEME_KEY, next);
        } catch (e) {}
      });
    });
  }

  /* ---------- Sticky header state ---------- */
  function initHeader() {
    const header = document.querySelector('.header');
    if (!header) return;
    const onScroll = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 24);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Mobile menu ---------- */
  function initMobileMenu() {
    const menu = document.querySelector('[data-mobile-menu]');
    const openers = document.querySelectorAll('[data-menu-open]');
    const closers = document.querySelectorAll('[data-menu-close]');
    if (!menu) return;

    const setOpen = (open) => {
      menu.classList.toggle('is-open', open);
      menu.setAttribute('aria-hidden', open ? 'false' : 'true');
      openers.forEach((btn) => btn.setAttribute('aria-expanded', open ? 'true' : 'false'));
    };

    openers.forEach((btn) => btn.addEventListener('click', () => setOpen(true)));
    closers.forEach((btn) => btn.addEventListener('click', () => setOpen(false)));
    menu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') setOpen(false);
    });
  }

  /* ---------- Cart drawer ---------- */
  function initCartDrawer() {
    const drawerEl = document.querySelector('cart-drawer');
    if (!drawerEl) return;

    document.querySelectorAll('[data-cart-open]').forEach((btn) =>
      btn.addEventListener('click', () => drawerEl.classList.add('is-open'))
    );
    drawerEl.querySelectorAll('[data-cart-close]').forEach((btn) =>
      btn.addEventListener('click', () => drawerEl.classList.remove('is-open'))
    );
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') drawerEl.classList.remove('is-open');
    });

    drawerEl.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-cart-change]');
      if (!btn) return;
      const key = btn.dataset.key;
      const qty = parseInt(btn.dataset.qty, 10);
      if (!key || qty < 0) return;
      e.preventDefault();
      await updateCartItem(key, qty);
    });
  }

  async function updateCartItem(key, quantity) {
    const body = {
      updates: { [key]: quantity }
    };
    try {
      const res = await fetch('/cart/update.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!res.ok) throw new Error('update failed');
      const cart = await res.json();
      refreshCartUI(cart);
      showToast(quantity === 0 ? 'Retiré du panier' : 'Panier mis à jour');
    } catch (err) {
      showToast('Une erreur est survenue');
    }
  }

  async function refreshCartUI(cart) {
    document.querySelectorAll('[data-cart-count]').forEach((el) => {
      el.textContent = cart.item_count;
      el.style.display = cart.item_count > 0 ? 'flex' : 'none';
    });
    const body = document.querySelector('[data-cart-body]');
    if (!body) return;
    try {
      const res = await fetch('/?sections=cart-drawer');
      if (!res.ok) return;
      const sections = await res.json();
      if (sections['cart-drawer']) {
        // P2 sécurité : parsing via DOMParser + replaceChildren (pas d'innerHTML direct)
        const doc = new DOMParser().parseFromString(sections['cart-drawer'], 'text/html');
        const newBody = doc.querySelector('[data-cart-body]');
        if (newBody) body.replaceChildren(...newBody.childNodes);
      }
    } catch (e) {}
  }

  /* ---------- Toast ---------- */
  let toastTimer = null;
  function showToast(message) {
    const toast = document.querySelector('[data-toast]');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('is-visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
  }

  /* ---------- Add to cart (product form) ---------- */
  function initAddToCart() {
    document.querySelectorAll('[data-product-form]').forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = form.querySelector('[type="submit"]');
        const formData = new FormData(form);
        const originalText = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = '…';
        }
        try {
          const res = await fetch('/cart/add.js', {
            method: 'POST',
            body: formData
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.description || 'error');
          }
          const cartRes = await fetch('/cart.js');
          const cart = await cartRes.json();
          refreshCartUI(cart);
          const drawer = document.querySelector('cart-drawer');
          if (drawer) drawer.classList.add('is-open');
          showToast('Ajouté au panier');
        } catch (err) {
          showToast(err.message || 'Une erreur est survenue');
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
          }
        }
      });
    });
  }

  /* ---------- Quantity steppers ---------- */
  function initQuantity() {
    document.querySelectorAll('[data-qty-container]').forEach((wrap) => {
      const input = wrap.querySelector('input[type="number"]');
      const minus = wrap.querySelector('[data-qty-minus]');
      const plus = wrap.querySelector('[data-qty-plus]');
      if (!input) return;
      minus?.addEventListener('click', () => {
        const val = parseInt(input.value, 10) || 1;
        if (val > 1) input.value = val - 1;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
      plus?.addEventListener('click', () => {
        const val = parseInt(input.value, 10) || 1;
        input.value = val + 1;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
  }

  /* ---------- Reveal on scroll ---------- */
  function initReveal() {
    const enabled = document.documentElement.dataset.animations !== 'disabled';
    if (!enabled || prefersReducedMotion) return;
    const items = document.querySelectorAll('[data-reveal]');
    if (!items.length) return;
    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-revealed'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    items.forEach((el) => observer.observe(el));
  }

  /* ---------- Hero parallax ---------- */
  function initParallax() {
    const hero = document.querySelector('[data-parallax]');
    if (!hero || prefersReducedMotion) return;
    const media = hero.querySelector('.hero__media');
    if (!media) return;
    let ticking = false;
    const update = () => {
      const rect = hero.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) {
        ticking = false;
        return;
      }
      const offset = (rect.top + rect.height / 2 - window.innerHeight / 2) * 0.12;
      media.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0) scale(1.06)`;
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
    update();
  }

  /* ---------- Product variant selector ---------- */
  function initVariantSelector() {
    const form = document.querySelector('[data-product-form]');
    if (!form) return;
    const jsonEl = form.querySelector('[data-variant-json]');
    const variantInput = form.querySelector('[data-variant-id]');
    const optionInputs = form.querySelectorAll('[data-option-input]');
    const submitBtn = form.querySelector('[data-submit-button]');
    const priceRow = form.querySelector('.product__price-row');
    const stickyPrice = document.querySelector('[data-sticky-atc-price]');
    if (!jsonEl || !variantInput || !optionInputs.length) return;

    let variants = [];
    try {
      variants = JSON.parse(jsonEl.textContent);
    } catch (e) {
      return;
    }

    const selectedVariant = () => {
      const values = Array.from(optionInputs)
        .filter((i) => i.checked)
        .map((i) => i.value);
      return variants.find((v) =>
        values.every((val, idx) => (v.options[idx] || '').toString() === val)
      );
    };

    const currency = priceRow.dataset.currency || 'EUR';

    const formatMoney = (cents) => {
      try {
        return new Intl.NumberFormat(
          document.documentElement.lang || 'fr-FR',
          { style: 'currency', currency: currency }
        ).format(cents / 100);
      } catch (e) {
        return (cents / 100).toFixed(2) + ' ' + currency;
      }
    };

    const render = () => {
      const variant = selectedVariant();
      if (!variant) return;
      variantInput.value = variant.id;
      variantInput.dispatchEvent(new Event('change', { bubbles: true }));
      const money = formatMoney(variant.price);
      if (priceRow) {
        // P2 sécurité : construction DOM au lieu d'innerHTML
        const priceSpan = document.createElement('span');
        priceSpan.className = 'product__price';
        priceSpan.textContent = money;
        priceRow.replaceChildren(priceSpan);
      }
      if (stickyPrice) stickyPrice.textContent = money;
      if (submitBtn) {
        submitBtn.disabled = !variant.available;
        submitBtn.textContent = variant.available
          ? submitBtn.dataset.addText || submitBtn.textContent
          : submitBtn.dataset.soldText || 'Épuisé';
      }
    };

    submitBtn?.setAttribute('data-add-text', submitBtn.textContent.trim());
    submitBtn?.setAttribute('data-sold-text', 'Épuisé');

    optionInputs.forEach((input) => input.addEventListener('change', render));
    render();
  }

  /* ---------- Product gallery ---------- */
  function initProductGallery() {
    const main = document.querySelector('[data-gallery-main]');
    const thumbs = document.querySelectorAll('[data-gallery-thumb]');
    if (!main || !thumbs.length) return;
    thumbs.forEach((thumb) => {
      thumb.addEventListener('click', () => {
        const img = thumb.querySelector('img');
        const mainImg = main.querySelector('img');
        if (!img || !mainImg) return;
        const full = img.dataset.full || img.src;
        /* srcset/sizes écrasent src dans le navigateur : il faut les retirer
           pour que la nouvelle image s'affiche réellement */
        mainImg.removeAttribute('srcset');
        mainImg.removeAttribute('sizes');
        mainImg.src = full;
        if (img.alt) mainImg.alt = img.alt;
        thumbs.forEach((t) => t.classList.remove('is-active'));
        thumb.classList.add('is-active');
      });
    });
  }

  /* ---------- Product share ---------- */
  function initProductShare() {
    document.querySelectorAll('[data-share-native]').forEach((btn) => {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', async () => {
        const url = btn.dataset.shareUrl || window.location.href;
        const title = btn.dataset.shareTitle || document.title;
        const feedback = btn.closest('.product-share')?.querySelector('[data-share-feedback]');
        if (navigator.share) {
          try {
            await navigator.share({ title, url });
          } catch (e) { /* annulé */ }
          return;
        }
        try {
          await navigator.clipboard.writeText(url);
          if (feedback) {
            feedback.textContent = 'Lien copié';
            setTimeout(() => (feedback.textContent = ''), 2500);
          }
        } catch (e) {
          window.prompt('Copiez le lien :', url);
        }
      });
    });
  }

  function initTestimonials() {
    const wraps = document.querySelectorAll('[data-testimonials]');
    wraps.forEach((wrap) => {
      if (!wrap.classList.contains('testimonials__wrap--carousel')) return;
      const viewport = wrap.querySelector('.testimonials__viewport');
      const track = wrap.querySelector('.testimonials__track');
      const slides = wrap.querySelectorAll('.testimonials__slide:not(.testimonials__slide--clone)');
      const prev = wrap.querySelector('[data-testimonials-prev]');
      const next = wrap.querySelector('[data-testimonials-next]');
      const dots = wrap.querySelectorAll('[data-testimonials-dot]');
      if (!viewport || !track || !slides.length) return;

      const autoplayEnabled = wrap.dataset.autoplay === 'true';
      const autoplayDelay = parseInt(wrap.dataset.autoplayDelay, 10) || 5000;
      let index = 0;
      let timer = null;
      let perView = 1;
      let isReduced = prefersReducedMotion;

      function computePerView() {
        const w = viewport.clientWidth;
        const configured = parseInt(wrap.dataset.perView, 10) || 3;
        if (w >= 990) perView = configured;
        else if (w >= 640) perView = Math.min(2, configured);
        else perView = 1;
      }

      function goTo(i, instant) {
        const total = slides.length;
        if (total === 0) return;
        index = (i % total + total) % total;
        computePerView();
        track.style.setProperty('--per-view', perView);
        const slideWidth = viewport.clientWidth / perView;
        const shift = index * slideWidth;
        track.style.transition = instant ? 'none' : '';
        track.style.transform = `translate3d(-${shift}px, 0, 0)`;
        if (dots.length) {
          dots.forEach((d, di) => d.classList.toggle('is-active', di === index));
        }
        if (prev) prev.disabled = false;
        if (next) next.disabled = false;
      }

      function startAutoplay() {
        if (!autoplayEnabled || isReduced) return;
        stopAutoplay();
        timer = setInterval(() => goTo(index + 1), autoplayDelay);
      }

      function stopAutoplay() {
        if (timer) {
          clearInterval(timer);
          timer = null;
        }
      }

      prev?.addEventListener('click', () => {
        goTo(index - 1);
        startAutoplay();
      });
      next?.addEventListener('click', () => {
        goTo(index + 1);
        startAutoplay();
      });
      dots.forEach((d) =>
        d.addEventListener('click', () => {
          goTo(parseInt(d.dataset.index, 10));
          startAutoplay();
        })
      );

      wrap.addEventListener('mouseenter', stopAutoplay);
      wrap.addEventListener('mouseleave', startAutoplay);
      wrap.addEventListener('focusin', stopAutoplay);
      wrap.addEventListener('focusout', startAutoplay);
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) stopAutoplay();
        else startAutoplay();
      });

      let resizeTimer = null;
      window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => goTo(index, true), 150);
      });

      goTo(0, true);
      startAutoplay();
    });
  }

  /* ---------- Sticky add-to-cart (mobile) ---------- */
  function initStickyATC() {
    const bar = document.querySelector('[data-sticky-atc]');
    const form = document.querySelector('[data-product-form]');
    if (!bar || !form) return;

    const addBtn = bar.querySelector('[data-sticky-atc-add]');
    const title = bar.querySelector('[data-sticky-atc-title]');
    const priceEl = bar.querySelector('[data-sticky-atc-price]');

    const mainSubmit = form.querySelector('[type="submit"]');
    const variantInput = form.querySelector('[data-variant-id]');

    // Clicking the sticky button triggers the main form submit
    addBtn?.addEventListener('click', () => {
      if (form.checkValidity()) {
        form.requestSubmit();
      } else {
        form.reportValidity();
      }
    });

    const onScroll = () => {
      const rect = form.getBoundingClientRect();
      const visible = rect.bottom < 0 || rect.top > window.innerHeight;
      bar.classList.toggle('is-visible', !visible && window.innerWidth <= 749);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    onScroll();

    // Keep sticky title/price in sync with the selected variant
    if (variantInput) {
      variantInput.addEventListener('change', () => {
        if (title) title.textContent = form.querySelector('.product__title')?.textContent || '';
        if (priceEl) priceEl.textContent = variantInput.dataset.price || priceEl.textContent;
      });
    }
  }

  /* ---------- Init ---------- */
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initHeader();
    initMobileMenu();
    initCartDrawer();
    initAddToCart();
    initQuantity();
    initReveal();
    initParallax();
    initProductGallery();
    initVariantSelector();
    initStickyATC();
    initTestimonials();
    initProductShare();
  });
})();
