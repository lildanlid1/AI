const http = require('http');
const https = require('https');
const url = require('url');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';

if (!GROQ_API_KEY) {
  console.error('ERROR: Set GROQ_API_KEY environment variable');
  console.error('Usage: GROQ_API_KEY=gsk_xxxx node server.js');
  process.exit(1);
}

const memories = {};
const MAX_MEMORY = 200;

function genId() {
  return crypto.randomBytes(5).toString('hex');
}

function buildHTML(chatId) {
  var id = JSON.stringify(chatId);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI Chat</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<style>
  *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
  :root {
    --bg: #06080d;
    --glass: rgba(255,255,255,0.025);
    --glass-border: rgba(255,255,255,0.065);
    --glass-hi: rgba(255,255,255,0.05);
    --accent: #5b9cff;
    --accent-dim: rgba(91,156,255,0.12);
    --accent-glow: rgba(91,156,255,0.25);
    --pink: #e07aa0;
    --pink-dim: rgba(224,122,160,0.10);
    --text: #edf0f7;
    --text-muted: #6a7290;
    --user-bg: rgba(91,156,255,0.07);
    --user-border: rgba(91,156,255,0.13);
    --ai-bg: rgba(255,255,255,0.02);
    --ai-border: rgba(255,255,255,0.05);
    --input-bg: rgba(255,255,255,0.03);
    --code-bg: rgba(0,0,0,0.5);
    --inline-code-bg: rgba(255,255,255,0.06);
  }
  html, body { height: 100%; }
  body {
    font-family: 'Space Grotesk', sans-serif;
    background: var(--bg);
    color: var(--text);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    position: relative;
  }

  .orb {
    position: fixed;
    border-radius: 50%;
    filter: blur(110px);
    pointer-events: none;
    will-change: transform;
  }
  .orb-1 {
    width: 520px; height: 520px;
    background: rgba(70,130,255,0.12);
    top: -12%; left: -10%;
    animation: drift1 24s ease-in-out infinite alternate;
  }
  .orb-2 {
    width: 440px; height: 440px;
    background: rgba(224,100,150,0.09);
    bottom: -14%; right: -8%;
    animation: drift2 28s ease-in-out infinite alternate;
  }
  .orb-3 {
    width: 320px; height: 320px;
    background: rgba(255,255,255,0.04);
    top: 35%; left: 55%;
    animation: drift3 32s ease-in-out infinite alternate;
  }
  @keyframes drift1 {
    0% { transform: translate(0,0) scale(1); }
    100% { transform: translate(130px,90px) scale(1.18); }
  }
  @keyframes drift2 {
    0% { transform: translate(0,0) scale(1); }
    100% { transform: translate(-110px,-70px) scale(1.12); }
  }
  @keyframes drift3 {
    0% { transform: translate(-50%,-50%) scale(1); }
    100% { transform: translate(calc(-50% + 90px),calc(-50% - 80px)) scale(1.25); }
  }

  .container {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 720px;
    height: 92vh;
    max-height: 820px;
    display: flex;
    flex-direction: column;
    background: var(--glass);
    backdrop-filter: blur(40px) saturate(1.25);
    -webkit-backdrop-filter: blur(40px) saturate(1.25);
    border: 1px solid var(--glass-border);
    border-radius: 22px;
    box-shadow:
      inset 0 1px 0 0 var(--glass-hi),
      0 0 80px rgba(91,156,255,0.04),
      0 4px 60px rgba(0,0,0,0.55);
    overflow: hidden;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 18px 24px;
    border-bottom: 1px solid var(--glass-border);
    flex-shrink: 0;
  }
  .header-left { display: flex; align-items: center; gap: 12px; }
  .header-dot {
    width: 8px; height: 8px;
    border-radius: 50%;
    background: linear-gradient(135deg, var(--accent), var(--pink));
    box-shadow: 0 0 12px rgba(91,156,255,0.35);
  }
  header h1 {
    font-size: 17px;
    font-weight: 600;
    letter-spacing: -0.3px;
    color: var(--text);
  }
  .id-display {
    font-size: 11px;
    font-weight: 400;
    color: var(--text-muted);
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--glass-border);
    border-radius: 20px;
    padding: 4px 12px;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    transition: all 0.2s;
    user-select: all;
  }
  .id-display:hover {
    background: rgba(255,255,255,0.05);
    border-color: rgba(255,255,255,0.1);
    color: var(--text);
  }
  .id-dot {
    width: 5px; height: 5px;
    border-radius: 50%;
    background: var(--accent);
    animation: pulse-dot 2.5s ease-in-out infinite;
  }
  @keyframes pulse-dot {
    0%,100% { opacity: 0.4; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.4); }
  }

  .messages {
    flex: 1;
    overflow-y: auto;
    padding: 20px 24px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    scrollbar-width: thin;
    scrollbar-color: rgba(255,255,255,0.06) transparent;
  }
  .messages::-webkit-scrollbar { width: 4px; }
  .messages::-webkit-scrollbar-track { background: transparent; }
  .messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 4px; }

  .empty-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    opacity: 0.2;
    user-select: none;
    transition: opacity 0.3s;
  }
  .empty-state.hidden { display: none; }
  .empty-state .empty-icon {
    width: 40px; height: 40px;
    border-radius: 12px;
    border: 1px solid var(--glass-border);
    background: var(--glass);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .empty-state .empty-icon svg { width: 18px; height: 18px; color: var(--text-muted); }
  .empty-state .empty-text {
    font-size: 14px;
    font-weight: 300;
    letter-spacing: 0.3px;
    color: var(--text-muted);
  }

  .msg { display: flex; animation: msg-in 0.35s ease-out both; }
  @keyframes msg-in {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .msg.user { justify-content: flex-end; }
  .msg.ai { justify-content: flex-start; }

  .msg-bubble {
    max-width: 82%;
    padding: 12px 16px;
    border-radius: 16px;
    font-size: 14px;
    line-height: 1.65;
    word-wrap: break-word;
    overflow-wrap: break-word;
  }
  .msg.user .msg-bubble {
    background: var(--user-bg);
    border: 1px solid var(--user-border);
    border-bottom-right-radius: 4px;
  }
  .msg.ai .msg-bubble {
    background: var(--ai-bg);
    border: 1px solid var(--ai-border);
    border-bottom-left-radius: 4px;
  }

  .msg-content strong { font-weight: 600; color: #ffffff; }
  .msg-content em { font-style: italic; opacity: 0.85; }
  .msg-content .code-block {
    display: block;
    background: var(--code-bg);
    border: 1px solid rgba(255,255,255,0.04);
    border-radius: 10px;
    padding: 14px 16px;
    margin: 8px 0;
    font-family: 'SF Mono','Fira Code', monospace;
    font-size: 12.5px;
    line-height: 1.6;
    overflow-x: auto;
    white-space: pre;
    color: #b8c0d4;
  }
  .msg-content .inline-code {
    background: var(--inline-code-bg);
    padding: 2px 6px;
    border-radius: 5px;
    font-family: 'SF Mono','Fira Code', monospace;
    font-size: 12.5px;
    color: #c0c8e0;
  }

  .streaming-cursor::after {
    content: '\\u258A';
    color: var(--accent);
    font-size: 0.8em;
    animation: cursor-blink 0.7s step-end infinite;
    margin-left: 1px;
  }
  @keyframes cursor-blink {
    0%,50% { opacity: 1; }
    51%,100% { opacity: 0; }
  }

  .typing-dots { display: inline-flex; gap: 4px; padding: 4px 0; }
  .typing-dots span {
    width: 5px; height: 5px;
    border-radius: 50%;
    background: var(--text-muted);
    animation: typing-bounce 1.2s ease-in-out infinite;
  }
  .typing-dots span:nth-child(2) { animation-delay: 0.15s; }
  .typing-dots span:nth-child(3) { animation-delay: 0.3s; }
  @keyframes typing-bounce {
    0%,60%,100% { transform: translateY(0); opacity: 0.3; }
    30% { transform: translateY(-5px); opacity: 0.8; }
  }

  .input-area {
    display: flex;
    align-items: flex-end;
    gap: 10px;
    padding: 16px 20px 20px;
    border-top: 1px solid var(--glass-border);
    flex-shrink: 0;
  }
  textarea {
    flex: 1;
    background: var(--input-bg);
    border: 1px solid var(--glass-border);
    border-radius: 14px;
    padding: 12px 16px;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 14px;
    color: var(--text);
    resize: none;
    outline: none;
    max-height: 150px;
    line-height: 1.5;
    transition: border-color 0.25s, box-shadow 0.25s;
  }
  textarea::placeholder { color: var(--text-muted); opacity: 0.5; }
  textarea:focus {
    border-color: rgba(91,156,255,0.3);
    box-shadow: 0 0 0 3px rgba(91,156,255,0.06);
  }

  .btn {
    width: 44px; height: 44px;
    border-radius: 12px;
    border: 1px solid var(--glass-border);
    background: var(--glass);
    color: var(--text-muted);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.2s;
  }
  .btn:hover {
    background: rgba(255,255,255,0.05);
    color: var(--text);
    border-color: rgba(255,255,255,0.1);
  }
  .btn:active { transform: scale(0.94); }
  .btn.send-active {
    background: var(--accent-dim);
    border-color: rgba(91,156,255,0.22);
    color: var(--accent);
  }
  .btn.send-active:hover {
    background: rgba(91,156,255,0.2);
    color: #7bb3ff;
  }
  .btn svg { width: 18px; height: 18px; }

  .msg-error { color: #ff6b7a; font-size: 13px; }

  .new-chat-btn {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-muted);
    background: rgba(255,255,255,0.03);
    border: 1px solid var(--glass-border);
    border-radius: 8px;
    padding: 6px 14px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  .new-chat-btn:hover {
    background: rgba(255,255,255,0.06);
    color: var(--text);
    border-color: rgba(255,255,255,0.1);
  }
  .new-chat-btn svg { width: 13px; height: 13px; }

  @media (max-width: 600px) {
    .container { height: 100vh; max-height: 100vh; border-radius: 0; }
    header { padding: 14px 16px; }
    .messages { padding: 14px 16px; }
    .input-area { padding: 12px 14px 16px; }
    .msg-bubble { max-width: 90%; }
    .id-display { display: none; }
  }

  @media (prefers-reduced-motion: reduce) {
    .orb, .msg, .typing-dots span, .id-dot { animation: none !important; }
    .msg { opacity: 1; transform: none; }
  }
</style>
</head>
<body>

<div class="orb orb-1"></div>
<div class="orb orb-2"></div>
<div class="orb orb-3"></div>

<div class="container">
  <header>
    <div class="header-left">
      <div class="header-dot"></div>
      <h1>Chat</h1>
    </div>
    <div style="display:flex;align-items:center;gap:8px;">
      <button class="new-chat-btn" id="newChatBtn" title="Start new chat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
        New
      </button>
      <div class="id-display" id="idDisplay" title="Click to copy chat ID">
        <span class="id-dot"></span>
        <span id="idText"></span>
      </div>
    </div>
  </header>

  <main class="messages" id="messages">
    <div class="empty-state" id="emptyState">
      <div class="empty-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
      </div>
      <span class="empty-text">Start a conversation</span>
    </div>
  </main>

  <footer class="input-area">
    <textarea id="input" placeholder="Message..." rows="1" aria-label="Message input"></textarea>
    <button class="btn" id="sendBtn" aria-label="Send message">
      <svg id="iconSend" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/>
      </svg>
      <svg id="iconStop" viewBox="0 0 24 24" fill="currentColor" style="display:none">
        <rect x="6" y="6" width="12" height="12" rx="2.5"/>
      </svg>
    </button>
  </footer>
</div>

<script>
(function() {
  var chatId = ${id};
  var clientHistory = [];
  var isStreaming = false;
  var abortCtrl = null;

  var messagesEl = document.getElementById('messages');
  var emptyState = document.getElementById('emptyState');
  var input = document.getElementById('input');
  var sendBtn = document.getElementById('sendBtn');
  var iconSend = document.getElementById('iconSend');
  var iconStop = document.getElementById('iconStop');
  var idDisplay = document.getElementById('idDisplay');
  var idText = document.getElementById('idText');
  var newChatBtn = document.getElementById('newChatBtn');

  idText.textContent = chatId;

  // Click ID to copy
  idDisplay.addEventListener('click', function() {
    navigator.clipboard.writeText(window.location.href).then(function() {
      var orig = idText.textContent;
      idText.textContent = 'copied';
      setTimeout(function() { idText.textContent = orig; }, 1200);
    });
  });

  // New chat button
  newChatBtn.addEventListener('click', function() {
    window.location.href = '/chat';
  });

  function resizeInput() {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 150) + 'px';
  }
  input.addEventListener('input', resizeInput);

  input.addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (isStreaming) stopStream(); else sendMessage();
    }
  });

  sendBtn.addEventListener('click', function() {
    if (isStreaming) stopStream(); else sendMessage();
  });

  function updateBtn() {
    if (isStreaming) {
      iconSend.style.display = 'none';
      iconStop.style.display = 'block';
      sendBtn.classList.remove('send-active');
    } else {
      iconSend.style.display = 'block';
      iconStop.style.display = 'none';
      sendBtn.classList.toggle('send-active', input.value.trim().length > 0);
    }
  }
  input.addEventListener('input', updateBtn);

  function scrollBottom() { messagesEl.scrollTop = messagesEl.scrollHeight; }

  function renderMd(text) {
    var ph = [];
    text = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    text = text.replace(/\`\`\`(\\w*)\\n?([\\s\\S]*?)\`\`\`/g, function(m, lang, code) {
      var i = ph.length;
      ph.push('<pre class="code-block"><code>' + code.trim() + '</code></pre>');
      return '%%PH' + i + '%%';
    });
    text = text.replace(/\`([^\`]+)\`/g, function(m, code) {
      var i = ph.length;
      ph.push('<code class="inline-code">' + code + '</code>');
      return '%%PH' + i + '%%';
    });
    text = text.replace(/\\*\\*([^*]+)\\*\\*/g, '<strong>$1</strong>');
    text = text.replace(/\\*([^*]+)\\*/g, '<em>$1</em>');
    text = text.replace(/\\n/g, '<br>');
    for (var i = 0; i < ph.length; i++) text = text.replace('%%PH' + i + '%%', ph[i]);
    return text;
  }

  function escapeHtml(t) {
    return t.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function addMsg(role, html) {
    emptyState.classList.add('hidden');
    var wrap = document.createElement('div');
    wrap.className = 'msg ' + role;
    var bubble = document.createElement('div');
    bubble.className = 'msg-bubble';
    var content = document.createElement('div');
    content.className = 'msg-content';
    content.innerHTML = html;
    bubble.appendChild(content);
    wrap.appendChild(bubble);
    messagesEl.appendChild(wrap);
    scrollBottom();
    return content;
  }

  function stopStream() {
    if (abortCtrl) abortCtrl.abort();
    isStreaming = false;
    updateBtn();
  }

  async function sendMessage() {
    var msg = input.value.trim();
    if (!msg || isStreaming) return;

    addMsg('user', escapeHtml(msg).replace(/\\n/g,'<br>'));
    input.value = '';
    resizeInput();
    updateBtn();

    isStreaming = true;
    updateBtn();

    var contentEl = addMsg('ai', '<div class="typing-dots"><span></span><span></span><span></span></div>');
    abortCtrl = new AbortController();

    try {
      var res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, chatId: chatId, history: clientHistory }),
        signal: abortCtrl.signal
      });

      if (!res.ok) {
        var errText = await res.text();
        try { var errJson = JSON.parse(errText); errText = errJson.error?.message || errText; } catch(e){}
        contentEl.innerHTML = '<span class="msg-error">' + escapeHtml(errText) + '</span>';
        isStreaming = false;
        updateBtn();
        return;
      }

      var reader = res.body.getReader();
      var decoder = new TextDecoder();
      var fullText = '';
      var firstChunk = true;

      while (true) {
        var result = await reader.read();
        if (result.done) break;
        var chunk = decoder.decode(result.value, { stream: true });
        if (firstChunk) {
          contentEl.innerHTML = '';
          contentEl.classList.add('streaming-cursor');
          firstChunk = false;
        }
        fullText += chunk;
        contentEl.innerHTML = renderMd(fullText);
        scrollBottom();
      }

      contentEl.classList.remove('streaming-cursor');
      clientHistory.push({ role: 'user', content: msg });
      clientHistory.push({ role: 'assistant', content: fullText });

    } catch(e) {
      contentEl.classList.remove('streaming-cursor');
      if (e.name !== 'AbortError') {
        contentEl.innerHTML = '<span class="msg-error">Connection error: ' + escapeHtml(e.message) + '</span>';
      }
    }

    isStreaming = false;
    abortCtrl = null;
    updateBtn();
  }

  // Load existing memory
  fetch('/api/history?chatId=' + encodeURIComponent(chatId))
    .then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.messages && data.messages.length > 0) {
        clientHistory = data.messages;
        data.messages.forEach(function(m) {
          if (m.role === 'user') addMsg('user', escapeHtml(m.content).replace(/\\n/g,'<br>'));
          else if (m.role === 'assistant') addMsg('ai', renderMd(m.content));
        });
      }
    })
    .catch(function() {});

  input.focus();
})();
</script>
</body>
</html>`;
}

function handleHistory(parsedUrl, res) {
  var chatId = parsedUrl.query['chatId'] || '';
  if (!chatId || !memories[chatId]) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ messages: [] }));
    return;
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ messages: memories[chatId] }));
}

function handleChat(req, res) {
  var body = '';
  req.on('data', function(chunk) { body += chunk; });
  req.on('end', function() {
    try {
      var data = JSON.parse(body);
      var message = data.message || '';
      var chatId = data.chatId || '';
      var history = data.history || [];

      var messages = [{ role: 'system', content: 'You are a helpful assistant. Be clear and concise.' }];

      if (chatId && memories[chatId]) {
        messages = messages.concat(memories[chatId]);
      } else if (history.length > 0) {
        messages = messages.concat(history);
      }

      messages.push({ role: 'user', content: message });

      var postData = JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 4096
      });

      var options = {
        hostname: 'api.groq.com',
        path: '/openai/v1/chat/completions',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + GROQ_API_KEY,
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      var groqReq = https.request(options, function(groqRes) {
        if (groqRes.statusCode !== 200) {
          var errBody = '';
          groqRes.on('data', function(c) { errBody += c; });
          groqRes.on('end', function() {
            res.writeHead(groqRes.statusCode, { 'Content-Type': 'application/json' });
            res.end(errBody);
          });
          return;
        }

        res.writeHead(200, {
          'Content-Type': 'text/plain; charset=utf-8',
          'Transfer-Encoding': 'chunked',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        });

        var buffer = '';
        var fullResponse = '';

        groqRes.on('data', function(chunk) {
          buffer += chunk.toString();
          var lines = buffer.split('\n');
          buffer = lines.pop();

          for (var i = 0; i < lines.length; i++) {
            var line = lines[i].trim();
            if (!line || line.indexOf('data: ') !== 0) continue;
            var payload = line.slice(6);
            if (payload === '[DONE]') continue;
            try {
              var parsed = JSON.parse(payload);
              var content = parsed.choices && parsed.choices[0] && parsed.choices[0].delta && parsed.choices[0].delta.content;
              if (content) {
                fullResponse += content;
                res.write(content);
              }
            } catch(e) {}
          }
        });

        groqRes.on('end', function() {
          if (chatId) {
            if (!memories[chatId]) memories[chatId] = [];
            memories[chatId].push({ role: 'user', content: message });
            memories[chatId].push({ role: 'assistant', content: fullResponse });
            if (memories[chatId].length > MAX_MEMORY) {
              memories[chatId] = memories[chatId].slice(-MAX_MEMORY);
            }
          }
          res.end();
        });

        groqRes.on('error', function(err) {
          res.write('[Stream error: ' + err.message + ']');
          res.end();
        });
      });

      groqReq.on('error', function(err) {
        if (!res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
        }
        res.end(JSON.stringify({ error: { message: 'Failed to reach Groq API: ' + err.message } }));
      });

      groqReq.write(postData);
      groqReq.end();

    } catch(e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: { message: 'Invalid request: ' + e.message } }));
    }
  });
}

const server = http.createServer(function(req, res) {
  var parsedUrl = url.parse(req.url, true);
  var pathname = parsedUrl.pathname;

  // Root or /chat without ?I'd= -> generate new ID and redirect
  if ((pathname === '/' || pathname === '/chat') && !parsedUrl.query["I'd"]) {
    var newId = genId();
    res.writeHead(302, { 'Location': "/chat?I'd=" + newId });
    res.end();
    return;
  }

  // Serve HTML with the chat ID
  if (pathname === '/' || pathname === '/chat') {
    var chatId = parsedUrl.query["I'd"] || '';
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(buildHTML(chatId));
    return;
  }

  if (pathname === '/api/chat' && req.method === 'POST') {
    handleChat(req, res);
    return;
  }

  if (pathname === '/api/history' && req.method === 'GET') {
    handleHistory(parsedUrl, res);
    return;
  }

  res.writeHead(404);
  res.end('Not Found');
});

server.listen(PORT, function() {
  console.log('');
  console.log('  Chat server running at:');
  console.log('  http://localhost:' + PORT);
  console.log('  Every visit auto-creates a new chat with a persistent ID.');
  console.log('  Share the URL to resume any conversation.');
  console.log('');
});
