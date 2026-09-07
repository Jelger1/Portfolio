/* ============================================
   JELLY-BOT BACKEND — server.js
   Proxy tussen de portfolio-site en de OpenAI API.
   De API key staat NOOIT in de frontend; alleen hier
   (lokaal via server/.env, op Render via Environment Variables).
   ============================================ */

require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();

/* ---------- Config ---------- */
const PORT = process.env.PORT || 3000;
const OPENAI_API_KEY = (process.env.OPENAI_API_KEY || '').trim();
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
const OPENAI_BASE_URL = (process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(/\/+$/, '');
const OPENAI_TIMEOUT_MS = 30_000;
const IS_RENDER = Boolean(process.env.RENDER); // Render zet deze env var automatisch

const MAX_MESSAGES = 20;          // max. aantal berichten uit de geschiedenis dat we meesturen
const MAX_CONTENT_LENGTH = 2000;  // max. tekens per bericht
const RATE_LIMIT = { windowMs: 60_000, max: 20 }; // per IP per minuut

if (!OPENAI_API_KEY) {
  console.error('⚠️  OPENAI_API_KEY ontbreekt. Zet hem in server/.env (lokaal) of bij Render → Environment.');
} else if (!OPENAI_API_KEY.startsWith('sk-')) {
  console.warn('⚠️  OPENAI_API_KEY ziet er niet uit als een OpenAI key (begint niet met "sk-").');
}

// Render draait achter een proxy; nodig voor een correct req.ip (rate limiting)
app.set('trust proxy', 1);
app.disable('x-powered-by');

/* ---------- CORS ---------- */
const ALLOWED_ORIGINS = [
  'https://jelger1.github.io',
  'https://jelgersieler.nl',
  'https://www.jelgersieler.nl',
];
// Lokale ontwikkeling: elke poort op localhost / 127.0.0.1 (Live Server, http-server, etc.)
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

function isAllowedOrigin(origin) {
  return ALLOWED_ORIGINS.includes(origin) || LOCAL_ORIGIN.test(origin);
}

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Vary', 'Origin');
  }
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Max-Age', '86400');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: '50kb' }));

/* ---------- Static files (alleen lokaal) ----------
   Lokaal serveert de server ook de portfolio zelf, zodat je op
   http://localhost:3000 de site + chatbot kunt testen.
   Op Render staat de site op GitHub Pages en is dit niet nodig. */
if (!IS_RENDER) {
  app.use('/server', (req, res) => res.sendStatus(404)); // server-map nooit serveren
  app.use(express.static(path.join(__dirname, '..'), { dotfiles: 'ignore' }));
}

/* ---------- Rate limiting (simpel, in-memory) ---------- */
const hits = new Map();

function rateLimit(req, res, next) {
  const now = Date.now();
  const key = req.ip || 'unknown';
  let entry = hits.get(key);
  if (!entry || now - entry.start > RATE_LIMIT.windowMs) {
    entry = { start: now, count: 0 };
    hits.set(key, entry);
  }
  entry.count += 1;
  if (entry.count > RATE_LIMIT.max) {
    return res.status(429).json({ error: 'Rustig aan 😅 Je stuurt te veel berichten. Probeer het over een minuutje opnieuw.' });
  }
  next();
}

// Oude entries opruimen
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of hits) {
    if (now - entry.start > RATE_LIMIT.windowMs) hits.delete(key);
  }
}, RATE_LIMIT.windowMs).unref();

/* ---------- System prompt ---------- */
const SYSTEM_PROMPT = `Je bent Jelly-bot, de vriendelijke en behulpzame chatbot-assistent op het portfolio van Jelger. Je beantwoordt vragen in het Nederlands, tenzij de bezoeker in een andere taal schrijft.

OVER JELGER:
- Jelger is een maker die pas stopt als iets optimaal werkt — Designer, Developer & Maker met 2+ jaar intensieve ervaring en 7+ afgeronde projecten (van websites tot museum-exposities).
- Hij ontwerpt en bouwt digitale en fysieke producten die niet alleen mooi zijn, maar ook écht werken.
- Van concept tot code en 3D-print, met oog voor detail en een passie voor innovatie.
- Hij gebruikt AI als slimme assistent om zijn workflow te verbeteren, maar de unieke afwerking en het menselijke design staan altijd centraal.
- Zijn 3D-prints (BambuLab FDM) zijn eigen ontwerpen die o.a. bij het Discovery Museum en het Nationaal Mijn Museum liggen.

DIENSTEN:
1. UX Design — Intuïtieve ervaringen gebaseerd op onderzoek, testen en empathie.
2. UI Design — Pixel-perfect visuele ontwerpen: knoppen, typografie, kleur, interactie. Consistent en schaalbaar.
3. Product Design — Van strategie tot pixel, verantwoordelijk voor het hele digitale product. Business, gebruiker én techniek.
4. Interaction Design — Micro-interacties, animaties en overgangen. De logica en flow tussen mens en machine.
5. Front-end Development — Designs tot leven brengen in VS Code met HTML, CSS en JavaScript. Schrijft eigen code en gebruikt AI als slimme assistent voor een vlekkeloos resultaat.
6. 3D Printing — Van uniek digitaal ontwerp naar fysiek product. Custom prints en prototypes voor musea, winkels en bedrijven.

SKILLS & TOOLS:
- Figma
- Adobe Creative Cloud (Photoshop, Illustrator, InDesign)
- Spline
- Design Systems
- User Research
- Prototyping
- 3D Modeling & Printing (BambuLab FDM)

3D PRINT BEDRIJF — JelgerS3D:
- Website: https://jelgers3d.nl
- Jelger runt naast zijn designwerk een eigen 3D print bedrijf.
- Diensten: custom ontwerpen (unieke 3D modellen op maat), prototyping (snel van idee naar model), kleine productieseries (productie op bestelling), snelle levering (korte doorlooptijden).
- Professionele BambuLab FDM printers.
- Producten liggen o.a. in het Discovery Museum, het Nationaal Mijn Museum en Boekhandel Deurenberg.
- Materialen: PLA, PETG, TPU (FDM).
- Levertijd is doorgaans 3-7 werkdagen, afhankelijk van complexiteit en drukte.
- Voor prijzen en levertijden: neem contact op via het contactformulier of mail naar sielerjelger@gmail.com. Prijzen zijn afhankelijk van formaat, materiaal, complexiteit en aantal stuks.

PROJECTEN:
1. Brouwerij Rolduc (https://www.brouwerij-rolduc.nl) — Volledig informatieve website, webshop en reserveringssysteem in één. Van A tot Z ontwikkeld, inclusief afgeschermde bestelomgeving voor horeca. Sinds de lancering al 100+ reserveringen en orders.
2. Heerlen: Miljarden kilo's steenkool — Wat deden miljarden kilo's steenkool met Heerlen? Een diepe duik in de geschiedenis van de stad, van de tijd vóór de ontdekking tot na de mijnsluiting. Interactieve ervaring op basis van historische data. Groepsproject; Jelger deed het visual design, de content en de volledige code.
3. CodeMonster — Een doelgericht workshop-concept waarbij kinderen leren programmeren door kunst te maken. Van visual design tot platform en cursusmodel, uitvoerig getest door de doelgroep. Groepsproject; Jelger deed het design en de front-end.
4. Sanctus Fusion (Dé Wieëtsjaf) — Volledige branding voor een exclusief bier: de Sanctus Fusion, een unieke volle IPA speciaal gebrouwen door Brouwerij Rolduc voor Dé Wieëtsjaf. Van logo-ontwerp tot posters, t-shirts, tafelkaarten en social media content. Alles volledig zelf ontworpen in Photoshop, Illustrator en InDesign.

CONTACT:
- E-mail: sielerjelger@gmail.com
- LinkedIn: https://www.linkedin.com/in/jelger-sieler-9146a9306/
- GitHub: https://github.com/Jelger1
- Instagram (3D prints): https://www.instagram.com/jelgers3d/
- Of via het contactformulier op de website (sectie "Contact").

INSTRUCTIES:
- Wees vriendelijk, behulpzaam en beknopt.
- Als je iets niet zeker weet, verwijs naar het contactformulier of e-mail. Verzin geen feiten.
- Geef geen exacte prijzen, maar verwijs naar contact voor een offerte op maat.
- Je mag vragen beantwoorden over Jelger's werk, proces, 3D prints, diensten, etc.
- Bij technische vragen over 3D printing mag je algemene kennis delen, maar verwijs voor specifieke projectvragen naar Jelger.
- Houd antwoorden kort en to the point (max ~3-4 zinnen), tenzij meer detail gevraagd wordt.
- Opmaak: gewone tekst, eventueel **vet** en korte lijstjes met "-". Geen koppen, tabellen of codeblokken.
- Noem je een website, schrijf dan altijd de volledige URL inclusief https:// zodat hij klikbaar is.`;

/* ---------- Helpers ---------- */
function sanitizeMessages(input) {
  if (!Array.isArray(input)) return null;

  const cleaned = [];
  for (const msg of input) {
    if (!msg || typeof msg !== 'object') continue;
    if (msg.role !== 'user' && msg.role !== 'assistant') continue; // geen system-injectie vanuit de client
    if (typeof msg.content !== 'string') continue;
    const content = msg.content.trim().slice(0, MAX_CONTENT_LENGTH);
    if (!content) continue;
    cleaned.push({ role: msg.role, content });
  }

  const trimmed = cleaned.slice(-MAX_MESSAGES);
  if (!trimmed.length || trimmed[trimmed.length - 1].role !== 'user') return null;
  return trimmed;
}

/* ---------- Routes ---------- */
// Health check: handig voor Render én de frontend "wekt" hiermee de server
app.get(['/', '/api/health'], (req, res) => {
  res.json({
    ok: true,
    service: 'jellybot',
    model: OPENAI_MODEL,
    keyConfigured: Boolean(OPENAI_API_KEY),
  });
});

app.post('/api/chat', rateLimit, async (req, res) => {
  if (!OPENAI_API_KEY) {
    return res.status(503).json({ error: 'Jelly-bot is nog niet geconfigureerd. Neem contact op via het contactformulier.' });
  }

  const messages = sanitizeMessages(req.body && req.body.messages);
  if (!messages) {
    return res.status(400).json({ error: 'Ongeldige request' });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  try {
    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
        max_tokens: 500,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 401) {
        console.error('OpenAI weigert de API key (401). Maak een nieuwe key aan op https://platform.openai.com/api-keys en zet hem in OPENAI_API_KEY.');
      } else if (response.status === 429) {
        console.error('OpenAI rate limit of tegoed op (429):', errText);
      } else {
        console.error(`OpenAI API error ${response.status}:`, errText);
      }
      const message = response.status === 429
        ? 'Jelly-bot is even druk bezet. Probeer het zo opnieuw.'
        : 'Er ging iets mis met de AI-service. Probeer het later opnieuw.';
      return res.status(502).json({ error: message });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      console.error('OpenAI gaf een leeg antwoord:', JSON.stringify(data).slice(0, 500));
      return res.status(502).json({ error: 'Sorry, ik kon geen antwoord genereren.' });
    }

    res.json({ reply });
  } catch (err) {
    if (err.name === 'AbortError') {
      console.error(`OpenAI request timeout na ${OPENAI_TIMEOUT_MS}ms`);
      return res.status(504).json({ error: 'De AI-service reageert niet. Probeer het later opnieuw.' });
    }
    console.error('Server error:', err);
    res.status(500).json({ error: 'Serverfout. Probeer het later opnieuw.' });
  } finally {
    clearTimeout(timeout);
  }
});

// Onbekende API-routes → JSON i.p.v. HTML
app.use('/api', (req, res) => res.status(404).json({ error: 'Niet gevonden' }));

// Foutafhandeling (bijv. ongeldige JSON in de body)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Ongeldige JSON' });
  if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Bericht te groot' });
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Serverfout.' });
});

/* ---------- Start ---------- */
app.listen(PORT, () => {
  console.log(`Jelly-bot server draait op http://localhost:${PORT} (model: ${OPENAI_MODEL}, API key: ${OPENAI_API_KEY ? 'aanwezig' : 'ONTBREEKT'})`);
});
