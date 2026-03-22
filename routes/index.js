const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const path = require('path');
const Player = require('../models/Player');
const GameStats = require('../models/GameStats');
const Game = require('../models/Game');
const Tournament = require('../models/Tournament');
const User = require('../models/User');

const { isAuthenticated, authorize } = require('../middleware/auth')


// Login page
router.get('/', (req, res) => {
  // Check if the user is already logged in
  if (req.session && req.session.user) {
    // If they are, redirect them to the dashboard and STOP the function
    return res.redirect('/dashboard'); 
  }
  // render static login page from public folder
  res.sendFile(path.join(__dirname, '../public/src/html/login.html'));
});

// Render Dashboard
router.get('/dashboard', isAuthenticated, async (req, res) => {
  try {
    const tournaments = await Tournament.find().sort({ startDate: -1 }).lean();
    res.render('pages/dashboard', { 
        title: 'Green Archers Analytics - Dashboard',
        user: req.session.user,
        tournaments
    });
  } catch (err) {
    res.render('pages/dashboard', { 
        title: 'Green Archers Analytics - Dashboard',
        user: req.session.user,
        tournaments: []
    });
  }
});

// Statistics Encoding page
router.get('/statistics-encoding', isAuthenticated, authorize('Coach', 'Statistician'), (req, res) => {
  res.render('pages/statistics-encoding', {
      title: 'Statistics Encoding',
      user: req.session.user
  });
});


// Players list page
router.get('/players', isAuthenticated, authorize('Coach', 'Statistician'), async (req, res) => {
  try {
    const players = await Player.find().sort({ jerseyNumber: 1 }).lean();
    const user = req.session.user;
    const isAdminOrCoach = user && (user.role === 'Admin' || user.role === 'Coach');
    res.render('pages/players', {
      title: 'Players',
      players,
      isAdminOrCoach,
      user
    });
  } catch (err) {
    res.status(500).send('Error loading players page');
  }
});

// Render statistics page
router.get('/gameStats', isAuthenticated, authorize('Coach', 'Statistician'), async (req, res) => {
  try {
    const game = await Game.find({ status: 'ENDED' }).sort('-gameDate').lean();
    if (!game) res.status(400);

    res.render('pages/statistics', {
      title: 'Team Statistics Summary',
      game
    });
  } catch (e) {
    res.status(500).send('Error loading statistics page');
  }
});

// Player profile page
router.get('/players/:id', isAuthenticated, authorize('Coach', 'Statistician'), async (req, res) => {
  try {
    const player = await Player.findById(req.params.id).lean();
    if (!player) return res.status(404).send('Player not found');

    // Get career aggregated stats for PPG, RPG, APG
    const stats = await GameStats.aggregate([
      { $match: { playerId: new mongoose.Types.ObjectId(req.params.id) } },
      {
        $group: {
          _id: '$playerId',
          gamesPlayed: { $sum: 1 },
          totalPoints: { $sum: '$totals.points' },
          totalRebounds: { $sum: { $add: ['$totals.offensiveRebounds', '$totals.defensiveRebounds'] } },
          totalAssists: { $sum: '$totals.assists' }
        }
      }
    ]);

    const s = stats[0] || { gamesPlayed: 0, totalPoints: 0, totalRebounds: 0, totalAssists: 0 };
    const gp = s.gamesPlayed || 1;

    res.render('pages/player-profile', {
      title: `${player.firstName} ${player.lastName}`,
      player,
      stats: {
        ppg: (s.totalPoints / gp).toFixed(1),
        rpg: (s.totalRebounds / gp).toFixed(1),
        apg: (s.totalAssists / gp).toFixed(1),
        gamesPlayed: s.gamesPlayed || 0
      },
      user: req.session.user
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading player profile');
  }
});

// Games list page
router.get('/games', isAuthenticated, authorize('Coach', 'Statistician'), async (req, res) => {
  try {
    const games = await Game.find()
      .populate('tournament', 'name league season', {lean: true})
      .sort({ gameDate: -1 })
      .lean();
    const tournaments = await Tournament.find().sort({ startDate: -1 }).lean();
    const user = req.session.user;
    const isAdminOrCoach = user && (user.role === 'Admin' || user.role === 'Coach');
    res.render('pages/games', {
      title: 'Games',
      games,
      tournaments,
      isAdminOrCoach,
      user
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error loading games page');
  }
});


// Render Reports and Analytics Page
router.get('/analytics', isAuthenticated, authorize('Coach'), async (req, res) => {
  res.render("pages/analytics", {
    title: 'Reports & Analytics'
  });
});


// Render users management page with users
router.get("/users", isAuthenticated, authorize('Admin'), async (req, res) => {
    const users = await User.find().lean();
    res.render("pages/users", {
        title: 'User Account Management',
        users
    });
});


// Render tournaments page with tournament view
router.get("/tournaments", isAuthenticated, authorize('Admin'), async (req, res) => {
  const tournaments = await Tournament.find().sort({ createdAt: -1 }).lean();

  res.render("pages/tournament", {
      title: 'Tournaments',
      tournaments
  });
});


// Render user profile
router.get('/user-profile', isAuthenticated, async (req, res) => {

    res.status(200).render('pages/user-profile', {
        title: `${req.session.user.username} profile`
    });
});

module.exports = router;