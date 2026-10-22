# JSdesign — jelgersieler.nl

Portfolio van Jelger Sieler onder de naam **JSdesign**, in dezelfde huisstijl als [jelgers3d.nl](https://jelgers3d.nl):
het JS-teken, de typografie "optie 2B" (zie hieronder) en de kleuren Electric Aqua `#03BCCA`, Deep Teal `#029AA6`,
Neon Raspberry `#F10067`, Misty Sage `#F3FFFD` en Midnight Slate `#080A0D`. De vaste richtlijn is `HUISSTIJL.md` in de
repo van JelgerS3D; verandert daar iets, neem het dan hier ook over. Met **Jelly-bot**, een chatbot die vragen
beantwoordt over Jelgers werk, en een contactformulier dat via Supabase loopt.

## Structuur

```
├── index.html          # De site (GitHub Pages → jelgersieler.nl)
├── privacy.html        # Privacyverklaring (contactformulier, Jelly-bot, hosting)
├── 404.html            # Pagina voor onbekende adressen
├── css/style.css       # Alle opmaak: huisstijl, secties, paginaovergang, Jelly-bot
├── js/
│   ├── main.js         # Menu, scroll-animaties, contactformulier, "Mijn proces", lightbox, paginaovergang
│   ├── chatbot.js      # Jelly-bot frontend (praat met de backend)
│   └── 3d.js           # GEBOUWD uit src/3d/ (niet met de hand aanpassen)
├── src/3d/             # De 3D-scènes (Three.js): het JS-teken in de hero en de 3D-scan in "Over mij"
├── assets/
│   ├── brand/          # Logo's, favicon, deelafbeelding (og-image.png)
│   ├── fonts/          # Saira, Instrument Serif, DM Sans, JetBrains Mono en Stevie Sans als WOFF2
│   ├── img/            # GEBOUWD: kleine WebP-versies van de foto's
│   ├── 3d/scan.bin     # GEBOUWD uit assets/Jelgerin3d.glb
│   └── mail/logo.png   # Het JS-teken voor de bevestigingsmails (Gmail toont geen SVG)
├── tools/build.mjs     # De build (zie hieronder)
└── server/             # Jelly-bot backend (Express → OpenAI), draait op Render
```

## Iets aanpassen

Teksten, projecten en opmaak pas je gewoon aan in `index.html`, `css/style.css` en `js/main.js` (de teksten van
"Mijn proces" staan in `PROCES`, de beelden van Sanctus Fusion in `BEELDEN`).

Na een wijziging in `src/3d/`, een nieuwe foto of een nieuwe 3D-scan draai je de build:

```bash
npm install     # eenmalig
npm run build
```

De build doet het volgende, en de uitkomst gaat gewoon mee in git (GitHub Pages publiceert de map zoals hij is):

1. `src/3d/` → `js/3d.js`: Three.js gebundeld, alleen de delen die gebruikt worden.
2. `assets/Jelgerin3d.glb` → `assets/3d/scan.bin`: alleen de posities van de scan (154 kB in plaats van 1,6 MB).
3. Grote foto's in `assets/` → `assets/img/*.webp` (welke foto's staat bovenaan `tools/build.mjs` in `FOTOS`).
4. Het paginadoek (de overgang) uit `index.html` gaat naar `privacy.html` en `404.html`.
5. Achter elke link naar CSS en JS komt een vingerafdruk (`?v=…`), zodat bezoekers nooit een oude versie zien.

Pas je alleen `index.html`, `css/style.css` of `js/main.js` aan, draai dan ook even `npm run build`: dan krijgen
bezoekers meteen de nieuwe versie.

### 3D

- **Hero:** het JS-teken als drie blokken met printlaagjes op de zijkanten (`src/3d/hero.js`). Slepen draait het,
  aanwijzen tilt een onderdeel op, klikken laat het uit elkaar springen. Kleuren en vormen staan in `src/3d/js-mark.js`.
- **Over mij:** de 3D-scan als deeltjes in het merkverloop (`src/3d/scan.js`). Wordt pas opgehaald als de sectie in de
  buurt komt.
- Beide scènes renderen alleen als ze in beeld zijn en respecteren "minder beweging". Zonder WebGL staat er in de hero
  het JS-teken als plaatje en bij de scan een foto.

### Projectvoorbeelden

In de projectlijst staan **screenshots** van de sites (bron: `assets/screens/*.jpg`, 1440×900; de build maakt er WebP's
van). Op een computer laadt een klik op het voorbeeld de echte site op die plek; op een telefoon opent een tik de site.
"Mijn proces" toont dezelfde screenshot.

Bewust geen ingesloten sites die vanzelf laden: Brouwerij Rolduc zet bij het laden de focus op de knop van het
leeftijdsscherm, en dan springt de pagina tijdens het scrollen naar dat voorbeeld (vooral op een telefoon) en verdwijnt
de focus uit het contactformulier. Verandert een site, maak dan een nieuwe screenshot van 1440×900, zet hem als JPG in
`assets/screens/` en draai `npm run build`.

## Contactformulier (Supabase)

Het formulier gebruikt **dezelfde Supabase-functie als jelgers3d.nl** (`formulier`, project `kgxhefdzufhmigbmchhk`).
De code daarvan staat in de repo van JelgerS3D (`supabase/functions/formulier/`) en gaat bij een push naar `main` van
die repo vanzelf online. De site stuurt `site: 'portfolio'` mee; het adres van de functie staat in `index.html` op
`<html data-backend="…">`.

Wat de functie doet: verplichte velden en het e-mailadres controleren, bots tegenhouden (verborgen veld, minimale
invultijd, linkfilter, limieten per IP en per e-mailadres), het bericht opslaan in de tabel `berichten` (met
`site` = `jelgersieler.nl`) en twee mails sturen via Resend: een bevestiging in de JSdesign-huisstijl naar de afzender en
een overzicht naar Jelger. Antwoorden op dat overzicht gaat naar de afzender. Staat een bericht na twee dagen nog op
"nieuw", dan komt het in de dagelijkse herinnering (met de knop "Ik heb gereageerd"). Berichten worden na een jaar
automatisch verwijderd.

Die mails laden het logo en de lettertypen van deze site: laat `assets/mail/logo.png` en `assets/fonts/` dus staan.

Het e-mailadres staat nergens leesbaar in de HTML (`data-mail`, achterstevoren en in base64), zodat adresverzamelaars
het niet vinden; `js/main.js` maakt er weer een gewone link van.

## Jelly-bot

1. De bezoeker typt een vraag op de site.
2. `js/chatbot.js` stuurt de chatgeschiedenis naar de backend (`POST /api/chat`).
3. `server/server.js` voegt de system prompt toe en roept OpenAI aan met de API key.
4. Het antwoord gaat terug naar de site.

De API key staat dus **alleen** op de server, nooit in de frontend.

- **Frontend**: GitHub Pages (`https://jelgersieler.nl`)
- **Backend**: Render (`https://jellybot-backend.onrender.com`)

### Lokaal draaien

```bash
cd server
cp .env.example .env      # en vul je OPENAI_API_KEY in
npm install
npm start                 # of: npm run dev (herstart automatisch bij wijzigingen)
```

Open daarna `http://localhost:3000`: de server serveert lokaal ook de site zelf, dus de chatbot werkt meteen.
Gebruik je liever Live Server (VS Code) of een andere lokale server? Dat werkt ook: elke poort op `localhost`/`127.0.0.1`
is toegestaan door CORS, zolang de backend op poort 3000 draait. Het contactformulier accepteert lokaal alleen
`http://localhost` (niet `127.0.0.1`); let op, dan verstuur je echte berichten.

Health check: `http://localhost:3000/api/health`

### Deploy op Render

| Instelling       | Waarde         |
| ---------------- | -------------- |
| Root Directory   | `server`       |
| Build Command    | `npm install`  |
| Start Command    | `npm start`    |
| Environment var  | `OPENAI_API_KEY` = je key |

Bij elke push naar `main` deployt Render automatisch opnieuw. Deze instellingen staan ook in `render.yaml` (Render
Blueprint); de key zelf staat daar niet in. `server/node_modules` staat niet in git: Render installeert de
dependencies zelf via `npm install`.

### API key vernieuwen

1. Ga naar <https://platform.openai.com/api-keys> en maak een nieuwe key aan.
2. Render → je service → **Environment** → `OPENAI_API_KEY` aanpassen → **Save** (Render herstart de service).
3. Lokaal: dezelfde key in `server/.env` zetten.
4. Check: `https://jellybot-backend.onrender.com/api/health` moet `"keyConfigured": true` geven, en een testvraag in de
   chat moet een antwoord opleveren.

Zorg dat er tegoed op het OpenAI-account staat (Billing), anders geeft OpenAI een 429-fout.

> **Let op:** deel een API key nooit in chats, screenshots of commits. Is een key toch gelekt, trek hem dan direct in
> op de OpenAI-site en maak een nieuwe aan.

## Lettertypen

Gelijk aan jelgers3d.nl ("optie 2B"); declaraties en regels bovenaan `css/style.css`:

| Rol | Lettertype | Waar |
| --- | --- | --- |
| Koppen | Saira Expanded ExtraBold | h1/h2 op 125% breedte, kleinere koppen 112%, op een telefoon smaller |
| Accent | Instrument Serif Italic | het woord in het merkverloop in een kop (`<span class="highlight">`), spaarzaam |
| Tekst | DM Sans | lopende tekst en knoppen, minimaal 16 px |
| Labels | JetBrains Mono | bovenkopjes, tags, de lopende band, adresbalk van de voorbeelden |
| Logo-naam | Stevie Sans Medium | alleen "DESIGN" naast het teken |

Saira, Instrument Serif, DM Sans en JetBrains Mono zijn gratis (SIL Open Font License). Stevie Sans is een betaald font
van Typefolio; voor gebruik op een website is een weblicentie nodig. De bevestigingsmails van het portfolio laden Saira,
DM Sans en Stevie Sans van deze site.
