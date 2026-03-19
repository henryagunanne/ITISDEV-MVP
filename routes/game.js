const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');

const { isAuthenticated, authorize } = require('../middleware/auth');

router.use(isAuthenticated);


// Create a new game
router.post('/create', gameController.createGame);

// Get all games
router.get('/all-games', gameController.getGames);


// Get game by date range
router.get('/date-range', gameController.getGamesByDateRange);
// Get Games by Team Score Range
router.get('/team-score-range', gameController.getGamesByTeamScoreRange);

// Get Games by Opponent Score Range
router.get('/opponent-score-range', gameController.getGamesByOpponentScoreRange);

// Get Games by Score Difference Range
router.get('/score-difference-range', gameController.getGamesByScoreDifferenceRange);

// Get Games by Multiple Filters - returns all games that match a combination of filters (e.g., opponent, venue, season, status, result), sorted by date (newest first)
router.get('/search', gameController.getGamesByFilters);


// Get a specific game by ID
router.get('/:gameId', gameController.getGameById);

// PATCH update a game status/period
router.patch('/:gameId', gameController.updateGameStatus);

// POST record event
router.post('/:gameId/events', gameController.recordGameEvent);

// POST undo last event
router.post('/:gameId/undo', gameController.undoLastEvent);

// POST add overtime
router.post('/:gameId/overtime', gameController.addOvertime);

// GET stats for a game
router.get('/:gameId/stats', gameController.loadStats);

// GET events for a game
router.get('/:gameId/events',  gameController.loadEvents);

// Get games by Tournament ID
router.get('/tournament/:tournamentId', gameController.getGamesByTournament);

// Get games by Season
router.get('/season/:season', gameController.getGamesBySeason);

// Get games by Opponent Team
router.get('/opponent/:opponentTeam', gameController.getGamesByOpponent);

// Get game by status
router.get('/status/:status', gameController.getGamesByStatus);

// Get game by Result
router.get('/result/:result', gameController.getGamesByResult);

// Get Games by Venue 
router.get('/venue/:venue', gameController.getGamesByVenue);

// Get Games by Multiple Filters and Date Range - returns all games that match a combination of filters (e.g., opponent, venue, season, status, result) and occurred within a specified date range, sorted by date (newest first)
router.get('/search/date-range', gameController.getGamesByFiltersAndDateRange);

// Get Games by Multiple Filters and Score Range - returns all games that match a combination of filters (e.g., opponent, venue, season, status, result) and where the team's score and/or opponent's score falls within specified ranges, sorted by date (newest first)
router.get('/search/score-range', gameController.getGamesByFiltersAndScoreRange);

// Get Games by Multiple Filters, Date Range, and Score Range
router.get('/search/date-score-range', gameController.getGamesByFiltersDateRangeAndScoreRange);

// Update a game by ID
router.put('/:gameId', gameController.updateGame);

// Delete a game by ID
router.delete('/:gameId', gameController.deleteGame);



// Export the router to be used in app.js
module.exports = router;