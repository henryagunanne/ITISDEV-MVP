const app = require('./app');
const PORT = process.env.PORT || 3000; // Server port
const http = require('http');
const { Server } = require('socket.io');

const Game = require('./models/Game');

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "*"
    },
    pingInterval: 25000,  // How often to ping the browser (25 seconds)
    pingTimeout: 120000   // Give background tabs a full 2 minutes to reply before kicking them
});

// Make io accessible globally
app.set('io', io);


// Create an in-memory tracker for the last time we hit the database
const lastSavedTimes = {};
// Global memory objects to hold the state of all active games
const activeGames = {}; 


io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join a specific game "room"
    socket.on('join_game', (gameId) => {
        socket.join(gameId);
        console.log(`Socket ${socket.id} joined game: ${gameId}`);
    });

    // --- START CLOCK COMMAND ---
    socket.on('cmd_start_clock', (gameId) => {
        if (!activeGames[gameId]) {
            activeGames[gameId] = { 
                seconds: 600, 
                isRunning: false, 
                interval: null 
            };
        }
        
        if (activeGames[gameId].isRunning) return; 

        // Prevent the clock from starting if time is already 0!
        if (activeGames[gameId].seconds <= 0) return;

        activeGames[gameId].isRunning = true;
        
        // Broadcast the start action to unlock the UI for everyone
        io.to(gameId).emit('clock_control_updated', { action: 'start' });

        // Start the server-side countdown
        activeGames[gameId].interval = setInterval(async () => {
            activeGames[gameId].seconds--;
            
            // INSTANT BROADCAST: Send the exact second to EVERYONE
            io.to(gameId).emit('clock_tick', { 
                clockSeconds: activeGames[gameId].seconds 
            });

            // THROTTLED DB SAVE: 10-second backup logic
            const now = Date.now();
            const lastSaved = lastSavedTimes[gameId] || 0;

            if (now - lastSaved >= 10000) {
                lastSavedTimes[gameId] = now;

                
                // Format the clock string for the database (MM:SS)
                const m = Math.floor(activeGames[gameId].seconds / 60);
                const s = activeGames[gameId].seconds % 60;
                const gameClockStr = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                
                try {
                    // Fire and forget DB update
                    await Game.findByIdAndUpdate(gameId, { gameClock: gameClockStr });
                    // console.log(`[DB] Backed up clock for ${gameId}: ${gameClockStr}`);
                } catch (error) {
                    console.error("Error backing up game clock:", error);
                }
            }

            // AUTO-END PERIOD
            if (activeGames[gameId].seconds <= 0) {
                // Stop the loop
                clearInterval(activeGames[gameId].interval);
                activeGames[gameId].isRunning = false;
                
                // Broadcast 'pause' to update the UI to show the 'Resume' button instead of 'Start'
                io.to(gameId).emit('clock_control_updated', { action: 'pause' });
                
                // Force a final database sync right now, bypassing your 10-second throttle!
                // This guarantees the database records the 00:00 mark exactly.
                Game.findByIdAndUpdate(gameId, { 
                    gameClock: '00:00',
                    status: 'PAUSED' // Ensures the DB knows the game is paused between quarters
                }).catch(err => console.error("Failed to force-save final zero tick:", err));
            }
        }, 1000);
    });

    // --- PAUSE CLOCK COMMAND ---
    socket.on('cmd_pause_clock', (gameId) => {
        if (activeGames[gameId] && activeGames[gameId].isRunning) {
            clearInterval(activeGames[gameId].interval);
            activeGames[gameId].isRunning = false;
            
            // Tell ALL clients to show the 'Resume' button
            io.to(gameId).emit('clock_control_updated', { action: 'pause' });
        }
    });

    // --- SET/RESET CLOCK COMMAND (For Quarters & Overtime) ---
    socket.on('cmd_set_clock', (data) => {
        const { gameId, newSeconds } = data;
        
        if (!activeGames[gameId]) {
            activeGames[gameId] = { seconds: 600, isRunning: false, interval: null };
        }
        
        // Update the server's memory with the new time
        activeGames[gameId].seconds = newSeconds;
        
        // Broadcast the new time immediately without waiting for a tick
        io.to(gameId).emit('clock_tick', { clockSeconds: newSeconds });
    });


    // --- UNLOCK FREE THROWS COMMAND ---
    socket.on('cmd_unlock_ft', (gameId) => {
        // Tell everyone in the room to unlock their FT buttons
        io.to(gameId).emit('clock_control_updated', { action: 'foul' });
    });


    // --- END GAME COMMAND ---
    socket.on('cmd_end_game', (gameId) => {
        // Physically stop the server interval if it's running
        if (activeGames[gameId]) {
            clearInterval(activeGames[gameId].interval);
            activeGames[gameId].isRunning = false;
        }
        
        // Tell everyone in the room to update their UI to the "FINAL" state
        io.to(gameId).emit('clock_control_updated', { action: 'end' });
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


    // When a reloaded client asks for the current UI state
    socket.on('request_ui_sync', (gameId) => {
        // Relay the request to everyone ELSE in the game room
        socket.to(gameId).emit('request_ui_sync');
    });

    // When an active client replies with their UI snapshot
    socket.on('send_ui_sync', (data) => {
        // Broadcast the snapshot to everyone ELSE in the game room
        socket.to(data.gameId).emit('receive_ui_sync', data);
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
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
  });
}

// export the server
module.exports = server;