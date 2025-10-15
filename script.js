// Socket connection
const socket = io();

// DOM Elements
const loginModal = document.getElementById('loginModal');
const usernameInput = document.getElementById('usernameInput');
const joinBtn = document.getElementById('joinBtn');
const currentUserSpan = document.getElementById('currentUser');
const usersList = document.getElementById('usersList');
const userCount = document.getElementById('userCount');
const messagesContainer = document.getElementById('messages');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const typingIndicator = document.getElementById('typingIndicator');

// App state
let currentUser = '';
let typingTimer;
const TYPING_TIMEOUT = 1000;

// Event Listeners
joinBtn.addEventListener('click', joinChat);
usernameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') joinChat();
});

messageInput.addEventListener('keypress', handleTyping);
messageInput.addEventListener('blur', stopTyping);
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});

// Functions
function joinChat() {
    const username = usernameInput.value.trim();
    if (username) {
        currentUser = username;
        currentUserSpan.textContent = username;
        loginModal.style.display = 'none';
        socket.emit('user-joined', username);
    }
}

function sendMessage() {
    const message = messageInput.value.trim();
    if (message) {
        socket.emit('send-message', { message });
        messageInput.value = '';
        stopTyping();
    }
    messageInput.focus();
}

function handleTyping() {
    socket.emit('typing');
    clearTimeout(typingTimer);
    typingTimer = setTimeout(stopTyping, TYPING_TIMEOUT);
}

function stopTyping() {
    socket.emit('stop-typing');
}

function addMessage(message, type = 'other') {
    const messageElement = document.createElement('div');
    messageElement.className = `message ${type}`;
    
    messageElement.innerHTML = `
        <div class="message-header">
            <span class="username">${message.username}</span>
            <span class="timestamp">${message.timestamp}</span>
        </div>
        <div class="message-content">${escapeHtml(message.message)}</div>
    `;
    
    messagesContainer.appendChild(messageElement);
    scrollToBottom();
}

function addSystemMessage(text) {
    const messageElement = document.createElement('div');
    messageElement.className = 'system-message';
    messageElement.textContent = text;
    messagesContainer.appendChild(messageElement);
    scrollToBottom();
}

function updateUsersList(users) {
    usersList.innerHTML = '';
    userCount.textContent = users.length;
    
    users.forEach(user => {
        const userElement = document.createElement('div');
        userElement.className = 'user-item';
        
        const avatarText = user.charAt(0).toUpperCase();
        userElement.innerHTML = `
            <div class="user-avatar">${avatarText}</div>
            <span class="user-name">${user}</span>
        `;
        
        usersList.appendChild(userElement);
    });
}

function scrollToBottom() {
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Socket Event Handlers
socket.on('message-history', (history) => {
    history.forEach(message => {
        const type = message.username === currentUser ? 'own' : 'other';
        addMessage(message, type);
    });
});

socket.on('new-message', (message) => {
    const type = message.username === currentUser ? 'own' : 'other';
    addMessage(message, type);
});

socket.on('user-joined', (data) => {
    addSystemMessage(`${data.username} joined the chat`);
});

socket.on('user-left', (data) => {
    addSystemMessage(`${data.username} left the chat`);
});

socket.on('user-list', (users) => {
    updateUsersList(users);
});

socket.on('user-typing', (username) => {
    if (username !== currentUser) {
        typingIndicator.textContent = `${username} is typing...`;
    }
});

socket.on('user-stop-typing', (username) => {
    if (username !== currentUser) {
        typingIndicator.textContent = '';
    }
});

// Auto-focus username input on load
window.addEventListener('load', () => {
    usernameInput.focus();
});