/* ============================================================
   LOKESH PANDITI — PORTFOLIO CLIENT ENGINE
   Theme management, live clock, fluid SPA page transitions,
   navbar morphing, and interactive components.
   ============================================================ */

(function () {
  'use strict';

  /* Cache for fast prefetching */
  const pageCache = new Map();
  let isTransitioning = false;

  /* ============================================================
     1. THEME MANAGEMENT
     ============================================================ */
  function initTheme() {
    const root = document.documentElement;
    const themeBtn = document.getElementById('themeToggle');

    function setTheme(theme) {
      root.setAttribute('data-theme', theme);
      try {
        localStorage.setItem('loki-theme', theme);
      } catch (e) {}
      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) {
        metaTheme.setAttribute('content', theme === 'dark' ? '#111110' : '#FAF5E9');
      }
    }

    if (themeBtn) {
      themeBtn.onclick = () => {
        const current = root.getAttribute('data-theme') || 'light';
        const next = current === 'dark' ? 'light' : 'dark';
        setTheme(next);
      };
    }
  }

  /* ============================================================
     2. MOBILE MENU
     ============================================================ */
  function initMobileMenu() {
    const burger = document.getElementById('burger');
    const mob = document.getElementById('mobMenu');

    if (burger && mob) {
      burger.onclick = () => {
        const open = burger.classList.toggle('o');
        mob.classList.toggle('o', open);
        burger.setAttribute('aria-expanded', open ? 'true' : 'false');
        document.body.style.overflow = open ? 'hidden' : '';
      };

      const closeMob = () => {
        burger.classList.remove('o');
        mob.classList.remove('o');
        burger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      };

      document.querySelectorAll('[data-mob-close]').forEach((link) => {
        link.onclick = closeMob;
      });
    }
  }

  /* ============================================================
     3. SCROLL REVEAL OBSERVER
     ============================================================ */
  function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');
    if (reveals.length === 0) return;

    const windowHeight = window.innerHeight || 800;

    // Immediately mark visible any elements currently in/near viewport
    reveals.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < windowHeight + 150) {
        el.classList.add('in');
      }
    });

    const revealObs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            revealObs.unobserve(e.target);
          }
        });
      },
      { threshold: 0.05, rootMargin: '0px 0px 80px 0px' }
    );

    reveals.forEach((el) => {
      if (!el.classList.contains('in')) {
        revealObs.observe(el);
      }
    });
  }

  /* ============================================================
     4. SCROLL PROGRESS + ACTIVE NAV + BACK TO TOP
     ============================================================ */
  let scrollHandler = null;

  function initScrollProgress() {
    const sections = document.querySelectorAll('main section[id]');
    const navLinks = document.querySelectorAll('.nav-center a');
    const progressBar = document.getElementById('progress');
    const toTopBtn = document.getElementById('toTop');

    if (scrollHandler) {
      window.removeEventListener('scroll', scrollHandler);
    }

    scrollHandler = () => {
      // In-page section active indicator
      if (sections.length > 0 && navLinks.length > 0) {
        let current = '';
        sections.forEach((s) => {
          if (window.scrollY >= s.offsetTop - 180) {
            current = s.id;
          }
        });
        navLinks.forEach((a) => {
          const href = a.getAttribute('href') || '';
          const hash = href.includes('#') ? href.split('#')[1] : '';
          if (hash) {
            a.classList.toggle('on', hash === current);
          }
        });
      }

      // Scroll progress bar
      if (progressBar && !isTransitioning) {
        const h = document.documentElement;
        const max = h.scrollHeight - h.clientHeight;
        const scrolled = max > 0 ? (h.scrollTop / max) * 100 : 0;
        progressBar.style.opacity = '1';
        progressBar.style.width = scrolled + '%';
      }

      // Back to top button visibility
      if (toTopBtn) {
        toTopBtn.classList.toggle('show', window.scrollY > 500);
      }
    };

    window.addEventListener('scroll', scrollHandler, { passive: true });

    if (toTopBtn) {
      toTopBtn.onclick = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      };
    }
  }

  /* ============================================================
     5. LIVE CLOCK (Ongole IST — UTC+5:30)
     ============================================================ */
  let clockInterval = null;

  function initClock() {
    const clockEl = document.getElementById('clock');
    if (!clockEl) return;

    function tick() {
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const ist = new Date(utc + 5.5 * 3600000);
      const h = String(ist.getHours()).padStart(2, '0');
      const m = String(ist.getMinutes()).padStart(2, '0');
      const s = String(ist.getSeconds()).padStart(2, '0');
      clockEl.textContent = `Ongole · ${h}:${m}:${s}`;
    }

    tick();
    if (!clockInterval) {
      clockInterval = setInterval(tick, 1000);
    }
  }

  /* ============================================================
     6. CODE BLOCK COPY BUTTONS
     ============================================================ */
  function initCodeCopy() {
    document.querySelectorAll('.code-copy-btn').forEach((btn) => {
      btn.onclick = async () => {
        const codeBlock = btn.closest('.code-wrapper')?.querySelector('pre code');
        if (!codeBlock) return;
        try {
          await navigator.clipboard.writeText(codeBlock.innerText);
          const originalText = btn.innerHTML;
          btn.classList.add('copied');
          btn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6L9 17l-5-5"/></svg> Copied!`;
          setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = originalText;
          }, 2200);
        } catch (err) {
          console.error('Failed to copy code', err);
        }
      };
    });
  }

  /* ============================================================
     7. PROJECT TABLE OF CONTENTS SCROLLSPY
     ============================================================ */
  function initTocScrollspy() {
    const tocLinks = document.querySelectorAll('.project-toc a');
    const projectBlocks = document.querySelectorAll('.project-block');

    if (tocLinks.length > 0 && projectBlocks.length > 0) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const id = entry.target.getAttribute('id');
              tocLinks.forEach((link) => {
                link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
              });
            }
          });
        },
        { rootMargin: '-20% 0px -70% 0px' }
      );

      projectBlocks.forEach((block) => observer.observe(block));
    }
  }

  /* ============================================================
     8. FLUID PAGE & NAVBAR TRANSITIONS (SPA ENGINE)
     ============================================================ */
  async function fetchPage(url) {
    const cleanUrl = url.split('#')[0];
    if (pageCache.has(cleanUrl)) {
      return pageCache.get(cleanUrl);
    }
    const response = await fetch(cleanUrl, {
      headers: { 'X-Requested-With': 'Antigravity-Page' }
    });
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    const html = await response.text();
    pageCache.set(cleanUrl, html);
    return html;
  }

  function prefetch(url) {
    const cleanUrl = url.split('#')[0];
    if (!cleanUrl || pageCache.has(cleanUrl)) return;
    fetch(cleanUrl, { priority: 'low' })
      .then((res) => (res.ok ? res.text() : null))
      .then((html) => {
        if (html) pageCache.set(cleanUrl, html);
      })
      .catch(() => {});
  }

  async function navigateTo(targetUrl, push = true) {
    if (isTransitioning) return;
    isTransitioning = true;

    const progressBar = document.getElementById('progress');
    const mainEl = document.getElementById('main');
    const targetHash = targetUrl.includes('#') ? targetUrl.split('#')[1] : null;

    // Top progress indicator
    if (progressBar) {
      progressBar.style.opacity = '1';
      progressBar.style.width = '35%';
    }

    let htmlText = null;
    try {
      htmlText = await fetchPage(targetUrl);
    } catch (fetchErr) {
      console.warn('Fetch failed, falling back to full navigation:', fetchErr);
      window.location.href = targetUrl;
      return;
    }

    if (progressBar) {
      progressBar.style.width = '75%';
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, 'text/html');

    const newTitle = doc.querySelector('title')?.textContent || document.title;
    const newMain = doc.querySelector('#main')?.innerHTML;
    const newNavW = doc.querySelector('nav .nav-w')?.innerHTML;
    const newBodyClass = doc.body.className;

    if (!newMain) {
      window.location.href = targetUrl;
      return;
    }

    // Quick gentle exit on current view
    if (mainEl) {
      mainEl.style.transition = 'opacity 0.12s ease, transform 0.12s ease';
      mainEl.style.opacity = '0';
      mainEl.style.transform = 'translateY(-6px)';
      await new Promise((r) => setTimeout(r, 120));
    }

    // Swap DOM
    document.title = newTitle;
    document.body.className = newBodyClass;

    if (mainEl) {
      mainEl.innerHTML = newMain;
    }

    const navW = document.querySelector('nav .nav-w');
    if (navW && newNavW) {
      navW.innerHTML = newNavW;
    }

    if (push) {
      history.pushState({ path: targetUrl }, newTitle, targetUrl);
    }

    // Handle scroll position
    if (targetHash) {
      const targetEl = document.getElementById(targetHash);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth' });
      } else {
        window.scrollTo(0, 0);
      }
    } else {
      window.scrollTo(0, 0);
    }

    // Re-initialize interactive components
    initTheme();
    initMobileMenu();
    initClock();
    initScrollReveal();
    initScrollProgress();
    initCodeCopy();
    initTocScrollspy();

    // Fluid smooth enter animation on newly injected content
    if (mainEl) {
      mainEl.style.transition = 'none';
      mainEl.style.opacity = '0';
      mainEl.style.transform = 'translateY(12px)';

      // Force layout reflow
      void mainEl.offsetHeight;

      mainEl.style.transition = 'opacity 0.32s cubic-bezier(0.16, 1, 0.3, 1), transform 0.32s cubic-bezier(0.16, 1, 0.3, 1)';
      mainEl.style.opacity = '1';
      mainEl.style.transform = 'translateY(0)';
    }

    // Complete top progress indicator
    if (progressBar) {
      progressBar.style.width = '100%';
      setTimeout(() => {
        progressBar.style.opacity = '0';
        setTimeout(() => {
          progressBar.style.width = '0%';
        }, 220);
      }, 140);
    }

    isTransitioning = false;
  }

  function setupLinkInterception() {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href) return;

      // Ignore external, hash-only, new-tab, or download links
      if (
        link.target === '_blank' ||
        link.hasAttribute('download') ||
        link.getAttribute('rel') === 'external' ||
        href.startsWith('mailto:') ||
        href.startsWith('tel:') ||
        href.startsWith('javascript:') ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        return;
      }

      const currentOrigin = window.location.origin;
      const targetUrl = new URL(href, window.location.href);

      if (targetUrl.origin !== currentOrigin) return;

      const currentPath = window.location.pathname;
      const targetPath = targetUrl.pathname;
      const targetHash = targetUrl.hash;

      // Same-page anchor click
      if (currentPath === targetPath && targetHash) {
        const targetEl = document.querySelector(targetHash);
        if (targetEl) {
          e.preventDefault();
          targetEl.scrollIntoView({ behavior: 'smooth' });
          history.pushState(null, '', targetUrl.href);
          return;
        }
      }

      // Same-page reload without hash
      if (currentPath === targetPath && !targetHash) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // Different page transition
      e.preventDefault();
      navigateTo(targetUrl.href, true);
    });

    // Hover prefetching for instantaneous transitions
    document.addEventListener(
      'pointerover',
      (e) => {
        const link = e.target.closest('a');
        if (!link) return;
        const href = link.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('mailto:') || link.target === '_blank') return;
        try {
          const targetUrl = new URL(href, window.location.href);
          if (targetUrl.origin === window.location.origin && targetUrl.pathname !== window.location.pathname) {
            prefetch(targetUrl.href);
          }
        } catch (err) {}
      },
      { passive: true }
    );

    // Handle browser back/forward buttons
    window.addEventListener('popstate', () => {
      navigateTo(window.location.href, false);
    });
  }

  /* ============================================================
     INIT ON DOM LOAD
     ============================================================ */
  document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initMobileMenu();
    initClock();
    initScrollReveal();
    initScrollProgress();
    initCodeCopy();
    initTocScrollspy();
    setupLinkInterception();
  });
})();
