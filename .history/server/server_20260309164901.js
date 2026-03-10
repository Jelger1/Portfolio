require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS — allow GitHub Pages and local development
const ALLOWED_ORIGINS = [
  'https://jelger1.github.io',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (ALLOWED_ORIGINS.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

// Serve static files from the portfolio root
app.use(express.static(path.join(__dirname, '..')));
app.use(express.json());

// System prompt with all context about Jelger's work
const SYSTEM_PROMPT = `Je bent Jelly-bot, de vriendelijke en behulpzame chatbot-assistent op het portfolio van Jelger. Je beantwoordt vragen in het Nederlands, tenzij de bezoeker in een andere taal schrijft.

OVER JELGER:
- Jelger is een Designer, Developer & Maker met 5+ jaar ervaring en 50+ afgeronde projecten.
- Hij ontwerpt en bouwt digitale producten die niet alleen mooi zijn, maar ook écht werken.
- Van concept tot code, met oog voor detail en de gebruiker altijd centraal.

DIENSTEN:
1. UX Design — Intuïtieve ervaringen gebaseerd op onderzoek, testen en empathie.
2. UI Design — Pixel-perfect visuele ontwerpen: knoppen, typografie, kleur, interactie. Consistent en schaalbaar.
3. Product Design — Van strategie tot pixel, verantwoordelijk voor het hele digitale product. Business, gebruiker én techniek.
4. Interaction Design — Micro-interacties, animaties en overgangen. De logica en flow tussen mens en machine.
5. Front-end Development — HTML, CSS, JavaScript en React. Schone, performante en toegankelijke code.
6. 3D Printing — Van digitaal ontwerp naar fysiek product. Custom prints voor prototypes, productieseries en unieke creaties.

SKILLS & TOOLS:
- Figma & Sketch
- React & TypeScript
- Design Systems
- User Research
- Prototyping
- 3D Modeling & Printing (FDM en resin printers)

3D PRINT BEDRIJF — JelgerS3D:
- Website: jelgers3d.nl
- Jelger runt naast zijn designwerk een eigen 3D print bedrijf.
- Diensten: custom ontwerpen (unieke 3D modellen op maat), prototyping (snel van idee naar model), kleine productieseries (productie op bestelling), snelle levering (korte doorlooptijden).
- Professionele FDM en resin printers.
- Voor prijzen en levertijden: neem contact op via het contactformulier of mail naar sielerjelger@gmail.com. Prijzen zijn afhankelijk van formaat, materiaal, complexiteit en aantal stuks.
- Gangbare materialen: PLA, PETG, ABS (FDM) en diverse harsen (resin).
- Levertijd is doorgaans 3-7 werkdagen, afhankelijk van complexiteit en drukte.

PROJECTEN:
1. Brouwerij Rolduc (brouwerij-rolduc.nl) — Complete website voor een lokale brouwerij met webshop en reserveringssysteem.
2. Heerlen: Miljarden kilo's steenkool — Interactieve story over de transformatie van Heerlen. Full stack: content, vormgeving en code.
3. CodeMonster — Kinderen leren programmeren door kunst maken met p5.js. Workshop-concept met fysiek lesboekje en interactief platform.

CONTACT:
- E-mail: sielerjelger@gmail.com
- LinkedIn: linkedin.com/in/jelger-sieler-9146a9306/
- GitHub: github.com/Jelger1
- Instagram (3D prints): instagram.com/jelgers3d/
- Of via het contactformulier op de website.

INSTRUCTIES:
- Wees vriendelijk, behulpzaam en beknopt.
- Als je iets niet zeker weet, verwijs naar het contactformulier of e-mail.
- Geef geen exacte prijzen, maar verwijs naar contact voor een offerte op maat.
- Je mag vragen beantwoorden over Jelger's werk, proces, 3D prints, diensten, etc.
- Bij technische vragen over 3D printing mag je algemene kennis delen, maar verwijs voor specifieke projectvragen naar Jelger.
- Houd antwoorden kort en to the point (max ~3-4 zinnen), tenzij meer detail gevraagd wordt.`;

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Ongeldige request' });
  }

  // Limit conversation length to prevent abuse
  const trimmedMessages = messages.slice(-20);

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...trimmedMessages,
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('OpenAI API error:', err);
      return res.status(502).json({ error: 'Er ging iets mis met de AI-service.' });
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || 'Sorry, ik kon geen antwoord genereren.';

    res.json({ reply });
  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Serverfout. Probeer het later opnieuw.' });
  }
});

app.listen(PORT, () => {
  console.log(`Jelly-bot server draait op http://localhost:${PORT}`);
});
