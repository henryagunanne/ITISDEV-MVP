const express = require('express');
const router = express.Router();
const tournamentController = require('../controllers/tournamentController');

const { isAuthenticated, authorize } = require('../middleware/auth');

router.use(isAuthenticated);


// Create a new tournament
router.post('/create', tournamentController.createTournament);

// Get all tournaments
router.get('/all', tournamentController.getAllTournaments);

// Get a tournament by ID
router.get('/:id', tournamentController.getTournamentById);

// Update a tournament (Admin only)
router.put('/:id/update', authorize('Admin'), tournamentController.updateTournament);

// Delete a tournament (Admin only)
router.delete('/:id/delete', authorize('Admin'), tournamentController.deleteTournament);


// Export the router to be used in app.js
module.exports = router;