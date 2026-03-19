const express = require('express');
const router = express.Router();
const Player = require('../models/Player');
const GameStats = require('../models/GameStats');
const mongoose = require('mongoose');
const Game = require('../models/Game');
const Tournament = require('../models/Tournament');
const { isAuthenticated } = require('../middleware/auth');

// Dashboard
router.get('/', isAuthenticated, (req, res) => {
  res.render('pages/dashboard', { 
      title: 'Green Archers Analytics - Dashboard',
      user: req.session.user
  });
});

// Statistics Encoding page
router.get('/statistics-encoding', isAuthenticated, (req, res) => {
  res.render('pages/statistics-encoding', {
      title: 'Statistics Encoding',
      user: req.session.user
  });
});

// Players list page
router.get('/players', isAuthenticated, async (req, res) => {
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

// Player profile page
router.get('/players/:id', isAuthenticated, async (req, res) => {
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

    res.render('pages/player_profile', {
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
router.get('/games', isAuthenticated, async (req, res) => {
  try {
    const games = await Game.find()
      .populate('tournament', 'name league season')
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

module.exports = router;