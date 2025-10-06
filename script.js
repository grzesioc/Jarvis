// Konfiguration
const webhookUrl = "https://grzesioc.app.n8n.cloud/webhook/eb6b49ba-c422-48d1-bb86-196e80090a5e/chat";
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const chatMessages = document.getElementById('chat-messages');

// Sicheres HTML-Rendering (um XSS zu verhindern)
function escapeHtml(s) {
    return s.replace(/[&<>"']/g, m => (
        { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]
    ));
}

// Simples Markdown-Rendering (fett, kursiv, Zeilenumbruch)
function renderMarkdownLite(s) {
    let t = escapeHtml(s);
    t = t.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    t = t.replace(/\*(.*?)\*/g, '<em>$1</em>');
    t = t.replace(/\n/g, '<br>');
    return t;
}

// Funktion zum Hinzufügen einer Nachricht zum Chatverlauf
function addMessage(text, sender, animate = true) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);
    if (animate) {
        // Fügt die CSS-Animationsklasse hinzu
        messageDiv.classList.add('animating');
    }
    
    messageDiv.innerHTML = renderMarkdownLite(text);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Zum Ende scrollen
}

// Simuliert das Senden einer Nachricht an den WebHook
async function sendMessageToWebhook(message) {
    // Deaktiviert den Button während der Verarbeitung
    sendButton.disabled = true;

    // Thinking-UI erstellen und hinzufügen
    const thinkingMessageDiv = document.createElement('div');
    thinkingMessageDiv.classList.add('message', 'bot', 'thinking-message');
    thinkingMessageDiv.innerHTML = `
        <svg class="snowflake-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="currentColor">
            <path d="M50 0 L55 20 L75 25 L55 30 L50 50 L45 30 L25 25 L45 20 Z" />
            <path d="M50 0 L55 20 L75 25 L55 30 L50 50 L45 30 L25 25 L45 20 Z" transform="rotate(60 50 50)" />
            <path d="M50 0 L55 20 L75 25 L55 30 L50 50 L45 30 L25 25 L45 20 Z" transform="rotate(120 50 50)" />
            <path d="M50 0 L55 20 L75 25 L55 30 L50 50 L45 30 L25 25 L45 20 Z" transform="rotate(180 50 50)" />
            <path d="M50 0 L55 20 L75 25 L55 30 L50 50 L45 30 L25 25 L45 20 Z" transform="rotate(240 50 50)" />
            <path d="M50 0 L55 20 L75 25 L55 30 L50 50 L45 30 L25 25 L45 20 Z" transform="rotate(300 50 50)" />
        </svg>
        <i>Jarvis denkt nach<span id="dots" class="thinking-dots"></span></i>`;
    chatMessages.appendChild(thinkingMessageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Dots-Animation starten
    const dotsSpan = thinkingMessageDiv.querySelector('#dots');
    let dotCount = 0;
    const interval = setInterval(() => {
        dotCount = (dotCount + 1) % 4;
        dotsSpan.textContent = '.'.repeat(dotCount);
    }, 500);

    // Timeout von 90 Sekunden (90000 ms) via AbortController
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 90000);

    try {
        const payload = {
            user: "User",
            message: message,
            request_id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
            timestamp: new Date().toISOString()
        };

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload),
            signal: ctrl.signal // Verbindung nach Timeout abbrechen
        });

        // Aufräumen, unabhängig vom Erfolg
        clearTimeout(t);
        clearInterval(interval);
        thinkingMessageDiv.remove();

        if (!response.ok) {
            const txt = await response.text().catch(() => '');
            addMessage(`Fehler vom Server (${response.status}): ${txt || response.statusText}`, 'bot');
            return;
        }

        // Response parsen
        const ct = response.headers.get('content-type') || '';
        let responseContent = '';
        if (ct.includes('application/json')) {
            const result = await response.json();
            // Versuche, das erwartete Feld zu finden
            responseContent =
                result.output ??
                result.message ??
                result.text ??
                JSON.stringify(result, null, 2);
        } else {
            responseContent = await response.text();
        }

        addMessage(responseContent || 'Leere Antwort erhalten.', 'bot');
    } catch (err) {
        // Aufräumen bei Fehlern (z.B. Timeout oder Netzwerkfehler)
        clearTimeout(t);
        clearInterval(interval);
        thinkingMessageDiv.remove();
        // Prüfen, ob der Fehler ein Abbruch war
        if (err.name === 'AbortError') {
             addMessage('Zeitüberschreitung (90 Sekunden) beim Warten auf eine Antwort. Bitte versuche es noch einmal.', 'bot');
        } else {
            addMessage('Verbindungsfehler oder unbekannter Fehler. Bitte nochmal versuchen.', 'bot');
            console.error(err);
        }
    } finally {
        sendButton.disabled = false;
    }
}

// Sende-Funktion
function handleSendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        // Füge die Benutzernachricht mit Animation hinzu
        addMessage(message, 'user');
        // Sende die Nachricht an den WebHook
        sendMessageToWebhook(message);
        messageInput.value = '';
        // Setzt die Höhe des Textfeldes zurück
        messageInput.style.height = '48px';
    }
}

// Ereignis-Listener: Klick auf Senden-Button
sendButton.addEventListener('click', handleSendMessage);

// Ereignis-Listener: Enter-Taste (ohne Shift)
messageInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        handleSendMessage();
    }
});

// Automatische Höhenanpassung des Textbereichs bei Eingabe
messageInput.addEventListener('input', () => {
    messageInput.style.height = 'auto';
    messageInput.style.height = messageInput.scrollHeight + 'px';
});
