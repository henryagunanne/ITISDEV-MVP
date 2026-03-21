const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');

const { isAuthenticated, authorize } = require('../middleware/auth');

router.use(isAuthenticated);

// ── Dashboard ────────────────────────────────────────────────
// GET /api/analytics/dashboard
// Returns all top cards, charts, and leaderboards data
router.get('/dashboard', analyticsController.getDashboardData);

// GET /api/analytics/summary - Returns the computed report summary
router.get("/summary", analyticsController.reportSummary);


// GET /api/analytics/players - Returns the computed player report summary for the reports page
router.get('/players', analyticsController.reportPlayerSummary);


// Returns Game summaries
router.get('/game-summary/:id', analyticsController.getGameSummaries);

// Export CSV reports
router.get('/export/csv', analyticsController.exportCSV);

// Export PDF reports
router.get('/export/pdf', analyticsController.exportPDF);

// ── Box Score ──────────────────────────────────────────────
// GET /api/analytics/boxscore/:gameId
// Returns full box score for a single game (all player stats)
router.get('/boxscore/:gameId', analyticsController.getGameBoxScore);

// ── Player analytics ───────────────────────────────────────
// GET /api/analytics/player/:playerId
// Returns career aggregated stats for a player (totals + averages)
router.get('/player/:playerId', analyticsController.getAggregatedStatsByPlayerId);

// GET /api/analytics/player/:playerId/season/:season
// Returns aggregated stats for a player filtered to a specific season
router.get('/player/:playerId/season/:season', analyticsController.getAggregatedStatsByPlayerIdAndSeason);

// GET /api/analytics/player/:playerId/tournament/:tournamentId
// Returns aggregated stats for a player filtered to a specific tournament
router.get('/player/:playerId/tournament/:tournamentId', analyticsController.getAggregatedStatsByPlayerIdAndTournament);

// GET /api/analytics/player/:playerId/performance/season/:season
// Returns per-game performance breakdown for a player across a season
// Used to power the scoring trend / per-game line chart
router.get('/player/:playerId/performance/season/:season', analyticsController.getPlayerPerformanceBySeason);

// GET /api/analytics/player/:playerId/performance/tournament/:tournamentId
// Returns per-game performance breakdown for a player in a tournament
router.get('/player/:playerId/performance/tournament/:tournamentId', analyticsController.getPlayerPerformanceByTournament);

// GET /api/analytics/player/:playerId/per/season/:season
// Returns simplified PER (Player Efficiency Rating) for a player in a season
router.get('/player/:playerId/per/season/:season', analyticsController.getPlayerPERBySeason);

// GET /api/analytics/player/:playerId/per/game/:gameId
// Returns PER for a single player in a specific game
router.get('/player/:playerId/per/game/:gameId', analyticsController.getPlayerPERByGameId);

// GET /api/analytics/player/:playerId/quarter/:quarter/game/:gameId
// Returns per-quarter stats for a player in a specific game
// quarter param: q1 | q2 | q3 | q4
router.get('/player/:playerId/quarter/:quarter/game/:gameId', analyticsController.getPlayerPerformanceByQuarter);

// GET /api/analytics/player/:playerId/half/:half/game/:gameId
// Returns per-half stats for a player in a specific game
// half param: first | second
router.get('/player/:playerId/half/:half/game/:gameId', analyticsController.getPlayerPerformanceByHalf);

// ── Game analytics ─────────────────────────────────────────
// GET /api/analytics/game/:gameId
// Returns aggregated team totals for a specific game
router.get('/game/:gameId', analyticsController.getAggregatedStatsByGameId);

// GET /api/analytics/game/:gameId/quarter/:quarter
// Returns stats for ALL players in a game broken down by a specific quarter
// quarter param: q1 | q2 | q3 | q4
router.get('/game/:gameId/quarter/:quarter', analyticsController.getPerformanceByQuarterForAllPlayers);

// GET /api/analytics/game/:gameId/half/:half
// Returns stats for ALL players in a game broken down by a specific half
// half param: first | second
router.get('/game/:gameId/half/:half', analyticsController.getPerformanceByHalfForAllPlayers);

// ── Season analytics ───────────────────────────────────────
// GET /api/analytics/season/:season
// Returns aggregated team stats across all games in a season
router.get('/season/:season', analyticsController.getAggregatedStatsBySeason);

// ── Leaderboards ───────────────────────────────────────────
// GET /api/analytics/leaders/scorers/:season/{:limit}
// Returns top scorers for a season, sorted by PPG. limit defaults to 10.
//router.get('/leaders/scorers/:season/:limit?', analyticsController.getTopScorersBySeason);

// GET /api/analytics/leaders/rebounders/:season/{:limit}
// Returns top rebounders for a season, sorted by RPG. limit defaults to 10.
// router.get('/leaders/rebounders/:season/:limit?', analyticsController.getTopReboundersBySeason);

// GET /api/analytics/leaders/assists/:season/{:limit}
// Returns top assist leaders for a season, sorted by APG. limit defaults to 10.
// router.get('/leaders/assists/:season/:limit?', analyticsController.getTopAssistLeadersBySeason);

module.exports = router;
