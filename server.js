const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Store connected users
const users = new Map();
let messageHistory = [];

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('New user connected:', socket.id);
  
  // Handle user joining
  socket.on('user-joined', (username) => {
    users.set(socket.id, username);
    
    // Broadcast to all users that someone joined
    socket.broadcast.emit('user-joined', {
      username,
      timestamp: new Date().toLocaleTimeString()
    });
    
    // Send message history to the new user
    socket.emit('message-history', messageHistory);
    
    // Update user list for all clients
    io.emit('user-list', Array.from(users.values()));
  });
  
  // Handle new messages
  socket.on('send-message', (data) => {
    const message = {
      id: Date.now(),
      username: users.get(socket.id),
      message: data.message,
      timestamp: new Date().toLocaleTimeString()
    };
    
    // Store message in history (limit to last 100 messages)
    messageHistory.push(message);
    if (messageHistory.length > 100) {
      messageHistory = messageHistory.slice(-100);
    }
    
    // Broadcast message to all users
    io.emit('new-message', message);
  });
  
  // Handle typing indicators
  socket.on('typing', () => {
    socket.broadcast.emit('user-typing', users.get(socket.id));
  });
  
  socket.on('stop-typing', () => {
    socket.broadcast.emit('user-stop-typing', users.get(socket.id));
  });
  
  // Handle user disconnect
  socket.on('disconnect', () => {
    const username = users.get(socket.id);
    if (username) {
      users.delete(socket.id);
      
      // Broadcast to all users that someone left
      socket.broadcast.emit('user-left', {
        username,
        timestamp: new Date().toLocaleTimeString()
      });
      
      // Update user list for all clients
      io.emit('user-list', Array.from(users.values()));
    }
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});