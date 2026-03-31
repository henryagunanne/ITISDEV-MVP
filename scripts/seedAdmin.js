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

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

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

  // Create Players
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

  // Helper to generate opponentPlayers (reusable)
  const generateOpponentPlayers = () => ([
    { jerseyNumber: 4, fullName: "Juan Dela Cruz", position: "PG" },
    { jerseyNumber: 7, fullName: "Mark Santos", position: "SG" },
    { jerseyNumber: 12, fullName: "Leo Reyes", position: "SF" },
    { jerseyNumber: 15, fullName: "Paul Garcia", position: "PF" },
    { jerseyNumber: 22, fullName: "Chris Lim", position: "C" },
    { jerseyNumber: 30, fullName: "Kevin Tan", position: "SG" },
    { jerseyNumber: 9, fullName: "Andre Cruz", position: "PG" }
  ]);

  // Create Games
  const games = await Game.create([
    {
      gameDate: new Date('2025-09-07'),
      opponent: 'Ateneo Blue Eagles',
      tournament: tournaments[0]._id,
      venue: 'MOA Arena',
      startTime: new Date('2025-09-07T14:00:00'),
      opponentPlayers: generateOpponentPlayers().slice(0, 7),
      quarterScores: { q1: { team: 22, opponent: 18 }, q2: { team: 19, opponent: 20 }, q3: { team: 20, opponent: 15 }, q4: { team: 17, opponent: 18 }, overtimes: [] },
      teamScore: 78,
      opponentScore: 71,
      result: 'Win',
      status: 'ENDED',
      createdBy: users[0]._id
    },
    {
      gameDate: new Date('2025-09-14'),
      opponent: 'UP Fighting Maroons',
      tournament: tournaments[0]._id,
      venue: 'Smart Araneta Coliseum',
      startTime: new Date('2025-09-14T16:00:00'),
      opponentPlayers: generateOpponentPlayers().slice(0, 5),
      quarterScores: { q1: { team: 24, opponent: 20 }, q2: { team: 18, opponent: 22 }, q3: { team: 22, opponent: 17 }, q4: { team: 21, opponent: 20 }, overtimes: [] },
      teamScore: 85,
      opponentScore: 79,
      result: 'Win',
      status: 'ENDED',
      createdBy: users[0]._id
    },
    {
      gameDate: new Date('2025-09-21'),
      opponent: 'UST Growling Tigers',
      tournament: tournaments[0]._id,
      venue: 'MOA Arena',
      startTime: new Date('2025-09-21T14:00:00'),
      opponentPlayers: generateOpponentPlayers().slice(0, 6),
      quarterScores: { q1: { team: 15, opponent: 20 }, q2: { team: 18, opponent: 17 }, q3: { team: 16, opponent: 19 }, q4: { team: 19, opponent: 16 }, overtimes: [] },
      teamScore: 68,
      opponentScore: 72,
      result: 'Loss',
      status: 'ENDED',
      createdBy: users[0]._id
    },
    {
      gameDate: new Date('2025-09-28'),
      opponent: 'NU Bulldogs',
      tournament: tournaments[0]._id,
      venue: 'Philsports Arena',
      startTime: new Date('2025-09-28T16:00:00'),
      opponentPlayers: generateOpponentPlayers().slice(0, 6),
      quarterScores: { q1: { team: 25, opponent: 18 }, q2: { team: 22, opponent: 21 }, q3: { team: 24, opponent: 20 }, q4: { team: 21, opponent: 21 }, overtimes: [] },
      teamScore: 92,
      opponentScore: 80,
      result: 'Win',
      status: 'ENDED',
      createdBy: users[0]._id
    },
    {
      gameDate: new Date('2025-10-05'),
      opponent: 'FEU Tamaraws',
      tournament: tournaments[0]._id,
      venue: 'MOA Arena',
      startTime: new Date('2025-10-05T14:00:00'),
      opponentPlayers: generateOpponentPlayers().slice(0, 5),
      quarterScores: { q1: { team: 0, opponent: 0 }, q2: { team: 0, opponent: 0 }, q3: { team: 0, opponent: 0 }, q4: { team: 0, opponent: 0 }, overtimes: [] },
      teamScore: 0,
      opponentScore: 0,
      status: 'NOT_STARTED',
      createdBy: users[0]._id
    },
    {
      gameDate: new Date('2025-08-10'),
      opponent: 'Letran Knights',
      tournament: tournaments[1]._id,
      venue: 'Filoil EcoOil Centre',
      startTime: new Date('2025-08-10T15:00:00'),
      opponentPlayers: generateOpponentPlayers().slice(0, 7),
      quarterScores: { q1: { team: 24, opponent: 19 }, q2: { team: 20, opponent: 18 }, q3: { team: 22, opponent: 20 }, q4: { team: 22, opponent: 18 }, overtimes: [] },
      teamScore: 88,
      opponentScore: 75,
      result: 'Win',
      status: 'ENDED',
      createdBy: users[0]._id
    }
  ]);
  console.log(`Created ${games.length} games.`);

  // Build GameStats entries for completed games
  const completedGames = games.filter(g => g.status === 'ENDED');
  const activePlayers = players.filter(p => p.status === 'Active');

  const statsData = [];
  for (const game of completedGames) {
    // lasalle players (first 7 active)
    const lasallePlayers = activePlayers.slice(0, 7);
    for (const player of lasallePlayers) {
      const makePeriod = (onCourt = true) => ({
        minutesPlayed: randInt(2, 12),
        isOnCourt: onCourt,
        points: randInt(0, 8),
        fieldGoalsMade: randInt(0, 4),
        fieldGoalsAttempted: randInt(0, 6),
        threePointersMade: randInt(0, 2),
        threePointersAttempted: randInt(0, 3),
        freeThrowsMade: randInt(0, 2),
        freeThrowsAttempted: randInt(0, 2),
        offensiveRebounds: randInt(0, 2),
        defensiveRebounds: randInt(0, 3),
        assists: randInt(0, 4),
        steals: randInt(0, 2),
        blocks: randInt(0, 2),
        turnovers: randInt(0, 2),
        fouls: randInt(0, 2),
        plusMinus: randInt(-8, 8)
      });

      const q1 = makePeriod();
      const q2 = makePeriod();
      const q3 = makePeriod();
      const q4 = makePeriod();
      const overtimePeriods = [];

      // compute totals by summing periods (GameStats pre-save will also recompute)
      const sumTotals = (periods) => {
        const keys = ['minutesPlayed','points','fieldGoalsMade','fieldGoalsAttempted','threePointersMade','threePointersAttempted','freeThrowsMade','freeThrowsAttempted','offensiveRebounds','defensiveRebounds','assists','steals','blocks','turnovers','fouls','plusMinus'];
        const totals = {};
        keys.forEach(k => totals[k] = 0);
        periods.forEach(p => {
          keys.forEach(k => totals[k] += (p && p[k]) ? p[k] : 0);
        });
        return totals;
      };
      const totals = sumTotals([q1,q2,q3,q4, ...overtimePeriods]);

      statsData.push({
        gameId: game._id,
        playerId: player._id,
        team: 'lasalle',
        periodStats: { q1, q2, q3, q4, overtimes: overtimePeriods },
        totals
      });
    }

    // opponent players stats using opponentPlayerIndex
    if ((game.opponentPlayers || []).length > 0) {
      game.opponentPlayers.forEach((op, idx) => {
        const q1 = { minutesPlayed: randInt(1,8), isOnCourt: true, points: randInt(0,8) };
        const q2 = { minutesPlayed: randInt(1,8), isOnCourt: true, points: randInt(0,8) };
        const q3 = { minutesPlayed: randInt(1,8), isOnCourt: true, points: randInt(0,8) };
        const q4 = { minutesPlayed: randInt(1,8), isOnCourt: true, points: randInt(0,8) };
        const totals = {
          minutesPlayed: q1.minutesPlayed + q2.minutesPlayed + q3.minutesPlayed + q4.minutesPlayed,
          points: q1.points + q2.points + q3.points + q4.points,
          fieldGoalsMade: 0, fieldGoalsAttempted: 0, threePointersMade: 0, threePointersAttempted: 0,
          freeThrowsMade: 0, freeThrowsAttempted: 0, offensiveRebounds: 0, defensiveRebounds: 0,
          assists: 0, steals: 0, blocks: 0, turnovers: 0, fouls: 0, plusMinus: 0
        };
        statsData.push({
          gameId: game._id,
          opponentPlayerIndex: idx,
          team: 'opponent',
          periodStats: { q1, q2, q3, q4, overtimes: [] },
          totals
        });
      });
    }
  }

  await GameStats.create(statsData);
  console.log(`Created ${statsData.length} stat entries.`);

  // Create GameEvents for completed games
  const eventTypes = [
    "shot made","shot missed","free throw made","free throw missed",
    "offensive rebound","defensive rebound","assist","steal","block","turnover","foul","sub_in", "sub_out"
  ];
  const shotTypes = ["2PT","3PT","FT",""];
  const eventsData = [];

  for (const game of completedGames) {
    const gamePlayers = activePlayers.slice(0,7);
    const opponentPlayers = game.opponentPlayers || [];

    for (let period = 1; period <= 4; period++) {
      const numEvents = randInt(8, 17);
      for (let i = 0; i < numEvents; i++) {
        const team = Math.random() < 0.75 ? 'lasalle' : 'opponent';
        const player = team === 'lasalle' ? gamePlayers[Math.floor(Math.random() * gamePlayers.length)] : null;
        const opp = team === 'opponent' && opponentPlayers.length ? opponentPlayers[Math.floor(Math.random() * opponentPlayers.length)] : null;
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        const mins = randInt(0, 9);
        const secs = randInt(0, 59);
        const gameClock = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        const ev = {
          gameId: game._id,
          team,
          period,
          gameClock,
          eventType
        };

        if (team === 'lasalle' && player) {
          ev.playerId = player._id;
        } else if (opp) {
          ev.opponentPlayer = { jerseyNumber: opp.jerseyNumber || 0, fullName: opp.fullName || 'Opponent' };
        }

        if (eventType === 'shot made' || eventType === 'shot missed') {
          const st = shotTypes[Math.floor(Math.random() * 2)];
          ev.shotType = st;
          ev.points = eventType === 'shot made' ? (st === '3PT' ? 3 : 2) : 0;
          if (eventType === 'shot made' && team === 'lasalle' && Math.random() < 0.3) {
            const other = gamePlayers.filter(p => p._id.toString() !== (player?._id.toString()));
            if (other.length) ev.assistPlayerId = other[Math.floor(Math.random() * other.length)]._id;
          }
        } else if (eventType === 'free throw made' || eventType === 'free throw missed') {
          ev.shotType = 'FT';
          ev.points = eventType === 'free throw made' ? 1 : 0;
        } else {
          ev.shotType = '';
          ev.points = 0;
        }

        eventsData.push(ev);
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


