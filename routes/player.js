const express = require('express');
const router = express.Router();
const playerController = require('../controllers/playerController');

const { isAuthenticated, authorize } = require('../middleware/auth');

router.use(isAuthenticated);

// Create a new player record
router.post('/create', authorize('Admin', 'Coach'), playerController.createPlayer);


// Get all players
router.get('/all-players', playerController.getAllPlayers);

// Get Active Players
router.get('/active', playerController.getActiveRoster);

// Get Injured Players
router.get('/injured', playerController.getInjuredPlayers);

// Get inactive players
router.get('/inactive', playerController.getInactivePlayers);

// Get a specific player by ID
router.get('/:id', playerController.getPlayerById);

// Get players by position
router.get('/position/:position', playerController.getPlayersByPosition);

// Get players by yearLevel
router.get('/yearLevel/:yearLevel', playerController.getPlayersByYearLevel);

// Update a player record
router.put('/update/:id', authorize('Admin', 'Coach'), playerController.updatePlayer);

// Delete a player record
router.delete('/delete/:id', authorize('Admin', 'Coach'), playerController.deletePlayer);

// Update player status (active/injured/inactive)
router.put('/update-status/:id', authorize('Admin', 'Coach'), playerController.updatePlayerStatus);



// Export the router to be used in app.js
module.exports = router;