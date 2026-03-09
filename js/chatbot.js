/* ============================================
   JELLY-BOT CHATBOT — chatbot.js
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('jellybot-toggle');
  const window_ = document.getElementById('jellybot-window');
  const closeBtn = document.getElementById('jellybot-close');
  const form = document.getElementById('jellybot-form');
  const input = document.getElementById('jellybot-input');
  const messagesEl = document.getElementById('jellybot-messages');
  const suggestionsEl = document.getElementById('jellybot-suggestions');
  const iconChat = toggle?.querySelector('.jellybot__icon-chat');
  const iconClose = toggle?.querySelector('.jellybot__icon-close');

  if (!toggle || !window_ || !form) return;

  // Always point to the Express proxy server on port 3000
  const API_BASE = (location.port === '3000' && location.protocol !== 'file:')
    ? ''
    : 'http://localhost:3000';

  // Conversation history for context
  const messages = [];

  // Toggle chat open/close
  function setOpen(open) {
    window_.hidden = !open;
    toggle.setAttribute('aria-expanded', open.toString());
    if (iconChat && iconClose) {
      iconChat.style.display = open ? 'none' : 'block';
      iconClose.style.display = open ? 'block' : 'none';
    }
    if (open) {
      input.focus();
    }
  }

  toggle.addEventListener('click', () => {
    const isOpen = window_.hidden;
    setOpen(isOpen);
  });

  closeBtn?.addEventListener('click', () => setOpen(false));

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !window_.hidden) {
      setOpen(false);
    }
  });

  // Suggestion buttons
  suggestionsEl?.addEventListener('click', (e) => {
    const btn = e.target.closest('.jellybot__suggestion');
    if (!btn) return;
    const msg = btn.dataset.msg;
    if (msg) {
      sendMessage(msg);
      suggestionsEl.style.display = 'none';
    }
  });

  // Form submit
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    sendMessage(text);
    if (suggestionsEl) suggestionsEl.style.display = 'none';
  });

  function addMessage(role, content) {
    const div = document.createElement('div');
    div.className = `jellybot__msg jellybot__msg--${role === 'user' ? 'user' : 'bot'}`;

    if (role === 'user') {
      div.textContent = content;
    } else {
      div.innerHTML = `<p>${formatResponse(content)}</p>`;
    }

    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function showTyping() {
    const div = document.createElement('div');
    div.className = 'jellybot__typing';
    div.id = 'jellybot-typing';
    div.innerHTML = '<span></span><span></span><span></span>';
    messagesEl.appendChild(div);
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  function removeTyping() {
    const typing = document.getElementById('jellybot-typing');
    if (typing) typing.remove();
  }

  function formatResponse(text) {
    // Convert **bold** to <strong>
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Convert URLs to links
    text = text.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color:var(--primary)">$1</a>');
    // Convert newlines to <br>
    text = text.replace(/\n/g, '<br>');
    return text;
  }

  async function sendMessage(text) {
    // Add user message
    messages.push({ role: 'user', content: text });
    addMessage('user', text);

    // Show typing indicator
    showTyping();

    try {
      const res = await fetch(API_BASE + '/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: messages,
        }),
      });

      removeTyping();

      if (!res.ok) {
        const errorData = await res.text();
        console.error('Jelly-bot API error:', res.status, errorData);
        addMessage('assistant', 'Oeps, er ging iets mis. Probeer het later opnieuw of neem direct contact op via het contactformulier! 😅');
        return;
      }

      const data = await res.json();
      const reply = data.reply;

      messages.push({ role: 'assistant', content: reply });
      addMessage('assistant', reply);
    } catch (err) {
      removeTyping();
      console.error('Jelly-bot connection error:', err);
      addMessage('assistant', 'Hmm, ik kan even geen verbinding maken. Zorg dat de server draait op localhost:3000! 🔌');
    }
  }
});
