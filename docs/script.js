// docs/script.js

// Initialisieren der User-ID beim ersten Besuch
if (!localStorage.getItem('userId')) {
    const userId = `User-${Math.floor(Math.random() * 10000)}`; // Generiert eine zufällige User-ID
    localStorage.setItem('userId', userId);
}

// Konfiguration
const webhookUrl = "https://grzesioc.app.n8n.cloud/webhook/5b09c900-b890-4c60-91b0-ff5945aba68e";
const messageInput = document.getElementById('message-input');
const sendButton = document.getElementById('send-button');
const chatMessages = document.getElementById('chat-messages');
const chatForm = document.querySelector('.chat-input');
const resumePopupOverlay = document.getElementById('resume-popup-overlay');
const resumePopupInput = document.getElementById('resume-popup-input');
const resumePopupSendButton = document.getElementById('resume-popup-send');
const resumePopupCloseButton = document.getElementById('resume-popup-close');
const resumePopupFeedback = document.getElementById('resume-popup-feedback');

let currentResumeUrl = null;

// Sicheres HTML-Rendering (um XSS zu verhindern)
function escapeHtml(s) {
    return s.replace(/[&<>\"']/g, m => (
        { '&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;' }[m]
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
function sanitizeResumeUrl(url) {
    if (typeof url !== 'string') return null;
    const trimmed = url.trim();
    if (!trimmed) return null;

    const validate = (candidate) => {
        try {
            // new URL(...) wirft bei ungültigen URLs einen Fehler
            new URL(candidate);
            return candidate;
        } catch (error) {
            return null;
        }
    };

    const direct = validate(trimmed);
    if (direct) {
        return direct;
    }

    const softened = trimmed.replace(/[)\]\}>,.;!]+$/, '');
    return validate(softened);
}

function addMessage(text, sender, animate = true, resumeUrlExplicit = null) {
    const messageDiv = document.createElement('div');
    messageDiv.classList.add('message', sender);
    if (animate) {
        // Fügt die CSS-Animationsklasse hinzu
        messageDiv.classList.add('animating');
    }

    let resumeUrl = resumeUrlExplicit ? sanitizeResumeUrl(resumeUrlExplicit) : null;
    let displayText = typeof text === 'string' ? text : String(text ?? '');

    if (sender === 'bot') {
        let placeholderRemoved = false;
        if (!resumeUrl) {
            const urlMatch = displayText.match(/https?:\/\/[^\s<>"]+/);
            if (urlMatch) {
                resumeUrl = sanitizeResumeUrl(urlMatch[0]);
                displayText = displayText.replace(urlMatch[0], '').trim();
            }
        }

        const placeholderRegex = /\{\{\s*\$execution\.resumeUrl\s*\}\}/g;
        if (placeholderRegex.test(displayText)) {
            placeholderRemoved = true;
            displayText = displayText.replace(placeholderRegex, '').trim();
        }

        if (!resumeUrl && placeholderRemoved) {
            displayText = `${displayText ? `${displayText}\n\n` : ''}Die Resume-URL konnte nicht geladen werden.`;
        }

        if (!displayText && resumeUrl) {
            displayText = 'Klicke auf den frostigen Button, um direkt auf den Workflow zu antworten.';
        }
    }

    const messageText = document.createElement('div');
    messageText.classList.add('message-text');
    messageText.innerHTML = renderMarkdownLite(displayText);
    messageDiv.appendChild(messageText);

    if (sender === 'bot' && resumeUrl) {
        const buttonWrapper = document.createElement('div');
        buttonWrapper.classList.add('resume-button-wrapper');

        const resumeButton = document.createElement('button');
        resumeButton.type = 'button';
        resumeButton.classList.add('resume-trigger-button');
        resumeButton.innerHTML = '<span aria-hidden="true">❄️</span> Workflow antworten';
        resumeButton.addEventListener('click', () => showResumePopup(resumeUrl));

        buttonWrapper.appendChild(resumeButton);
        messageDiv.appendChild(buttonWrapper);
    }

    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight; // Zum Ende scrollen
}

// Skeleton Loader hinzufügen
function addSkeletonLoader() {
    const skeletonDiv = document.createElement('div');
    skeletonDiv.classList.add('skeleton-loader');
    skeletonDiv.setAttribute('aria-label', 'KI antwortet...');
    skeletonDiv.id = 'skeleton-loader';
    chatMessages.appendChild(skeletonDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Skeleton Loader entfernen
function removeSkeletonLoader() {
    const skeleton = document.getElementById('skeleton-loader');
    if (skeleton) skeleton.remove();
}

// Simuliert das Senden einer Nachricht an den WebHook
async function sendMessageToWebhook(message) {
    sendButton.disabled = true;

    // Skeleton Loader anzeigen
    addSkeletonLoader();

    // Thinking-UI erstellen und hinzufügen (bleibt für visuelle Rückmeldung)
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
        const userId = localStorage.getItem('userId');
        const payload = {
            user: userId || "User",
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

        clearTimeout(t);
        clearInterval(interval);
        thinkingMessageDiv.remove();
        removeSkeletonLoader();

        if (!response.ok) {
            const txt = await response.text().catch(() => '');
            addMessage(`Fehler vom Server (${response.status}): ${txt || response.statusText}`, 'bot');
            return;
        }

        // Response parsen
        const ct = response.headers.get('content-type') || '';
        let responseContent = '';
        let resumeLink = null;
        if (ct.includes('application/json')) {
            const result = await response.json();
            const possibleResumeKeys = [
                'resumeUrl',
                'resume_url',
                'executionResumeUrl',
                'execution_resume_url',
                'resume'
            ];

            for (const key of possibleResumeKeys) {
                if (typeof result?.[key] === 'string') {
                    resumeLink = result[key];
                    break;
                }
            }

            const contentCandidate =
                result.output ??
                result.message ??
                result.text ??
                (typeof result === 'string' ? result : null);

            if (typeof contentCandidate === 'string') {
                responseContent = contentCandidate;
            } else if (Array.isArray(contentCandidate)) {
                responseContent = contentCandidate.join('\n');
            } else if (typeof result.description === 'string') {
                responseContent = result.description;
            } else {
                responseContent = JSON.stringify(result, null, 2);
            }
        } else {
            responseContent = await response.text();
        }

        addMessage(responseContent || 'Leere Antwort erhalten.', 'bot', true, resumeLink);
    } catch (err) {
        clearTimeout(t);
        clearInterval(interval);
        thinkingMessageDiv.remove();
        removeSkeletonLoader();
        if (err.name === 'AbortError') {
            addMessage('Zeitüberschreitung (90 Sekunden) beim Warten auf eine Antwort. Bitte versuche es noch einmal.', 'bot');
        } else {
            addMessage('Verbindungsfehler oder unbekannter Fehler. Bitte nochmal versuchen.', 'bot');
            console.error(err);
        }
    } finally {
        sendButton.disabled = false;
        messageInput.focus();
    }
}

function showResumePopup(url) {
    const safeUrl = sanitizeResumeUrl(url);
    if (!safeUrl) {
        addMessage('Die Resume-URL ist nicht gültig oder fehlt.', 'bot');
        return;
    }

    if (!resumePopupOverlay || !resumePopupInput || !resumePopupSendButton || !resumePopupFeedback) {
        console.warn('Resume-Popup konnte nicht geöffnet werden, da UI-Elemente fehlen.');
        addMessage('Die Antwortfunktion steht derzeit nicht zur Verfügung.', 'bot');
        return;
    }

    currentResumeUrl = safeUrl;
    resumePopupOverlay.classList.add('visible');
    resumePopupOverlay.removeAttribute('aria-hidden');
    document.body.classList.add('resume-popup-open');
    resumePopupInput.value = '';
    resumePopupInput.focus();
    resumePopupFeedback.textContent = '';
    resumePopupSendButton.disabled = false;
    resumePopupSendButton.textContent = 'Senden';
}

function hideResumePopup() {
    if (!resumePopupOverlay || !resumePopupInput || !resumePopupSendButton || !resumePopupFeedback) {
        return;
    }

    resumePopupOverlay.classList.remove('visible');
    resumePopupOverlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('resume-popup-open');
    currentResumeUrl = null;
    resumePopupInput.value = '';
    resumePopupFeedback.textContent = '';
    resumePopupSendButton.disabled = false;
    resumePopupSendButton.textContent = 'Senden';
    messageInput.focus();
}

async function handleResumeSend() {
    if (!resumePopupOverlay || !resumePopupInput || !resumePopupSendButton || !resumePopupFeedback) {
        addMessage('Die Antwortfunktion steht derzeit nicht zur Verfügung.', 'bot');
        return;
    }

    const replyText = resumePopupInput.value.trim();
    if (!currentResumeUrl) {
        resumePopupFeedback.textContent = 'Es ist keine gültige Antwort-URL vorhanden.';
        return;
    }

    if (!replyText) {
        resumePopupFeedback.textContent = 'Bitte gib eine Nachricht ein, bevor du sendest.';
        return;
    }

    resumePopupSendButton.disabled = true;
    resumePopupSendButton.textContent = 'Senden…';
    resumePopupFeedback.textContent = '';

    try {
        const userId = localStorage.getItem('userId');
        const payload = {
            user: userId || 'User',
            message: replyText,
            reply: replyText,
            text: replyText,
            output: replyText,
            timestamp: new Date().toISOString()
        };

        const response = await fetch(currentResumeUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const txt = await response.text().catch(() => '');
            const message = txt || response.statusText || 'Unbekannter Fehler';
            throw new Error(message);
        }

        hideResumePopup();
        addMessage('Antwort wurde erfolgreich an den Workflow gesendet.', 'bot');
    } catch (error) {
        console.error('Resume send error:', error);
        resumePopupSendButton.disabled = false;
        resumePopupSendButton.textContent = 'Senden';
        resumePopupFeedback.textContent = `Antwort konnte nicht gesendet werden: ${error?.message || 'Unbekannter Fehler'}.`;
    }
}

// Sende-Funktion
function handleSendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        addMessage(message, 'user');
        sendMessageToWebhook(message);
        messageInput.value = '';
        messageInput.style.height = '48px';
    }
}

// Ereignis-Listener: Klick auf Senden-Button oder Enter im Formular
chatForm.addEventListener('submit', (event) => {
    event.preventDefault();
    handleSendMessage();
});

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

if (resumePopupSendButton) {
    resumePopupSendButton.addEventListener('click', handleResumeSend);
}

if (resumePopupCloseButton) {
    resumePopupCloseButton.addEventListener('click', hideResumePopup);
}

if (resumePopupInput) {
    resumePopupInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            handleResumeSend();
        }
    });
}

if (resumePopupOverlay) {
    resumePopupOverlay.addEventListener('click', (event) => {
        if (event.target === resumePopupOverlay) {
            hideResumePopup();
        }
    });
}

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && resumePopupOverlay?.classList.contains('visible')) {
        hideResumePopup();
    }
});
