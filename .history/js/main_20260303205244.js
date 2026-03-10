/* ============================================
   JELGER PORTFOLIO — MAIN.JS
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initScrollAnimations();
  initNavbarScroll();
  initContactForm();
  setFooterYear();
});

/* ---------- MOBILE MENU ---------- */
function initMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileLinks = mobileMenu?.querySelectorAll('a');
  const iconOpen = document.getElementById('icon-menu');
  const iconClose = document.getElementById('icon-close');

  if (!hamburger || !mobileMenu) return;

  hamburger.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', isOpen.toString());

    if (iconOpen && iconClose) {
      iconOpen.style.display = isOpen ? 'none' : 'block';
      iconClose.style.display = isOpen ? 'block' : 'none';
    }
  });

  // Close menu when clicking a link
  mobileLinks?.forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      hamburger.setAttribute('aria-expanded', 'false');
      if (iconOpen && iconClose) {
        iconOpen.style.display = 'block';
        iconClose.style.display = 'none';
      }
    });
  });
}

/* ---------- SCROLL ANIMATIONS (Intersection Observer) ---------- */
function initScrollAnimations() {
  const elements = document.querySelectorAll('.fade-in, .fade-in-left, .fade-in-right');

  if (!elements.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target); // Only animate once
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  elements.forEach(el => observer.observe(el));
}

/* ---------- NAVBAR SCROLL EFFECT ---------- */
function initNavbarScroll() {
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;

  let lastScroll = 0;

  window.addEventListener('scroll', () => {
    const currentScroll = window.scrollY;

    if (currentScroll > 100) {
      navbar.style.borderBottomColor = 'rgba(42, 45, 53, 0.8)';
    } else {
      navbar.style.borderBottomColor = '';
    }

    lastScroll = currentScroll;
  }, { passive: true });
}

/* ---------- CONTACT FORM (Web3Forms) ---------- */
function initContactForm() {
  const form = document.getElementById('contact-form');
  const feedback = document.getElementById('form-feedback');
  const submitBtn = document.getElementById('submit-btn');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Basic client-side validation
    const name = form.name.value.trim();
    const email = form.email.value.trim();
    const message = form.message.value.trim();

    if (!name || !email || !message) {
      showFeedback('Vul alle velden in.', 'error');
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showFeedback('Vul een geldig e-mailadres in.', 'error');
      return;
    }

    // Disable button while sending
    submitBtn.disabled = true;
    submitBtn.querySelector('span').textContent = 'Versturen...';

    try {
      const formData = new FormData(form);
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (data.success) {
        showFeedback('Bericht verstuurd! Ik neem zo snel mogelijk contact op.', 'success');
        form.reset();
      } else {
        showFeedback('Er ging iets mis. Probeer het opnieuw of mail direct.', 'error');
      }
    } catch (err) {
      showFeedback('Netwerkfout. Controleer je internetverbinding en probeer opnieuw.', 'error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.querySelector('span').textContent = 'Verstuur bericht';
    }
  });

  function showFeedback(msg, type) {
    if (!feedback) return;
    feedback.textContent = msg;
    feedback.hidden = false;
    feedback.className = `form-feedback form-feedback--${type}`;

    // Auto-hide success after 6s
    if (type === 'success') {
      setTimeout(() => { feedback.hidden = true; }, 6000);
    }
  }
}

/* ---------- FOOTER YEAR ---------- */
function setFooterYear() {
  const yearEl = document.getElementById('footer-year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear().toString();
  }
}

/* ---------- SMOOTH SCROLL for anchor links (snap-compatible) ---------- */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const targetId = this.getAttribute('href');
    if (!targetId || targetId === '#') return;

    const target = document.querySelector(targetId);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
