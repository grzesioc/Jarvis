// docs/script.js

// Initialisieren der User-ID beim ersten Besuch
if (!localStorage.getItem('userId')) {
    const userId = `User-${Math.floor(Math.random() * 10000)}`; // Generiert eine zufällige User-ID
    localStorage.setItem('userId', userId);
}

// Funktion zum Senden von Nachrichten an n8n
function sendMessage(message) {
    const userId = localStorage.getItem('userId'); // Holt die User-ID aus localStorage
    const payload = {
        user: userId, // User-ID verwenden
        message: message
    };

    // ... der restliche Code zum Senden des Payloads an n8n
}

// Rest des Skripts
// ...