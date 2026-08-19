/* ============================================================
   Zahowa — Animations P2 (GSAP + ScrollTrigger) & façade vidéo
   - Animations sobres : opacity/transform uniquement, >= 300ms
   - Désactivées si prefers-reduced-motion ou animations off
   ============================================================ */
(function () {
  'use strict';

  /* ---------- Façade vidéo YouTube (privacy + perf) ---------- */
  document.addEventListener('click', function (e) {
    var facade = e.target.closest('[data-video-facade]');
    if (!facade) return;
    var id = facade.getAttribute('data-yt-id');
    if (!id) return;
    var params = 'autoplay=1&rel=0';
    if (facade.getAttribute('data-loop') === '1') params += '&loop=1&playlist=' + id;
    var iframe = document.createElement('iframe');
    iframe.src = 'https://www.youtube-nocookie.com/embed/' + id + '?' + params;
    iframe.title = facade.getAttribute('aria-label') || 'Vidéo';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.setAttribute('loading', 'eager');
    facade.replaceWith(iframe);
  });

  /* ---------- Animations GSAP ---------- */
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var enabled = document.documentElement.getAttribute('data-animations') !== 'disabled';
  if (reduced || !enabled) return;
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;
  gsap.registerPlugin(ScrollTrigger);

  /* Reveal doux des blocs [data-reveal] (remplace le reveal CSS si GSAP actif) */
  var reveals = document.querySelectorAll('[data-reveal]');
  if (reveals.length) {
    reveals.forEach(function (el) {
      el.style.transition = 'none';
      gsap.fromTo(el,
        { opacity: 0, y: 26 },
        {
          opacity: 1, y: 0,
          duration: 0.9,
          ease: 'power2.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true }
        });
      el.classList.add('is-revealed');
    });
  }

  /* Parallaxe légère du hero (si activée) */
  var heroImg = document.querySelector('.hero--parallax .hero__media img');
  if (heroImg) {
    gsap.to(heroImg, {
      yPercent: 12,
      ease: 'none',
      scrollTrigger: {
        trigger: heroImg.closest('.hero'),
        start: 'top top',
        end: 'bottom top',
        scrub: 0.6
      }
    });
  }

  /* Titres de section : léger fondu montant décalé sur l'accent */
  document.querySelectorAll('.section__title').forEach(function (title) {
    var accent = title.querySelector('.section__title-accent');
    if (!accent) return;
    gsap.fromTo(accent,
      { opacity: 0.4 },
      {
        opacity: 1,
        duration: 1.1,
        ease: 'power3.out',
        scrollTrigger: { trigger: title, start: 'top 85%', once: true }
      });
  });
})();
