/* ============================================
   JELGER PORTFOLIO — MAIN.JS
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  initMobileMenu();
  initScrollAnimations();
  initNavbarScroll();
  initContactForm();
  setFooterYear();
  initSanctusCarousel();
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

/* ---------- SANCTUS FUSION CAROUSEL & LIGHTBOX ---------- */
function initSanctusCarousel() {
  const track = document.querySelector('.sanctus__carousel-track');
  const slides = document.querySelectorAll('.sanctus__carousel-slide');
  const prevBtn = document.querySelector('.sanctus__carousel-btn--prev');
  const nextBtn = document.querySelector('.sanctus__carousel-btn--next');
  const dotsContainer = document.querySelector('.sanctus__carousel-dots');
  const lightbox = document.getElementById('sanctus-lightbox');

  if (!track || slides.length === 0) return;

  let currentIndex = 0;
  let slidesPerView = getSlidesPerView();
  let maxIndex = Math.max(0, slides.length - slidesPerView);

  function getSlidesPerView() {
    if (window.innerWidth <= 480) return 1;
    if (window.innerWidth <= 768) return 2;
    return 3;
  }

  // Build dots
  function buildDots() {
    dotsContainer.innerHTML = '';
    const dotCount = maxIndex + 1;
    for (let i = 0; i < dotCount; i++) {
      const dot = document.createElement('button');
      dot.classList.add('sanctus__carousel-dot');
      dot.setAttribute('aria-label', 'Ga naar afbeelding ' + (i + 1));
      if (i === currentIndex) dot.classList.add('active');
      dot.addEventListener('click', () => goTo(i));
      dotsContainer.appendChild(dot);
    }
  }

  function updateCarousel() {
    const slideWidth = 100 / slidesPerView;
    track.style.transform = 'translateX(-' + (currentIndex * slideWidth) + '%)';

    // Update dots
    dotsContainer.querySelectorAll('.sanctus__carousel-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === currentIndex);
    });
  }

  function goTo(index) {
    currentIndex = Math.max(0, Math.min(index, maxIndex));
    updateCarousel();
  }

  prevBtn.addEventListener('click', () => goTo(currentIndex - 1));
  nextBtn.addEventListener('click', () => goTo(currentIndex + 1));

  // Touch/swipe support
  let startX = 0;
  let isDragging = false;

  track.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    isDragging = true;
  }, { passive: true });

  track.addEventListener('touchend', (e) => {
    if (!isDragging) return;
    isDragging = false;
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? goTo(currentIndex + 1) : goTo(currentIndex - 1);
    }
  }, { passive: true });

  // Responsive resize
  window.addEventListener('resize', () => {
    slidesPerView = getSlidesPerView();
    maxIndex = Math.max(0, slides.length - slidesPerView);
    if (currentIndex > maxIndex) currentIndex = maxIndex;
    buildDots();
    updateCarousel();
  });

  // Lightbox — click to open
  slides.forEach(slide => {
    slide.addEventListener('click', () => {
      const img = slide.querySelector('img');
      if (!img) return;
      const lbImg = lightbox.querySelector('img');
      lbImg.src = img.src;
      lbImg.alt = img.alt;
      lightbox.classList.add('active');
      lightbox.setAttribute('aria-hidden', 'false');
    });
  });

  // Close lightbox on click
  lightbox.addEventListener('click', () => {
    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden', 'true');
  });

  // Close lightbox on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('active')) {
      lightbox.classList.remove('active');
      lightbox.setAttribute('aria-hidden', 'true');
    }
  });

  buildDots();
  updateCarousel();
}
