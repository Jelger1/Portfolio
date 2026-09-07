# Portfolio — jelgersieler.nl

Portfolio-website van Jelger Sieler, inclusief **Jelly-bot**: een chatbot die vragen beantwoordt over Jelger's werk, diensten en 3D-prints.

## Structuur

```
├── index.html          # De site (GitHub Pages → jelgersieler.nl)
├── css/style.css
├── js/
│   ├── main.js         # Loader, menu, scroll-animaties, contactformulier, modals
│   ├── scenes.js       # Three.js scenes (hero)
│   ├── model-viewer.js # 3D particle-model in "Over mij"
│   └── chatbot.js      # Jelly-bot frontend (praat met de backend)
└── server/
    ├── server.js       # Jelly-bot backend (Express) → OpenAI
    ├── .env.example    # Voorbeeld-config
    └── (render.yaml in de root = Render-instellingen)
    └── .env            # Jouw echte API key (NIET in git)
```

## Hoe Jelly-bot werkt

1. De bezoeker typt een vraag op de site.
2. `js/chatbot.js` stuurt de chatgeschiedenis naar de backend (`POST /api/chat`).
3. `server/server.js` voegt de system prompt toe en roept OpenAI aan met de API key.
4. Het antwoord gaat terug naar de site.

De API key staat dus **alleen** op de server, nooit in de frontend.

- **Frontend**: GitHub Pages (`https://jelgersieler.nl`)
- **Backend**: Render (`https://jellybot-backend.onrender.com`)

## Lokaal draaien

```bash
cd server
cp .env.example .env      # en vul je OPENAI_API_KEY in
npm install
npm start                 # of: npm run dev (herstart automatisch bij wijzigingen)
```

Open daarna `http://localhost:3000` — de server serveert lokaal ook de site zelf, dus de chatbot werkt meteen.
Gebruik je liever Live Server (VS Code) of een andere lokale server? Dat werkt ook: elke poort op `localhost`/`127.0.0.1` is toegestaan door CORS, zolang de backend op poort 3000 draait.

Health check: `http://localhost:3000/api/health`

## Deploy op Render

Render-instellingen voor de web service:

| Instelling       | Waarde         |
| ---------------- | -------------- |
| Root Directory   | `server`       |
| Build Command    | `npm install`  |
| Start Command    | `npm start`    |
| Environment var  | `OPENAI_API_KEY` = je key |

Bij elke push naar `main` deployt Render automatisch opnieuw. Deze instellingen staan ook in `render.yaml` (Render Blueprint); de key zelf staat daar niet in.

`server/node_modules` staat niet in git: Render installeert de dependencies zelf via `npm install`.

### API key vernieuwen

1. Ga naar <https://platform.openai.com/api-keys> en maak een nieuwe key aan.
2. Render → je service → **Environment** → `OPENAI_API_KEY` aanpassen → **Save** (Render herstart de service).
3. Lokaal: dezelfde key in `server/.env` zetten.
4. Check: `https://jellybot-backend.onrender.com/api/health` moet `"keyConfigured": true` geven, en een testvraag in de chat moet een antwoord opleveren.

Zorg dat er tegoed op het OpenAI-account staat (Billing), anders geeft OpenAI een 429-fout.

> **Let op:** deel een API key nooit in chats, screenshots of commits. Is een key toch gelekt, trek hem dan direct in op de OpenAI-site en maak een nieuwe aan.

## Contactformulier

Het contactformulier gebruikt [Web3Forms](https://web3forms.com); de access key staat in `index.html`.
