const app = require('./app');
const PORT = process.env.PORT || 3000; // Server port
const http = require('http');
const { Server } = require('socket.io');

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

// Make io accessible globally
app.set('io', io);

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    socket.on('joinGame', (gameId) => {
        socket.join(gameId);
        console.log(`Client joined game room: ${gameId}`);
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});


// Start Server
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}

// export the server
module.exports = server;