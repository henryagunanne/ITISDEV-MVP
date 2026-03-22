const express = require('express');
const router = express.Router();
const Tournament = require('../models/Tournament');
const Game = require('../models/Game');

const { isAuthenticated, authorize } = require('../middleware/auth');

router.use(isAuthenticated);

// Admin Dashboard route
router.get('/dashboard', (req, res) => {
    res.render('pages/admin-dashboard', { 
        title: 'Green Archers Analytics - Dashboard',
        user: req.session.user
    });
});

router.get("/statistics", (req, res) => {
    res.render("pages/statistics-encoding", {
        title: "Statistics Encoding",
        user: req.session.user
    });
});

// render live game creation page
router.get('/start-game', async (req, res) => {
    const tournaments = await Tournament.find().sort({ createdAt: -1 }).lean();

    res.render("pages/setup", {
        title: "Create Game",
        tournaments: tournaments,
        activePath: "/gameStats"
    });
});

// render live game stat input page
router.get('/encode-stats',  async (req, res) => {
    const gameId = req.query.gameId;
    const game = await Game.findById(gameId).lean();
    if (!game){
        return;
    }

    gameClock = game.gameClock;
    res.render("pages/stats", {
        title: "Live Stat Encoding",
        gameClock,
        activePath: "/gameStats"
    });
});


module.exports = router;
