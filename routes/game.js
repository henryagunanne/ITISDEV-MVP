const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');

const { isAuthenticated, authorize } = require('../middleware/auth');

router.use(isAuthenticated);


// Create a new game
router.post('/create', authorize('Coach', 'Statistician'), gameController.createGame);

// Get all games (Optionally filter by tournament)
router.get('/all-games', authorize('Coach', 'Statistician'), gameController.getGames);


// Get game by date range
router.get('/date-range', authorize('Coach', 'Statistician'), gameController.getGamesByDateRange);

// Get Games by Team Score Range
router.get('/team-score-range', authorize('Coach', 'Statistician'), gameController.getGamesByTeamScoreRange);

// Get Games by Opponent Score Range
router.get('/opponent-score-range', authorize('Coach', 'Statistician'), gameController.getGamesByOpponentScoreRange);

// Get Games by Score Difference Range
router.get('/score-difference-range', authorize('Coach', 'Statistician'), gameController.getGamesByScoreDifferenceRange);

// Get Games by Multiple Filters - returns all games that match a combination of filters (e.g., opponent, venue, season, status, result), sorted by date (newest first)
router.get('/search', authorize('Coach', 'Statistician'), gameController.getGamesByFilters);


// Get a specific game by ID
router.get('/:gameId', authorize('Coach', 'Statistician'), gameController.getGameById);

// PATCH update a game status/period
router.patch('/:gameId', authorize('Coach', 'Statistician'), gameController.updateGameStatus);

// POST record event
router.post('/:gameId/events', authorize('Coach', 'Statistician'), gameController.recordGameEvent);

// POST undo last event
router.post('/:gameId/undo', authorize('Coach', 'Statistician'), gameController.undoLastEvent);

// POST add overtime
router.post('/:gameId/overtime', authorize('Coach', 'Statistician'), gameController.addOvertime);

// GET stats for a game
router.get('/:gameId/stats', authorize('Coach', 'Statistician'), gameController.loadStats);

// GET events for a game
router.get('/:gameId/events',  authorize('Coach', 'Statistician'), gameController.loadEvents);

// GET generate AI insights for a game
router.get('/:gameId/insights', authorize('Coach'), gameController.generateInsights);


// Get games by Tournament ID
router.get('/tournament/:tournamentId', authorize('Coach', 'Statistician'), gameController.getGamesByTournament);

// Get games by Season
router.get('/season/:season', authorize('Coach', 'Statistician'), gameController.getGamesBySeason);

// Get games by Opponent Team
router.get('/opponent/:opponentTeam', authorize('Coach', 'Statistician'), gameController.getGamesByOpponent);

// Get game by status
router.get('/status/:status', authorize('Coach', 'Statistician'), gameController.getGamesByStatus);

// Get game by Result
router.get('/result/:result', authorize('Coach', 'Statistician'), gameController.getGamesByResult);

// Get Games by Venue 
router.get('/venue/:venue', gameController.getGamesByVenue);


// Get Games by Multiple Filters and Date Range - returns all games that match a combination of filters (e.g., opponent, venue, season, status, result) and occurred within a specified date range, sorted by date (newest first)
router.get('/search/date-range', authorize('Coach', 'Statistician'), gameController.getGamesByFiltersAndDateRange);

// Get Games by Multiple Filters and Score Range - returns all games that match a combination of filters (e.g., opponent, venue, season, status, result) and where the team's score and/or opponent's score falls within specified ranges, sorted by date (newest first)
router.get('/search/score-range', authorize('Coach', 'Statistician'), gameController.getGamesByFiltersAndScoreRange);

// Get Games by Multiple Filters, Date Range, and Score Range
router.get('/search/date-score-range', authorize('Coach', 'Statistician'), gameController.getGamesByFiltersDateRangeAndScoreRange);

// Update a game by ID
router.put('/:gameId',authorize('Coach', 'Statistician'),  gameController.updateGame);

// Delete a game by ID
router.delete('/:gameId',authorize('Coach', 'Statistician'), gameController.deleteGame);



// Export the router to be used in app.js
module.exports = router;