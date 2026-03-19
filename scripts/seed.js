require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const connectDB = require('../config/db');
const User = require('../models/User');
const Player = require('../models/Player');
const Game = require('../models/Game');
const GameStats = require('../models/GameStats');
const Tournament = require('../models/Tournament');
const GameEvents = require('../models/GameEvents');

const seed = async () => {
  await connectDB();

  // Clear existing data
  await Promise.all([
    User.deleteMany({}),
    Player.deleteMany({}),
    Game.deleteMany({}),
    GameStats.deleteMany({}),
    Tournament.deleteMany({}),
    GameEvents.deleteMany({})
  ]);

  console.log('Cleared existing data.');

  // Create Users
  const users = await User.create([
    { firstName: 'Admin', lastName: 'User', username: 'admin', email: 'admin@dlsu.edu.ph', password: 'admin123', role: 'Admin' },
    { firstName: 'Coach', lastName: 'Topex', username: 'coach', email: 'coach@dlsu.edu.ph', password: 'coach123', role: 'Coach' },
    { firstName: 'Stat', lastName: 'Keeper', username: 'stats', email: 'stats@dlsu.edu.ph', password: 'stats123', role: 'Statistician' }
  ]);
  console.log(`Created ${users.length} users.`);

  // Create Players (updated to match new Player schema)
  const players = await Player.create([
    { firstName: 'Kevin', lastName: 'Quiambao', jerseyNumber: 25, position: 'PF', heightCm: 196, weightKg: 91, yearLevel: 'Junior', course: 'BS Business Administration', status: 'Active' },
    { firstName: 'Schonny', lastName: 'Winston', jerseyNumber: 1, position: 'PG', heightCm: 178, weightKg: 77, yearLevel: 'Senior', course: 'AB Communication Arts', status: 'Active' },
    { firstName: 'Mike', lastName: 'Phillips', jerseyNumber: 13, position: 'C', heightCm: 206, weightKg: 104, yearLevel: 'Sophomore', course: 'BS Computer Science', status: 'Active' },
    { firstName: 'Mark', lastName: 'Nonoy', jerseyNumber: 7, position: 'SG', heightCm: 175, weightKg: 75, yearLevel: 'Senior', course: 'BS Marketing', status: 'Active' },
    { firstName: 'Evan', lastName: 'Nelle', jerseyNumber: 0, position: 'PG', heightCm: 180, weightKg: 79, yearLevel: 'Senior', course: 'AB Economics', status: 'Active' },
    { firstName: 'Deo', lastName: 'Cuajao', jerseyNumber: 2, position: 'SG', heightCm: 183, weightKg: 79, yearLevel: 'Junior', course: 'BS Management', status: 'Active' },
    { firstName: 'Joaqui', lastName: 'Manuel', jerseyNumber: 5, position: 'SF', heightCm: 188, weightKg: 84, yearLevel: 'Sophomore', course: 'BS Accountancy', status: 'Active' },
    { firstName: 'Michael', lastName: 'David', jerseyNumber: 11, position: 'PF', heightCm: 193, weightKg: 88, yearLevel: 'Junior', course: 'BS Finance', status: 'Active' },
    { firstName: 'Tommy', lastName: 'Baltazar', jerseyNumber: 33, position: 'C', heightCm: 208, weightKg: 109, yearLevel: 'Senior', course: 'AB Political Science', status: 'Injured' },
    { firstName: 'CJ', lastName: 'Austria', jerseyNumber: 9, position: 'PG', heightCm: 178, weightKg: 76, yearLevel: 'Rookie', course: 'BS Information Technology', status: 'Active' }
  ]);
  console.log(`Created ${players.length} players.`);

  // Create Tournaments
  const tournaments = await Tournament.create([
    { name: 'UAAP Season 87', league: 'UAAP', season: 'Season 87', description: 'UAAP Season 87 Men\'s Basketball', startDate: new Date('2025-09-01'), endDate: new Date('2025-12-15'), createdBy: users[0]._id },
    { name: 'Preseason Invitational 2025', league: 'Preseason', season: '2025', description: 'Pre-season tournament preparation', startDate: new Date('2025-07-15'), endDate: new Date('2025-08-20'), createdBy: users[0]._id },
    { name: 'FilOil EcoOil Preseason Cup', league: 'Preseason', season: '2025', description: 'FilOil Preseason Cup', startDate: new Date('2025-06-01'), endDate: new Date('2025-07-10'), createdBy: users[0]._id },
    { name: 'Tune-Up Series 2025', league: 'Tune-Up', season: '2025', description: 'Pre-UAAP tune-up games', startDate: new Date('2025-08-01'), endDate: new Date('2025-08-30'), createdBy: users[0]._id }
  ]);
  console.log(`Created ${tournaments.length} tournaments.`);


  // create opponent players
  const generateOpponentPlayers = () => ([
    { jerseyNumber: 4, fullName: "Juan Dela Cruz", position: "PG" },
    { jerseyNumber: 7, fullName: "Mark Santos", position: "SG" },
    { jerseyNumber: 12, fullName: "Leo Reyes", position: "SF" },
    { jerseyNumber: 15, fullName: "Paul Garcia", position: "PF" },
    { jerseyNumber: 22, fullName: "Chris Lim", position: "C" },
    { jerseyNumber: 30, fullName: "Kevin Tan", position: "SG" },
    { jerseyNumber: 9, fullName: "Andre Cruz", position: "PG" }
  ]);
  

  // Create Games (updated to match new Game schema with tournament ref, quarterScores, startTime)
  const games = await Game.create([
    {
      gameDate: new Date('2025-09-07'), opponent: 'Ateneo Blue Eagles', opponentPlayers: generateOpponentPlayers(), tournament: tournaments[0]._id, venue: 'MOA Arena', startTime: new Date('2025-09-07T14:00:00'),
      quarterScores: { q1: { team: 22, opponent: 18 }, q2: { team: 19, opponent: 20 }, q3: { team: 20, opponent: 15 }, q4: { team: 17, opponent: 18 }, overtimes: [] },
      teamScore: 78, opponentScore: 71, result: 'Win', status: 'ENDED', createdBy: users[0]._id
    },
    {
      gameDate: new Date('2025-09-14'), opponent: 'UP Fighting Maroons', opponentPlayers: generateOpponentPlayers(), tournament: tournaments[0]._id, venue: 'Smart Araneta Coliseum', startTime: new Date('2025-09-14T16:00:00'),
      quarterScores: { q1: { team: 24, opponent: 20 }, q2: { team: 18, opponent: 22 }, q3: { team: 22, opponent: 17 }, q4: { team: 21, opponent: 20 }, overtimes: [] },
      teamScore: 85, opponentScore: 79, result: 'Win', status: 'ENDED', createdBy: users[0]._id
    },
    {
      gameDate: new Date('2025-09-21'), opponent: 'UST Growling Tigers', opponentPlayers: generateOpponentPlayers(), tournament: tournaments[0]._id, venue: 'MOA Arena', startTime: new Date('2025-09-21T14:00:00'),
      quarterScores: { q1: { team: 15, opponent: 20 }, q2: { team: 18, opponent: 17 }, q3: { team: 16, opponent: 19 }, q4: { team: 19, opponent: 16 }, overtimes: [] },
      teamScore: 68, opponentScore: 72, result: 'Loss', status: 'ENDED', createdBy: users[0]._id
    },
    {
      gameDate: new Date('2025-09-28'), opponent: 'NU Bulldogs', opponentPlayers: generateOpponentPlayers(), tournament: tournaments[0]._id, venue: 'Philsports Arena', startTime: new Date('2025-09-28T16:00:00'),
      quarterScores: { q1: { team: 25, opponent: 18 }, q2: { team: 22, opponent: 21 }, q3: { team: 24, opponent: 20 }, q4: { team: 21, opponent: 21 }, overtimes: [] },
      teamScore: 92, opponentScore: 80, result: 'Win', status: 'ENDED', createdBy: users[0]._id
    },
    {
      gameDate: new Date('2025-10-05'), opponent: 'FEU Tamaraws', opponentPlayers: generateOpponentPlayers(), tournament: tournaments[0]._id, venue: 'MOA Arena', startTime: new Date('2025-10-05T14:00:00'),
      quarterScores: { q1: { team: 0, opponent: 0 }, q2: { team: 0, opponent: 0 }, q3: { team: 0, opponent: 0 }, q4: { team: 0, opponent: 0 }, overtimes: [] },
      teamScore: 0, opponentScore: 0, status: 'NOT_STARTED', createdBy: users[0]._id
    },
    {
      gameDate: new Date('2025-08-10'), opponent: 'Letran Knights', opponentPlayers: generateOpponentPlayers(), tournament: tournaments[1]._id, venue: 'Filoil EcoOil Centre', startTime: new Date('2025-08-10T15:00:00'),
      quarterScores: { q1: { team: 24, opponent: 19 }, q2: { team: 20, opponent: 18 }, q3: { team: 22, opponent: 20 }, q4: { team: 22, opponent: 18 }, overtimes: [] },
      teamScore: 88, opponentScore: 75, result: 'Win', status: 'ENDED', createdBy: users[0]._id
    }
  ]);
  console.log(`Created ${games.length} games.`);

  // Create GameStats with periodStats structure
  const completedGames = games.filter(g => g.status === 'ENDED');
  const activePlayers = players.filter(p => p.status === 'Active');
  const statsData = [];

  for (const game of completedGames) {
    for (const player of activePlayers.slice(0, 7)) {
      const generatePeriodStats = () => {
        const mins = Math.floor(Math.random() * 10) + 2;
        const fga = Math.floor(Math.random() * 6) + 1;
        const fgm = Math.floor(Math.random() * (fga + 1));
        const tpa = Math.floor(Math.random() * 3);
        const tpm = Math.floor(Math.random() * (tpa + 1));
        const fta = Math.floor(Math.random() * 3);
        const ftm = Math.floor(Math.random() * (fta + 1));
        const pts = (fgm - tpm) * 2 + tpm * 3 + ftm;

        return {
          minutesPlayed: mins,
          points: Math.max(pts, 0),
          fieldGoalsMade: fgm,
          fieldGoalsAttempted: fga,
          threePointersMade: tpm,
          threePointersAttempted: tpa,
          freeThrowsMade: ftm,
          freeThrowsAttempted: fta,
          offensiveRebounds: Math.floor(Math.random() * 2),
          defensiveRebounds: Math.floor(Math.random() * 3),
          assists: Math.floor(Math.random() * 3),
          steals: Math.floor(Math.random() * 2),
          blocks: Math.floor(Math.random() * 2),
          turnovers: Math.floor(Math.random() * 2),
          fouls: Math.floor(Math.random() * 2),
          plusMinus: Math.floor(Math.random() * 16) - 8
        };
      };

      const q1 = generatePeriodStats();
      const q2 = generatePeriodStats();
      const q3 = generatePeriodStats();
      const q4 = generatePeriodStats();

      // Compute totals
      const allPeriods = [q1, q2, q3, q4];
      const totals = {};
      allPeriods.forEach(p => {
        for (const key in p) {
          totals[key] = (totals[key] || 0) + p[key];
        }
      });

      statsData.push({
        gameId: game._id,
        playerId: player._id,
        periodStats: { q1, q2, q3, q4, overtimes: [] },
        totals
      });
    }
  }

  await GameStats.create(statsData);
  console.log(`Created ${statsData.length} stat entries.`);

  // Create GameEvents for completed games
  const eventTypes = ['shot_made', 'shot_missed', 'free_throw', 'offensive rebound', 'defensive rebound', 'assist', 'steal', 'block', 'turnover', 'foul', 'substitution'];
  const shotTypes = ['2PT', '3PT'];
  const eventsData = [];
  for (const game of completedGames) {
    const gamePlayers = activePlayers.slice(0, 7);
    for (let period = 1; period <= 4; period++) {
      const numEvents = Math.floor(Math.random() * 10) + 8; // 8-17 events per quarter
      for (let e = 0; e < numEvents; e++) {
        const player = gamePlayers[Math.floor(Math.random() * gamePlayers.length)];
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        const mins = Math.floor(Math.random() * 10);
        const secs = Math.floor(Math.random() * 60);
        const gameClock = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        const event = {
          gameId: game._id,
          playerId: player._id,
          period,
          gameClock,
          eventType
        };
        if (eventType === 'shot_made' || eventType === 'shot_missed') {
          const st = shotTypes[Math.floor(Math.random() * shotTypes.length)];
          event.shotType = st;
          event.points = eventType === 'shot_made' ? (st === '3PT' ? 3 : 2) : 0;
          // 30% chance of assist on made shots
          if (eventType === 'shot_made' && Math.random() < 0.3) {
            const otherPlayers = gamePlayers.filter(p => p._id !== player._id);
            event.assistPlayerId = otherPlayers[Math.floor(Math.random() * otherPlayers.length)]._id;
          }
        } else if (eventType === 'free_throw') {
          event.shotType = 'FT';
          event.points = Math.random() < 0.75 ? 1 : 0; // 75% FT rate
        }
        eventsData.push(event);
      }
    }
  }
  await GameEvents.create(eventsData);
  console.log(`Created ${eventsData.length} game events.`);

  console.log('\n✅ Seed complete!');
  console.log('\nLogin credentials:');
  console.log('  Admin:        admin / admin123');
  console.log('  Coach:        coach / coach123');
  console.log('  Statistician: stats / stats123');

  process.exit(0);
};

seed().catch(err => { console.error(err); process.exit(1); });
