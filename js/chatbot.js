/* ============================================
   JELLY-BOT CHATBOT — chatbot.js
   Frontend van de Jelly-bot chat. Praat met de backend
   (server/server.js), die op zijn beurt met OpenAI praat.
   Hier staat dus bewust géén API key.
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('jellybot-toggle');
  const chatWindow = document.getElementById('jellybot-window');
  const closeBtn = document.getElementById('jellybot-close');
  const form = document.getElementById('jellybot-form');
  const input = document.getElementById('jellybot-input');
  const messagesEl = document.getElementById('jellybot-messages');
  const suggestionsEl = document.getElementById('jellybot-suggestions');
  const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
  const statusEl = chatWindow ? chatWindow.querySelector('.jellybot__status') : null;
  const iconChat = toggle ? toggle.querySelector('.jellybot__icon-chat') : null;
  const iconClose = toggle ? toggle.querySelector('.jellybot__icon-close') : null;

  if (!toggle || !chatWindow || !form || !input || !messagesEl) return;

  // Backend: lokaal (npm start in /server) of de Render-deploy in productie
  const isLocal = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const API_BASE = isLocal ? 'http://localhost:3000' : 'https://jellybot-backend.onrender.com';

  const MAX_HISTORY = 20;        // aantal berichten dat als context wordt meegestuurd
  const SLOW_RESPONSE_MS = 6000; // daarna tonen we een "wordt wakker"-melding (Render cold start)
  const DEFAULT_STATUS = statusEl ? statusEl.textContent : '';

  const messages = [];
  let isSending = false;
  let warmedUp = false;

  /* ---------- Server alvast wakker maken ----------
     De gratis Render-tier slaapt na inactiviteit; de eerste request kan
     30-60s duren. Door bij openen/hover al een health-ping te sturen is de
     server vaak wakker tegen de tijd dat de bezoeker iets typt. */
  function warmUpServer() {
    if (warmedUp) return;
    warmedUp = true;
    fetch(API_BASE + '/api/health').catch(() => { /* niet erg, server wordt wakker */ });
  }

  /* ---------- Open / dicht ---------- */
  function setOpen(open) {
    chatWindow.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'Sluit chat' : 'Open chat');
    if (iconChat && iconClose) {
      iconChat.style.display = open ? 'none' : 'block';
      iconClose.style.display = open ? 'block' : 'none';
    }
    if (open) {
      warmUpServer();
      input.focus();
    }
  }

  toggle.addEventListener('click', () => setOpen(chatWindow.hidden));
  toggle.addEventListener('mouseenter', warmUpServer, { once: true });
  if (closeBtn) closeBtn.addEventListener('click', () => setOpen(false));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !chatWindow.hidden) setOpen(false);
  });

  /* ---------- Invoer ---------- */
  if (suggestionsEl) {
    suggestionsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('.jellybot__suggestion');
      if (!btn || !btn.dataset.msg) return;
      sendMessage(btn.dataset.msg);
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    sendMessage(text);
  });

  function hideSuggestions() {
    if (suggestionsEl) suggestionsEl.style.display = 'none';
  }

  function setSending(sending) {
    isSending = sending;
    input.disabled = sending;
    if (submitBtn) submitBtn.disabled = sending;
    if (!sending) input.focus();
  }

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text;
  }

  /* ---------- Berichten renderen ---------- */
  function scrollToBottom() {
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function addMessage(role, content) {
    const div = document.createElement('div');
    div.className = 'jellybot__msg jellybot__msg--' + (role === 'user' ? 'user' : 'bot');

    if (role === 'user') {
      div.textContent = content;
    } else {
      div.innerHTML = '<p>' + formatResponse(content) + '</p>';
    }

    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function showTyping() {
    if (document.getElementById('jellybot-typing')) return;
    const div = document.createElement('div');
    div.className = 'jellybot__typing';
    div.id = 'jellybot-typing';
    div.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(div);
    scrollToBottom();
  }

  function removeTyping() {
    const typing = document.getElementById('jellybot-typing');
    if (typing) typing.remove();
  }

  function escapeHtml(str) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return str.replace(/[&<>"']/g, (c) => map[c]);
  }

  // Zet het platte-tekst antwoord van de bot om naar veilige HTML
  function formatResponse(text) {
    let html = escapeHtml(text);

    // Markdown-links [tekst](url) én losse URLs → klikbare links
    const linkPattern = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)|(https?:\/\/(?:(?!&lt;|&gt;|&quot;|&#39;)[^\s<>"'])+)/g;
    html = html.replace(linkPattern, (match, label, mdUrl, bareUrl) => {
      let url = mdUrl || bareUrl;
      let trailing = '';
      if (!mdUrl) {
        // Leestekens direct na een URL horen niet bij de link ("kijk op https://x.nl.")
        const punct = url.match(/[.,;:!?)]+$/);
        if (punct) {
          trailing = punct[0];
          url = url.slice(0, -trailing.length);
        }
      }
      return '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + (label || url) + '</a>' + trailing;
    });

    // **vet**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Lijstjes ("- item" / "* item") → bullet
    html = html.replace(/^\s*[-*]\s+/gm, '• ');
    // Nieuwe regels
    html = html.replace(/\n/g, '<br>');

    return html;
  }

  /* ---------- Versturen ---------- */
  async function sendMessage(text) {
    if (isSending) return;

    hideSuggestions();
    messages.push({ role: 'user', content: text });
    if (messages.length > MAX_HISTORY) messages.splice(0, messages.length - MAX_HISTORY);
    addMessage('user', text);

    setSending(true);
    showTyping();

    const slowTimer = setTimeout(() => {
      setStatus('Jelly-bot wordt wakker… even geduld ⏳');
    }, SLOW_RESPONSE_MS);

    try {
      const res = await fetch(API_BASE + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });

      let data = null;
      try { data = await res.json(); } catch (_) { /* geen JSON-antwoord */ }

      removeTyping();

      if (!res.ok || !data || !data.reply) {
        console.error('Jelly-bot API error:', res.status, data);
        const fallback = 'Oeps, er ging iets mis. Probeer het later opnieuw of neem direct contact op via het contactformulier! 😅';
        addMessage('assistant', (data && data.error) || fallback);
        return;
      }

      messages.push({ role: 'assistant', content: data.reply });
      addMessage('assistant', data.reply);
    } catch (err) {
      removeTyping();
      console.error('Jelly-bot connection error:', err);
      addMessage('assistant', 'Hmm, ik kan even geen verbinding maken. Probeer het later opnieuw! 🔌');
    } finally {
      clearTimeout(slowTimer);
      setStatus(DEFAULT_STATUS);
      setSending(false);
    }
  }
});
