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
  initProcessToggles();
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
  const preview = document.getElementById('sanctus-preview');
  const lightbox = document.getElementById('sanctus-lightbox');
  if (!preview || !lightbox) return;

  const images = [
    { src: 'assets/POSTER-SANCTUS-FUSION.jpg', alt: 'Sanctus Fusion poster ontwerp' },
    { src: 'assets/Beer-Tap-Mockup.jpg', alt: 'Sanctus Fusion biertap mockup' },
    { src: 'assets/Can-Mockup-Sanctus-Fusion-Info.jpg', alt: 'Sanctus Fusion blikje mockup' },
    { src: 'assets/Sanctus-Fusion-Merchandise-T-Shirt.jpg', alt: 'Sanctus Fusion t-shirt wit' },
    { src: 'assets/Sanctus-Fusion-Merchandise-T-Shirt-Zwart.jpg', alt: 'Sanctus Fusion t-shirt zwart' }
  ];

  const lbImg = lightbox.querySelector('.sanctus__lightbox-img img');
  const lbCounter = lightbox.querySelector('.sanctus__lightbox-counter');
  const closeBtn = lightbox.querySelector('.sanctus__lightbox-close');
  const prevBtn = lightbox.querySelector('.sanctus__lightbox-btn--prev');
  const nextBtn = lightbox.querySelector('.sanctus__lightbox-btn--next');
  let currentIndex = 0;

  function showImage(index) {
    // Infinite loop
    if (index < 0) index = images.length - 1;
    if (index >= images.length) index = 0;
    currentIndex = index;
    lbImg.src = images[currentIndex].src;
    lbImg.alt = images[currentIndex].alt;
    lbCounter.textContent = (currentIndex + 1) + ' / ' + images.length;
  }

  function openLightbox() {
    showImage(0);
    lightbox.classList.add('active');
    lightbox.setAttribute('aria-hidden', 'false');
  }

  function closeLightbox() {
    lightbox.classList.remove('active');
    lightbox.setAttribute('aria-hidden', 'true');
  }

  // Open on preview click
  preview.addEventListener('click', openLightbox);
  preview.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLightbox(); }
  });

  // Navigation
  prevBtn.addEventListener('click', (e) => { e.stopPropagation(); showImage(currentIndex - 1); });
  nextBtn.addEventListener('click', (e) => { e.stopPropagation(); showImage(currentIndex + 1); });

  // Close
  closeBtn.addEventListener('click', (e) => { e.stopPropagation(); closeLightbox(); });
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  // Keyboard
  document.addEventListener('keydown', (e) => {
    if (!lightbox.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') showImage(currentIndex - 1);
    if (e.key === 'ArrowRight') showImage(currentIndex + 1);
  });

  // Touch swipe in lightbox
  let startX = 0;
  lightbox.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
  lightbox.addEventListener('touchend', (e) => {
    const diff = startX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      diff > 0 ? showImage(currentIndex + 1) : showImage(currentIndex - 1);
    }
  }, { passive: true });
}

/* ---------- PROJECT PROCESS MODAL ---------- */
function initProcessToggles() {
  const modal = document.getElementById('process-modal');
  if (!modal) return;

  const backdrop = modal.querySelector('.process-modal__backdrop');
  const closeBtn = modal.querySelector('.process-modal__close');
  const browserUrl = modal.querySelector('.process-modal__browser-url');
  const browserBody = modal.querySelector('.process-modal__browser-body');
  const iframe = modal.querySelector('.process-modal__iframe');
  const badgeEl = modal.querySelector('.process-modal__badge');
  const titleEl = modal.querySelector('.process-modal__title');
  const textEl = modal.querySelector('.process-modal__text');
  const skillsEl = modal.querySelector('.process-modal__skills');

  // Process data per project
  const processData = {
    rolduc: {
      title: 'Brouwerij Rolduc',
      url: 'https://www.brouwerij-rolduc.nl',
      urlLabel: 'brouwerij-rolduc.nl',
      badge: 'solo',
      badgeLabel: 'Zelfstandig project',
      text: [
        'Dit project heb ik volledig zelfstandig ontworpen en gecodeerd. Vanaf het eerste gesprek met de opdrachtgever heb ik het hele traject doorlopen: van concept tot een werkend eindproduct.',
        'Gedurende het proces ben ik veel in contact geweest met de opdrachtgever. Niet alleen om te leveren wat hij voor ogen had, maar ook om actief mee te denken over wat er miste, wat beter kon en welke kansen hij misschien over het hoofd zag. Door tools zoals Web3Forms in te zetten, heb ik ervoor gezorgd dat de site niet alleen mooi is, maar ook optimaal functioneert.'
      ],
      skills: ['HTML & CSS', 'JavaScript', 'Web3Forms', 'UI Design', 'Klantcontact']
    },
    heerlen: {
      title: 'Heerlen: Miljarden kilo\u2019s steenkool',
      url: 'https://mia-mms-2526.github.io/team03/',
      urlLabel: 'Interactieve Story',
      badge: 'team',
      badgeLabel: 'Groepsproject',
      text: [
        'Dit project heb ik samen met een team gerealiseerd. Naast mijn visuele rol heb ik ook de volledige website geprogrammeerd. Ik heb de visuele stijl ontworpen, meegedacht over de opbouw en structuur van de video, en alles technisch tot leven gebracht in code.',
        'Daarnaast was ik verantwoordelijk voor het bedenken en schrijven van de content. Het was een fijne samenwerking waarbij iedereen zijn eigen expertise inbracht en we samen tot een sterk eindresultaat kwamen.'
      ],
      skills: ['HTML & CSS', 'JavaScript', 'Visual Design', 'Content Writing', 'Video Concept', 'Storytelling']
    },
    codemonster: {
      title: 'CodeMonster',
      url: 'https://mia-dp-2425.github.io/team01/index.html',
      urlLabel: 'CodeMonster Platform',
      badge: 'team',
      badgeLabel: 'Groepsproject',
      text: [
        'Binnen dit groepsproject was ik verantwoordelijk voor het volledige design en de front-end development. Ik heb de website ontworpen en gecodeerd, en ervoor gezorgd dat alles goed werkte \u2014 inclusief het responsive design.',
        'Van wireframes tot het uiteindelijke werkende platform: ik zorgde ervoor dat de visuele identiteit en de technische uitvoering naadloos op elkaar aansloten.'
      ],
      skills: ['UI Design', 'HTML & CSS', 'JavaScript', 'Responsive Design']
    },
    sanctus: {
      title: 'Sanctus Fusion',
      url: null,
      urlLabel: null,
      previewImage: 'assets/Beer-Tap-Mockup-V2.jpg',
      badge: 'solo',
      badgeLabel: 'Zelfstandig project',
      text: [
        'Bij dit project heb ik veel creatieve vrijheid gekregen, maar ik heb vooral in het begin regelmatig afgestemd met de opdrachtgever om te zorgen dat de richting klopte. Die basis gaf me vertrouwen om het concept verder uit te werken.',
        'Ik heb veel in Illustrator en Photoshop gewerkt. Toen het bier nog niet gebrouwen was, ben ik onderzoek gaan doen naar de smaakprofielen van de hopsoorten die in het bier verwerkt zouden worden. Dat vormde de basis voor mijn ontwerp. Daarnaast heb ik goed gekeken naar hoe andere merken hun IPA-bieren visueel positioneren en heb ik de huisstijl van Brouwerij Rolduc en D\u00e9 Wie\u00ebtsjaf gecombineerd tot een eigen, herkenbare stijl.'
      ],
      skills: ['Illustrator', 'Photoshop', 'InDesign', 'Branding', 'Onderzoek']
    }
  };

  const soloIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
  const teamIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>';

  function openModal(key) {
    const data = processData[key];
    if (!data) return;

    // Set badge
    badgeEl.className = 'process-modal__badge process-modal__badge--' + data.badge;
    badgeEl.innerHTML = (data.badge === 'solo' ? soloIcon : teamIcon) + ' ' + data.badgeLabel;

    // Set title
    titleEl.textContent = data.title;

    // Set text
    textEl.innerHTML = data.text.map(function(p) { return '<p>' + p + '</p>'; }).join('');

    // Set skills
    skillsEl.innerHTML = data.skills.map(function(s) { return '<span>' + s + '</span>'; }).join('');

    // Set preview (iframe or image)
    if (data.url) {
      browserUrl.textContent = data.urlLabel;
      browserUrl.style.display = '';
      iframe.src = data.url;
      iframe.style.display = '';

      // Remove any existing image
      var existingImg = browserBody.querySelector('.process-modal__image-preview');
      if (existingImg) existingImg.remove();
    } else {
      browserUrl.textContent = 'Preview';
      iframe.style.display = 'none';
      iframe.src = '';

      // Show image instead
      var existingImg = browserBody.querySelector('.process-modal__image-preview');
      if (existingImg) existingImg.remove();

      if (data.previewImage) {
        var img = document.createElement('img');
        img.src = data.previewImage;
        img.alt = data.title + ' preview';
        img.className = 'process-modal__image-preview';
        browserBody.appendChild(img);
      }
    }

    // Show modal
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('modal-open');
  }

  function closeModal() {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('modal-open');

    // Clear iframe after transition
    setTimeout(function() {
      iframe.src = '';
    }, 400);
  }

  // Attach toggle buttons
  document.querySelectorAll('.project__process-toggle').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var key = btn.getAttribute('data-process');
      openModal(key);
    });
  });

  // Close handlers
  closeBtn.addEventListener('click', closeModal);
  backdrop.addEventListener('click', closeModal);

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal.classList.contains('active')) {
      closeModal();
    }
  });
}
