const express = require('express');
const router = express.Router();
const gameStatsController = require('../controllers/gameStatsController');

const { isAuthenticated, authorize } = require('../middleware/auth');

router.use(isAuthenticated); 

// Create a new game statistic entry
router.post('/create', authorize('Coach', 'Statistician'), gameStatsController.createGameStats);

// Update game statistics by ID
router.put('/update/:id', authorize('Statistician'), gameStatsController.updateGameStats);

// Delete game statistics by ID
router.delete('/delete/:id', authorize('Statistician'), gameStatsController.deleteGameStats);

// Get game stats by gameId 
router.get('/game/:gameId', authorize('Coach', 'Statistician'), gameStatsController.getStatsByGameId);

// Get game stats by playerId 
router.get('/player/:playerId', authorize('Coach', 'Statistician'), gameStatsController.getStatsByPlayerId);

// Get all game stats
router.get('/all', authorize('Coach', 'Statistician'), gameStatsController.getAllGameStats);

// Export the router
module.exports = router;