/* ============================================
   JSDESIGN — MAIN.JS
   Menu, actieve sectie, scroll-animaties, contactformulier (Supabase), e-mailadressen, "Mijn proces",
   de lightbox van Sanctus Fusion en de paginaovergang. De 3D-scènes staan in src/3d/ (gebundeld als js/3d.js).
   ============================================ */

const minderBeweging = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.addEventListener('DOMContentLoaded', function () {
  initMenu();
  initActieveSectie();
  initReveal();
  initMail();
  initContactForm();
  initLiveVoorbeelden();
  initProcess();
  initLightbox();
  initTransition();
  initOudeLinks();
  document.querySelectorAll('[data-jaar]').forEach(function (el) { el.textContent = String(new Date().getFullYear()); });
});

/* ---------- MENU (mobiel) ---------- */
function initMenu() {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('main-nav');
  if (!toggle || !nav) return;

  function zet(open) {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Menu sluiten' : 'Menu');
  }

  toggle.addEventListener('click', function () { zet(!nav.classList.contains('is-open')); });
  nav.addEventListener('click', function (e) { if (e.target.closest('a')) zet(false); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && nav.classList.contains('is-open')) { zet(false); toggle.focus(); }
  });
  document.addEventListener('click', function (e) {
    if (nav.classList.contains('is-open') && !e.target.closest('.site-header')) zet(false);
  });
}

/* ---------- OUDE LINKS ----------
   De 3D-printsectie heette #3dprint (oude site) en #3d-print; nu #printen (een id hoort met een letter te beginnen).
   Gedeelde links naar de oude adressen komen zo nog steeds goed uit. */
function initOudeLinks() {
  const OUD = { '#3dprint': 'printen', '#3d-print': 'printen' };
  function ga() {
    const doel = OUD[location.hash] && document.getElementById(OUD[location.hash]);
    if (doel) doel.scrollIntoView();
  }
  ga();
  window.addEventListener('hashchange', ga);
}

/* ---------- ACTIEVE SECTIE IN HET MENU ---------- */
function initActieveSectie() {
  const links = Array.from(document.querySelectorAll('.main-nav a[href^="#"]'));
  // getElementById: werkt met elke id, ook als die geen geldige CSS-selector zou zijn
  const secties = links.map(function (a) { return document.getElementById(a.getAttribute('href').slice(1)); }).filter(Boolean);
  if (!secties.length || !('IntersectionObserver' in window)) return;

  const zichtbaar = new Map();
  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) { zichtbaar.set(entry.target.id, entry.isIntersecting ? entry.intersectionRatio : 0); });
    // De sectie die het meest in beeld is (binnen de middelste strook van het scherm)
    let beste = null, hoogste = 0;
    zichtbaar.forEach(function (ratio, id) { if (ratio > hoogste) { hoogste = ratio; beste = id; } });
    links.forEach(function (a) {
      if (a.getAttribute('href') === '#' + beste) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  }, { rootMargin: '-35% 0px -45% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] });
  secties.forEach(function (s) { observer.observe(s); });
}

/* ---------- SCROLL-ANIMATIES ---------- */
function initReveal() {
  const items = document.querySelectorAll('.reveal');
  if (minderBeweging || !('IntersectionObserver' in window)) {
    items.forEach(function (el) { el.classList.add('is-revealed'); });
    return;
  }
  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-revealed');
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  items.forEach(function (el, i) {
    // Kaarten naast elkaar komen kort na elkaar binnen
    if (el.parentElement && el.parentElement.classList.contains('services')) el.style.transitionDelay = (i % 4) * 90 + 'ms';
    observer.observe(el);
  });
}

/* ---------- E-MAILADRES ----------
   Het adres staat gecodeerd in de HTML (data-mail: achterstevoren, in base64), zodat robots die het web afstruinen
   het niet vinden. Hier wordt het weer een gewone, klikbare link. Zonder JavaScript gaat de link naar het formulier. */
function decodeMail(code) {
  try { return atob(code || '').split('').reverse().join(''); } catch (e) { return ''; }
}

function initMail() {
  document.querySelectorAll('a[data-mail]').forEach(function (link) {
    const adres = decodeMail(link.dataset.mail);
    if (!/^[^\s@]+@[^\s@]+$/.test(adres)) return;
    link.href = 'mailto:' + adres;
    if (link.hasAttribute('data-mail-icon')) return;
    const tekst = link.querySelector('span') || link;
    tekst.textContent = adres;
  });
}

/* ---------- CONTACTFORMULIER ----------
   Gaat naar de Supabase-functie "formulier" (dezelfde als op jelgers3d.nl, met site: 'portfolio'). Die controleert
   alles, houdt spam tegen, slaat het bericht op en mailt een bevestiging naar de afzender en een overzicht naar mij.
   De invultijd gaat mee: robots versturen binnen een seconde, mensen niet. */
const BACKEND = document.documentElement.dataset.backend || '';

function verstuur(gegevens) {
  if (!BACKEND) return Promise.reject(new Error('Versturen lukt nu niet. Mail me gerust direct.'));
  return fetch(BACKEND, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(Object.assign({ site: 'portfolio', pagina: location.href, duur: Math.round(performance.now()) }, gegevens))
  }).catch(function () {
    throw new Error('Geen verbinding. Controleer je internet en probeer het opnieuw.');
  }).then(function (response) {
    return response.json().catch(function () { return {}; }).then(function (antwoord) {
      if (!response.ok || !antwoord.ok) throw new Error(antwoord.fout || 'Er ging iets mis bij het versturen. Probeer het opnieuw.');
      return antwoord;
    });
  });
}

// Meldingen per veld, onder het veld
const REGELS = {
  name: function (v) { return v.length < 2 ? 'Vul je naam in.' : ''; },
  email: function (v, input) { return !v ? 'Vul je e-mailadres in.' : (input.validity.typeMismatch || !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v) ? 'Dit e-mailadres lijkt niet te kloppen.' : ''); },
  message: function (v) { return v.length < 2 ? 'Vul je bericht in.' : ''; },
  privacy: function (v, input) { return input.checked ? '' : 'Vink dit aan om je bericht te kunnen versturen.'; }
};

function foutElement(input) {
  const id = input.getAttribute('aria-describedby');
  let el = id ? document.getElementById(id) : null;
  if (!el) {
    el = document.createElement('p');
    el.className = 'field-error';
    el.id = input.id + '-error';
    el.hidden = true;
    input.setAttribute('aria-describedby', el.id);
    input.insertAdjacentElement('afterend', el);
  }
  return el;
}

function controleerVeld(input) {
  const regel = REGELS[input.name];
  if (!regel) return true;
  const melding = regel(input.value.trim(), input);
  const el = foutElement(input);
  el.textContent = melding;
  el.hidden = !melding;
  input.setAttribute('aria-invalid', melding ? 'true' : 'false');
  return !melding;
}

function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;
  const melding = document.getElementById('form-msg');
  const knop = form.querySelector('button[type="submit"]');
  const knopHtml = knop.innerHTML;

  function zeg(html, ok) {
    melding.innerHTML = html;
    melding.className = 'form-msg ' + (ok ? 'form-msg-success' : 'form-msg-error');
  }

  // Controleer een veld als je het verlaat; na een fout ook tijdens het typen, zodat de melding meteen verdwijnt
  form.addEventListener('focusout', function (e) {
    if (REGELS[e.target.name] && e.target.value && e.target.type !== 'checkbox') controleerVeld(e.target);
  });
  form.addEventListener('input', function (e) {
    if (e.target.getAttribute('aria-invalid') === 'true') controleerVeld(e.target);
  });
  form.addEventListener('change', function (e) {
    if (e.target.type === 'checkbox' && REGELS[e.target.name]) controleerVeld(e.target);
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    let eerste = null;
    ['name', 'email', 'message', 'privacy'].forEach(function (naam) {
      const veld = form.elements[naam];
      if (veld && !controleerVeld(veld) && !eerste) eerste = veld;
    });
    if (eerste) { eerste.focus(); return; }

    knop.disabled = true;
    knop.textContent = 'Versturen...';
    melding.textContent = '';

    verstuur({
      soort: 'contact',
      naam: form.elements.name.value.trim(),
      email: form.elements.email.value.trim(),
      bericht: form.elements.message.value.trim(),
      akkoord: form.elements.privacy.checked,
      botcheck: form.elements.botcheck.checked
    }).then(function (antwoord) {
      zeg('Bedankt, je bericht is verstuurd!' + (antwoord.mail ? ' Je krijgt een bevestiging per mail.' : '') + ' Ik neem snel contact met je op.', true);
      form.reset();
      form.querySelectorAll('[aria-invalid]').forEach(function (el) { el.removeAttribute('aria-invalid'); });
    }).catch(function (fout) {
      const mail = document.querySelector('.contact-links a[href^="mailto:"]');
      zeg(escapeHtml(fout.message) + (mail ? ' Of <a href="' + mail.getAttribute('href') + '">mail me direct</a>.' : ''), false);
    }).finally(function () {
      knop.disabled = false;
      knop.innerHTML = knopHtml;
    });
  });
}

function escapeHtml(tekst) {
  return String(tekst).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
}

/* ---------- LIVE VOORBEELDEN VAN DE PROJECTEN ----------
   In de lijst staan screenshots. Een ingesloten site die bij het laden zelf iets focust (zoals het leeftijdsscherm van
   Brouwerij Rolduc) laat de pagina anders tijdens het scrollen naar zich toe springen (vooral op een telefoon), en
   haalt de focus weg uit het contactformulier. "inert" helpt niet: Chrome negeert dat bij sites van een ander domein.
   Daarom laadt de echte site alleen op een computer en pas na een klik op het voorbeeld; dan staat hij in beeld en
   wil je hem bedienen. Op een telefoon blijft het bij de screenshot en opent een tik de site. */
function initLiveVoorbeelden() {
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  document.querySelectorAll('.browser-body[data-live]').forEach(function (vak) {
    const knop = vak.querySelector('.browser-overlay');
    knop.setAttribute('aria-label', (vak.dataset.liveTitel || 'Live voorbeeld') + ' hier laden');
    const hint = document.createElement('p');
    hint.className = 'browser-hint';
    hint.setAttribute('aria-hidden', 'true');
    hint.textContent = 'Klik om de site hier live te bekijken';
    vak.appendChild(hint);

    knop.addEventListener('click', function (e) {
      e.preventDefault();
      if (vak.querySelector('.browser-frame')) return;
      const frame = document.createElement('iframe');
      frame.className = 'browser-frame';
      frame.title = vak.dataset.liveTitel || 'Live voorbeeld';
      frame.addEventListener('load', function () { vak.classList.add('is-live'); }, { once: true });
      frame.src = vak.dataset.live;
      vak.insertBefore(frame, knop);
      vak.classList.add('is-bedienbaar');
    });
  });
}

/* ---------- DIALOGEN ----------
   Native <dialog>: focus blijft erin, Escape sluit. Klik op de achtergrond sluit ook. */
function sluitBijAchtergrond(dialog, sluit) {
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) sluit();
  });
  dialog.querySelectorAll('[data-sluit]').forEach(function (knop) { knop.addEventListener('click', sluit); });
}

/* ---------- MIJN PROCES ---------- */
const PROCES = {
  rolduc: {
    titel: 'Brouwerij Rolduc',
    afbeelding: 'assets/img/project-rolduc-1400.webp',
    urlLabel: 'brouwerij-rolduc.nl',
    team: false,
    tekst: [
      'Dit project heb ik volledig zelfstandig ontworpen en gecodeerd. Vanaf het eerste gesprek met de opdrachtgever heb ik het hele traject doorlopen: van concept tot een werkend eindproduct.',
      'Gedurende het proces ben ik veel in contact geweest met de opdrachtgever. Niet alleen om te leveren wat hij voor ogen had, maar ook om actief mee te denken over wat er miste, wat beter kon en welke kansen hij misschien over het hoofd zag. Door tools zoals Web3Forms in te zetten, heb ik ervoor gezorgd dat de site niet alleen mooi is, maar ook optimaal functioneert.'
    ],
    skills: ['HTML & CSS', 'JavaScript', 'Web3Forms', 'UI Design', 'Klantcontact']
  },
  heerlen: {
    titel: 'Heerlen: miljarden kilo’s steenkool',
    afbeelding: 'assets/img/project-heerlen-1400.webp',
    urlLabel: 'Interactieve story',
    team: true,
    tekst: [
      'Dit project heb ik samen met een team gerealiseerd. Naast mijn visuele rol heb ik ook de volledige website geprogrammeerd. Ik heb de visuele stijl ontworpen, meegedacht over de opbouw en structuur van de video, en alles technisch tot leven gebracht in code.',
      'Daarnaast was ik verantwoordelijk voor het bedenken en schrijven van de content. Het was een fijne samenwerking waarbij iedereen zijn eigen expertise inbracht en we samen tot een sterk eindresultaat kwamen.'
    ],
    skills: ['HTML & CSS', 'JavaScript', 'Visual Design', 'Content Writing', 'Video Concept', 'Storytelling']
  },
  codemonster: {
    titel: 'CodeMonster',
    afbeelding: 'assets/img/project-codemonster-1400.webp',
    urlLabel: 'CodeMonster',
    team: true,
    tekst: [
      'Binnen dit groepsproject was ik verantwoordelijk voor het volledige design en de front-end development. Ik heb de website ontworpen en gecodeerd, en ervoor gezorgd dat alles goed werkte, inclusief het responsive design.',
      'Van wireframes tot het uiteindelijke werkende platform: ik zorgde ervoor dat de visuele identiteit en de technische uitvoering naadloos op elkaar aansloten.'
    ],
    skills: ['UI Design', 'HTML & CSS', 'JavaScript', 'Responsive Design']
  },
  sanctus: {
    titel: 'Sanctus Fusion',
    afbeelding: 'assets/img/sanctus-biertap-v2-1200.webp',
    urlLabel: 'Biertap-mockup',
    team: false,
    tekst: [
      'Bij dit project heb ik veel creatieve vrijheid gekregen, maar ik heb vooral in het begin regelmatig afgestemd met de opdrachtgever om te zorgen dat de richting klopte. Die basis gaf me vertrouwen om het concept verder uit te werken.',
      'Ik heb veel in Illustrator en Photoshop gewerkt. Toen het bier nog niet gebrouwen was, ben ik onderzoek gaan doen naar de smaakprofielen van de hopsoorten die in het bier verwerkt zouden worden. Dat vormde de basis voor mijn ontwerp. Daarnaast heb ik goed gekeken naar hoe andere merken hun IPA-bieren visueel positioneren en heb ik de huisstijl van Brouwerij Rolduc en Dé Wieëtsjaf gecombineerd tot een eigen, herkenbare stijl.'
    ],
    skills: ['Illustrator', 'Photoshop', 'InDesign', 'Branding', 'Onderzoek']
  }
};

function initProcess() {
  const dialog = document.getElementById('process-modal');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  // Een screenshot of mockup, geen ingesloten site: die zou de focus uit het venster kunnen trekken
  const plaatje = dialog.querySelector('.process-image');
  const badge = dialog.querySelector('[data-process-badge]');

  function open(sleutel) {
    const p = PROCES[sleutel];
    if (!p) return;
    badge.className = 'process-badge' + (p.team ? ' is-team' : '');
    badge.innerHTML = '<svg class="icon" aria-hidden="true"><use href="#i-' + (p.team ? 'team' : 'solo') + '"/></svg>' + (p.team ? 'Groepsproject' : 'Zelfstandig project');
    dialog.querySelector('#process-title').textContent = p.titel;
    dialog.querySelector('[data-process-url]').textContent = p.urlLabel;
    dialog.querySelector('[data-process-text]').innerHTML = p.tekst.map(function (t) { return '<p>' + escapeHtml(t) + '</p>'; }).join('');
    dialog.querySelector('[data-process-skills]').innerHTML = p.skills.map(function (s) { return '<li>' + escapeHtml(s) + '</li>'; }).join('');
    plaatje.src = p.afbeelding;
    plaatje.alt = p.titel + ': ' + p.urlLabel;
    dialog.showModal();
  }

  sluitBijAchtergrond(dialog, function () { dialog.close(); });
  document.querySelectorAll('[data-process]').forEach(function (knop) {
    knop.addEventListener('click', function () { open(knop.dataset.process); });
  });
}

/* ---------- SANCTUS FUSION: LIGHTBOX ---------- */
const BEELDEN = [
  { src: 'assets/img/sanctus-poster-1600.webp', alt: 'Poster van Sanctus Fusion', tekst: 'Poster' },
  { src: 'assets/img/sanctus-biertap-1600.webp', alt: 'Biertap met het Sanctus Fusion-logo', tekst: 'Biertap' },
  { src: 'assets/img/sanctus-blik-1600.webp', alt: 'Blikje Sanctus Fusion met productinformatie', tekst: 'Blikje' },
  { src: 'assets/img/sanctus-shirt-wit-1600.webp', alt: 'Wit t-shirt met de Sanctus Fusion-print', tekst: 'Merchandise, wit' },
  { src: 'assets/img/sanctus-shirt-zwart-1600.webp', alt: 'Zwart t-shirt met de Sanctus Fusion-print', tekst: 'Merchandise, zwart' }
];

function initLightbox() {
  const dialog = document.getElementById('lightbox');
  if (!dialog || typeof dialog.showModal !== 'function') return;
  const img = dialog.querySelector('.lightbox-img');
  const tekst = dialog.querySelector('[data-lightbox-tekst]');
  const teller = dialog.querySelector('[data-lightbox-teller]');
  let huidig = 0;

  function toon(index) {
    huidig = (index + BEELDEN.length) % BEELDEN.length;
    const b = BEELDEN[huidig];
    img.src = b.src;
    img.alt = b.alt;
    tekst.textContent = b.tekst;
    teller.textContent = (huidig + 1) + ' / ' + BEELDEN.length;
    // Het volgende beeld alvast ophalen
    new Image().src = BEELDEN[(huidig + 1) % BEELDEN.length].src;
  }

  document.querySelectorAll('[data-lightbox]').forEach(function (knop) {
    knop.addEventListener('click', function () {
      toon(Number(knop.dataset.lightbox) || 0);
      dialog.showModal();
    });
  });
  dialog.querySelectorAll('[data-stap]').forEach(function (knop) {
    knop.addEventListener('click', function () { toon(huidig + Number(knop.dataset.stap)); });
  });
  sluitBijAchtergrond(dialog, function () { dialog.close(); });
  dialog.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowLeft') toon(huidig - 1);
    if (e.key === 'ArrowRight') toon(huidig + 1);
  });

  // Vegen op een touchscreen
  let startX = null;
  dialog.addEventListener('touchstart', function (e) { startX = e.touches[0].clientX; }, { passive: true });
  dialog.addEventListener('touchend', function (e) {
    if (startX === null) return;
    const verschil = startX - e.changedTouches[0].clientX;
    if (Math.abs(verschil) > 50) toon(huidig + (verschil > 0 ? 1 : -1));
    startX = null;
  }, { passive: true });
}

/* ---------- PAGINAOVERGANG ----------
   Klik naar een andere pagina van de site (bv. de privacyverklaring): drie banden schuiven schuin over het scherm en
   het JS-teken valt in elkaar. Pas dan gaat de browser naar de nieuwe pagina, die achter hetzelfde doek begint (zie het
   scriptje in de <head>) en het weer wegschuift. Uitzonderen: data-no-transition op de link. */
function initTransition() {
  const html = document.documentElement;
  ['pc-arriving', 'pc-intro'].forEach(function (klasse) {
    if (html.classList.contains(klasse)) setTimeout(function () { html.classList.remove(klasse); }, 2000);
  });
  // Terug met de knop van de browser: de vorige pagina kan nog met het doek ervoor in het geheugen staan
  window.addEventListener('pageshow', function (e) { if (e.persisted) html.classList.remove('pc-leaving', 'pc-arriving', 'pc-intro'); });
  if (minderBeweging || !document.querySelector('.page-curtain')) return;

  document.addEventListener('click', function (e) {
    const link = e.target.closest('a[href]');
    if (!link || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if ((link.target && link.target !== '_self') || link.hasAttribute('download') || link.hasAttribute('data-no-transition')) return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
    if (!/(\/|\.html)$/.test(url.pathname)) return;
    e.preventDefault();
    try { sessionStorage.setItem('pc', String(Date.now())); } catch (err) { /* privévenster: dan alleen het vertrek */ }
    html.classList.remove('pc-arriving', 'pc-intro');
    html.classList.add('pc-leaving');
    let weg = false;
    function ga() { if (!weg) { weg = true; location.href = url.href; } }
    const laatste = document.querySelector('.pc-band-3');
    if (laatste) laatste.addEventListener('animationend', ga, { once: true });
    setTimeout(ga, 1100);
  });
}
