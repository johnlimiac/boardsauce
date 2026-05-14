'use strict';

function toggleNav() {
  const nav = document.querySelector('.tl-nav');
  if (!nav) return;
  const isOpen = nav.classList.toggle('menu-open');
  const btn = nav.querySelector('.tl-hamburger');
  if (btn) btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
}

document.addEventListener('click', function (e) {
  if (!e.target.closest('.tl-nav')) {
    const nav = document.querySelector('.tl-nav');
    if (nav) {
      nav.classList.remove('menu-open');
      const btn = nav.querySelector('.tl-hamburger');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    }
  }
});

// Close on Escape key
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') {
    const nav = document.querySelector('.tl-nav');
    if (nav) nav.classList.remove('menu-open');
  }
});
