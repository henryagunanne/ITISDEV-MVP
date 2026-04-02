const app = require('./app');
const PORT = process.env.PORT || 3000; // Server port
const http = require('http');
const { Server } = require('socket.io');

const Game = require('./models/Game');

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    }
});

// Make io accessible globally
app.set('io', io);


// Create an in-memory tracker for the last time we hit the database
const lastSavedTimes = {};

io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join a specific game "room"
    socket.on('join_game', (gameId) => {
        socket.join(gameId);
        console.log(`Socket ${socket.id} joined game: ${gameId}`);
    });

    // Listen for clock updates from the Admin and broadcast to viewers
    socket.on('sync_clock', async (data) => {
       // INSTANT BROADCAST: Send the time to all viewers immediately with 0 delay
       socket.to(data.gameId).emit('clock_updated', {
            gameClock: data.gameClock,
            clockSeconds: data.clockSeconds
        });

        // THROTTLED DB SAVE: Only update MongoDB every 10 seconds
        const now = Date.now();
        const lastSaved = lastSavedTimes[data.gameId] || 0;

        // If 10,000 milliseconds (10 seconds) have passed since the last save
        if (now - lastSaved >= 10000) {
            lastSavedTimes[data.gameId] = now; // Update the tracker
            
            try {
                // "Fire and forget" DB update. We don't await this blocking the socket.
                await Game.findByIdAndUpdate(data.gameId, { 
                    gameClock: data.gameClock
                });
                console.log(`[DB] Backed up clock for ${data.gameId}: ${data.gameClock}`);
            } catch (error) {
                console.error("Error backing up game clock:", error);
            }
        }
    });

    // Handle start/pause relay from one socket to all others in the same game room
    socket.on('clock_control', (data) => {
        // Relays the 'start' or 'pause' action to everyone else in the game room
        socket.to(data.gameId).emit('clock_control_updated', {
            action: data.action
        });
    });

    // Handle UI layout relay from one socket to all others in the same game room
    socket.on('sync_ui_layout', (data) => {
        // Relays the exact HTML DOM order of the player panels to other admins
        socket.to(data.gameId).emit('ui_layout_synced', {
            panelId: data.panelId,
            order: data.order
        });
    });


    // Relay for toggling on-court / bench status classes
    socket.on('sync_on_court_toggle', (data) => {
        socket.to(data.gameId).emit('on_court_toggled', {
            rowId: data.rowId
        });
    });
    

    socket.on('leave_game', (gameId) => { 
        socket.leave(gameId); 
    });


    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
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