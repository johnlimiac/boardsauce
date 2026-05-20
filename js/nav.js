'use strict';

function toggleNav() {
  // Find all navs, but prioritize the one that was actually clicked or is visible
  const navs = document.querySelectorAll('.tl-nav');
  let activeNav = null;

  // If called from an event, find the specific nav
  if (window.event && window.event.currentTarget) {
    activeNav = window.event.currentTarget.closest('.tl-nav');
  }

  // Fallback: find the first visible nav
  if (!activeNav) {
    for (const nav of navs) {
      if (nav.offsetParent !== null) {
        activeNav = nav;
        break;
      }
    }
  }

  // Final fallback
  if (!activeNav) activeNav = navs[0];
  if (!activeNav) return;

  const isOpen = activeNav.classList.toggle('menu-open');
  const btn = activeNav.querySelector('.tl-hamburger');
  if (btn) btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

document.addEventListener('click', function (e) {
  if (!e.target.closest('.tl-nav')) {
    const navs = document.querySelectorAll('.tl-nav');
    navs.forEach(nav => {
      nav.classList.remove('menu-open');
      const btn = nav.querySelector('.tl-hamburger');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
  }
});

// Close on Escape key
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    const navs = document.querySelectorAll('.tl-nav');
    navs.forEach(nav => nav.classList.remove('menu-open'));
  }
});
