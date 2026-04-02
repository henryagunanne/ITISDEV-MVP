const Game = require("../models/Game");
const Tournament = require('../models/Tournament');
const GameEvent = require('../models/GameEvents');
const GameStats = require('../models/GameStats');
// const Player = require('../models/Player');

// const OpenAI = require("openai");
// const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper: get period key from period number 
function periodKey(period) {
    if (period <= 4) return `q${period}`;
    return null; // overtime handled separately
}

// Helper: update GameStats for an event
async function updateStatsForEvent(event, reverse = false) {
    const d = reverse ? -1 : 1;
    const query = { gameId: event.gameId };

    if (event.team === 'lasalle') {
        query.playerId = event.playerId;
        query.team = 'lasalle';
    } else {
        query.opponentPlayerIndex = event.opponentPlayer?.jerseyNumber;
        query.team = 'opponent';
    }

    let stats = await GameStats.findOne(query);
    if (!stats) {
        stats = new GameStats(query);
    }

    // Determine which period to update
    const pk = periodKey(event.period);
    let periodObj;
    if (pk) {
        periodObj = stats.periodStats[pk];
    } else {
        const otIndex = event.period - 5;
        while (stats.periodStats.overtimes.length <= otIndex) {
            stats.periodStats.overtimes.push({});
        }
        periodObj = stats.periodStats.overtimes[otIndex];
    }

    // Apply stat changes based on event type
    switch (event.eventType) {
        case 'shot made':
            if (event.shotType === '2PT') {
                periodObj.fieldGoalsMade += d;
                periodObj.fieldGoalsAttempted += d;
                periodObj.points += 2 * d;
            } else if (event.shotType === '3PT') {
                periodObj.threePointersMade += d;
                periodObj.threePointersAttempted += d;
                periodObj.points += 3 * d;
            }
            break;
        case 'shot missed':
            if (event.shotType === '2PT') periodObj.fieldGoalsAttempted += d;
            else if (event.shotType === '3PT') periodObj.threePointersAttempted += d;
            break;
        case 'free throw made':
            periodObj.freeThrowsMade += d;
            periodObj.freeThrowsAttempted += d;
            periodObj.points += d;
            break;
        case 'free throw missed':
            periodObj.freeThrowsAttempted += d;
            break;
        case 'offensive rebound': periodObj.offensiveRebounds += d; break;
        case 'defensive rebound': periodObj.defensiveRebounds += d; break;
        case 'assist': periodObj.assists += d; break;
        case 'steal': periodObj.steals += d; break;
        case 'block': periodObj.blocks += d; break;
        case 'turnover': periodObj.turnovers += d; break;
        case 'foul': periodObj.fouls += d; break;
        case 'sub_in':
            if (reverse) {
                stats.isOnCourt = false;
                stats.lastSubInTime = null;
                // If reversing a sub_in, we'd theoretically need to subtract the time they played 
                // until they subbed out again. For simplicity, complex undo logic for minutes 
                // is often handled via a separate dedicated recalculation function.
            } else {
                stats.isOnCourt = true;
                stats.lastSubInTime = event.gameTimeSeconds;
            }
            break;

        case 'sub_out':
            if (reverse) {
                stats.isOnCourt = true;
                stats.lastSubInTime = event.gameTimeSeconds;
            } else {
                if (stats.isOnCourt && stats.lastSubInTime !== null) {
                    // Calculate seconds played
                    const secondsPlayed = event.gameTimeSeconds - stats.lastSubInTime;
                    
                    // Convert to fractional minutes (e.g., 90 seconds = 1.5 minutes)
                    const minutesPlayed = secondsPlayed / 60;
                    
                    periodObj.minutesPlayed += minutesPlayed;
                }
                stats.isOnCourt = false;
                stats.lastSubInTime = null;
            }
            break;
    }

    stats.markModified('periodStats');
    await stats.save();

    // Update quarter scores on Game
    if (event.points && event.points !== 0) {
        const game = await Game.findById(event.gameId);
        if (game) {
            const scoreField = event.team === 'lasalle' ? 'team' : 'opponent';
            if (pk) {
                game.quarterScores[pk][scoreField] += event.points * d;
            } else {
                const otIdx = event.period - 5;
                while (game.quarterScores.overtimes.length <= otIdx) {
                    game.quarterScores.overtimes.push({ team: 0, opponent: 0 });
                }
                game.quarterScores.overtimes[otIdx][scoreField] += event.points * d;
            }
            game.calculateFinalScore();
            game.markModified('quarterScores');
            await game.save();
        }
    }

    return stats;
}


// Helper: Flush and credit minutes for players currently on the court at the end of a period
async function flushOnCourtMinutes(gameId, periodToCredit, currentTimeSeconds, isGameEnding = false) {
    const stats = await GameStats.find({ gameId, isOnCourt: true });
    
    for (let stat of stats) {
        if (stat.lastSubInTime !== null) {
            const secondsPlayed = currentTimeSeconds - stat.lastSubInTime;
            
            if (secondsPlayed > 0) {
                const pk = periodKey(periodToCredit);
                let periodObj;
                if (pk) {
                    periodObj = stat.periodStats[pk];
                } else {
                    const otIndex = periodToCredit - 5;
                    while (stat.periodStats.overtimes.length <= otIndex) {
                        stat.periodStats.overtimes.push({});
                    }
                    periodObj = stat.periodStats.overtimes[otIndex];
                }
                
                // Add the fraction of minutes played to this specific period
                periodObj.minutesPlayed = (periodObj.minutesPlayed || 0) + (secondsPlayed / 60);
            }
        }
        
        if (isGameEnding) {
            // Game is over, take everyone off the court
            stat.isOnCourt = false;
            stat.lastSubInTime = null;
        } else {
            // Moving to the next period. 
            // Reset their "sub in" time to the exact start of the new period so they keep accumulating.
            stat.lastSubInTime = currentTimeSeconds;
        }
        
        stat.markModified('periodStats');
        await stat.save();
    }
}



// Helper function to convert time to seconds
function clockToSeconds(clock) {
    const [min, sec] = clock.split(':').map(Number);
    return (min * 60) + sec;
}

// Helper function to compute the elapsed game time in seconds
function computeGameTimeSeconds(period, gameClock) {
    const regularPeriods = 4;
    const quarterLength = 600;
    const overtimeLength = 300;

    const clockSeconds = clockToSeconds(gameClock);

    let elapsed = 0;

    if (period <= regularPeriods) {
        elapsed += (period - 1) * quarterLength;
        elapsed += (quarterLength - clockSeconds);
    } else {
        elapsed += regularPeriods * quarterLength;
        elapsed += (period - regularPeriods - 1) * overtimeLength;
        elapsed += (overtimeLength - clockSeconds);
    }

    return elapsed;
}


// Create a new game
exports.createGame = async (req, res) => {
    try { 
        const { opponent, opponentPlayers, tournament, players, venue, gameDate, startTime, status, teamScore, opponentScore, currentPeriod, gameClock, quarterScores } = req.body;
        if (!opponent) return res.status(400).json({ message: 'Opponent name required' });

        // For live game tracking (requires opponent players)
        if (opponentPlayers && opponentPlayers.length > 0) {
            if (opponentPlayers.length < 5) {
                return res.status(400).json({ message: 'Minimum 5 opponent players required' });
            }
            // Validate unique jersey numbers
            const jerseys = opponentPlayers.map(p => p.jerseyNumber);
            if (new Set(jerseys).size !== jerseys.length) {
                return res.status(400).json({ message: 'Opponent jersey numbers must be unique' });
            }
        }

        const game = new Game({
            opponent,
            opponentPlayers: opponentPlayers || [],
            tournament,
            venue: venue || 'TBD',
            gameDate: gameDate || new Date(),
            startTime: startTime || new Date(),
            teamScore: teamScore || 0,
            opponentScore: opponentScore || 0,
            status: status || 'NOT_STARTED',
            currentPeriod: currentPeriod || 1,
            gameClock: gameClock || '10:00',
            quarterScores: quarterScores || {
                q1: { team: 0, opponent: 0 },
                q2: { team: 0, opponent: 0 },
                q3: { team: 0, opponent: 0 },
                q4: { team: 0, opponent: 0 },
                overtimes: []
            }
        });

        // Calculate result if scores provided
        if (teamScore !== undefined && opponentScore !== undefined) {
            if (teamScore > opponentScore) {
                game.result = "Win";
            } else if (teamScore < opponentScore) {
                game.result = "Loss";
            }
        }

        await game.save();

        // Only create GameStats for live game tracking
        if (opponentPlayers && opponentPlayers.length > 0 && players && players.length > 0) {
            // Create GameStats entries for all home players
            for (const playerId of players) {
                const gs = new GameStats({ 
                    gameId: game._id, 
                    playerId: playerId, 
                    team: 'lasalle' 
                });
                await gs.save();
                game.players.push(gs._id);
            }
            // Create GameStats entries for opponent players
            for (const op of opponentPlayers) {
                const gs = new GameStats({
                    gameId: game._id,
                    opponentPlayerIndex: op.jerseyNumber,
                    team: 'opponent'
                });
                await gs.save();
            }
            await game.save();
        }

        res.status(201).json({ 
            success: true, 
            message: 'Game created successfully',
            data: game 
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error creating game.",
            error: error.message
        });
    }
};



// Get all games (optionally filter by tournament)
exports.getGames = async (req, res) => {
    try {
        const filter = {};
        if (req.query.tournament) {
            filter.tournament = req.query.tournament;
        }
        const games = await Game.find(filter)
            .populate('createdBy', 'username email')
            .populate('tournament').sort({ gameDate: -1 }).lean();
            
        res.status(200).json({
            success: true,
            count: games.length,
            data: games
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching games.",
            error: error.message
        });
    }
};

// Get Game by ID - returns detailed information about a specific game, including tournament details
exports.getGameById = async (req, res) => {
    try {
        const gameId = req.params.gameId; // Get game ID from URL parameters
        const game = await Game.findById(gameId).lean();

        if (!game) {
            return res.status(404).json({
                success: false,
                message: "Game not found."
            });
        }

        res.status(200).json({game});
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching game.",
            error: error.message
        });
    }
};


// Fetch the specific roster for a game and sort by isOnCourt
exports.getGameRoster = async (req, res) => {
    try {
        const gameId = req.params.gameId;
        const game = await Game.findById(gameId).lean();
        
        if (!game) {
            return res.status(404).json({ error: "Game not found" });
        }

        // Fetch all stats associated with this specific game
        const stats = await GameStats.find({ gameId })
            .populate('playerId') // Populates La Salle players from Player model
            .lean();

        // 1. Format Home Team (La Salle)
        let homePlayers = stats
            .filter(s => s.team === 'lasalle' && s.playerId)
            .map(s => ({
                playerId: s.playerId._id,
                jerseyNumber: s.playerId.jerseyNumber,
                // Adjust firstName/lastName below if your Player schema uses a different field for name
                firstName: s.playerId.firstName,
                lastName: s.playerId.lastName,
                position: s.playerId.position,
                profilePhoto: s.playerId.profilePhoto,
                isOnCourt: s.isOnCourt || false
            }));

        // 2. Format Away Team (Opponent)
        let awayPlayers = stats
            .filter(s => s.team === 'opponent')
            .map(s => {
                // Find opponent details embedded in the Game document
                const oppInfo = game.opponentPlayers.find(p => p.jerseyNumber === s.opponentPlayerIndex);
                return {
                    jerseyNumber: s.opponentPlayerIndex,
                    fullName: oppInfo ? oppInfo.fullName : `Player ${s.opponentPlayerIndex}`,
                    position: oppInfo ? oppInfo.position : null,
                    isOnCourt: s.isOnCourt || false
                };
            });

        // 3. Sort arrays: Players currently on the court go to the top
        homePlayers.sort((a, b) => (b.isOnCourt === true) - (a.isOnCourt === true));
        awayPlayers.sort((a, b) => (b.isOnCourt === true) - (a.isOnCourt === true));

        res.json({ homePlayers, awayPlayers });

    } catch (err) {
        console.error("Error fetching game roster:", err);
        res.status(500).json({ error: err.message });
    }
};


// update a game status/period
exports.updateGameStatus = async (req, res) => {
    try {
        const game = await Game.findById(req.params.gameId);
        if (!game) return res.status(404).json({ error: 'Game not found' });

        const oldPeriod = game.currentPeriod;
        const oldStatus = game.status;

        // Apply incoming updates
        if (req.body.status) game.status = req.body.status;
        if (req.body.currentPeriod) game.currentPeriod = req.body.currentPeriod;
        if (req.body.gameClock) game.gameClock = req.body.gameClock;

        // CHECK FOR PERIOD END OR GAME END
        const isPeriodChanging = req.body.currentPeriod && req.body.currentPeriod > oldPeriod;
        const isGameEnding = req.body.status === 'ENDED' && oldStatus !== 'ENDED';

        if (isPeriodChanging || isGameEnding) {
            // Calculate elapsed time precisely at the 00:00 mark of the ending period
            const endTimeSeconds = computeGameTimeSeconds(oldPeriod, "00:00"); 
            await flushOnCourtMinutes(game._id, oldPeriod, endTimeSeconds, isGameEnding);
        }

        // CHECK FOR GAME START (Initialize Starters)
        if (req.body.status === 'PLAYING' && oldStatus === 'NOT_STARTED') {
            const { homeStarters, awayStarters } = req.body;
            
            // If the frontend sends arrays of starter IDs/Jersey numbers when starting the game
            if (homeStarters && homeStarters.length > 0) {
                await GameStats.updateMany(
                    { gameId: game._id, team: 'lasalle', playerId: { $in: homeStarters } },
                    { $set: { isOnCourt: true, lastSubInTime: 0 } }
                );
            }
            if (awayStarters && awayStarters.length > 0) {
                await GameStats.updateMany(
                    { gameId: game._id, team: 'opponent', opponentPlayerIndex: { $in: awayStarters } },
                    { $set: { isOnCourt: true, lastSubInTime: 0 } }
                );
            }
        }
        

        const updatedGame = await game.save();

        // Get the WebSocket instance attached to the app
        const io = req.app.get('io');

        // Broadcast status update to clients in the game room
        io.to(req.params.gameId).emit('game_status_updated', {
            currentPeriod: updatedGame.currentPeriod,
            gameClock: updatedGame.gameClock,
            status: updatedGame.status,
            updatedGame: updatedGame
        });

        res.json(updatedGame);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};




//  record a game event
exports.recordGameEvent = async (req, res) => {
    try {
        const { team, playerId, opponentPlayer, eventType, shotType, gameClock } = req.body;
        const game = await Game.findById(req.params.gameId);
        if (!game) return res.status(404).json({ error: 'Game not found' });

        let points = 0;
        if (eventType === 'shot made') {
            if (shotType === '2PT') points = 2;
            else if (shotType === '3PT') points = 3;
        } else if (eventType === 'free throw made') {
            points = 1;
        }

        const gameTimeSeconds = computeGameTimeSeconds(
            game.currentPeriod,
            gameClock
        );

        const event = new GameEvent({
            gameId: game._id,
            team,
            playerId: team === 'lasalle' ? playerId : null,
            opponentPlayer: team === 'opponent' ? opponentPlayer : undefined,
            period: game.currentPeriod,
            gameClock: gameClock || game.gameClock,
            gameTimeSeconds,
            eventType,
            shotType: shotType || '',
            points,
            reversed: false
        });
        await event.save();

        // game.events.push(event._id);
        // await game.save();

        // Update stats
        await updateStatsForEvent(event);

        // Return updated game state
        const updatedGame = await Game.findById(game._id).lean();
        const stats = await GameStats.find({ gameId: game._id }).populate('playerId', 'jerseyNumber').lean();
        const events = await GameEvent.find({ gameId: game._id, reversed: false })
            .sort('-createdAt').limit(50).populate('playerId', 'firstName lastName jerseyNumber').lean();


        // Get the WebSocket instance attached to the app
        const io = req.app.get('io');

        // Broadcast to EVERYONE in the game's room that the data changed
        io.to(req.params.gameId).emit('stat_recorded', {
            message: "New play recorded",
            // send the specific event back so clients don't have to re-fetch
            events: events,
            // Optionally send updated stats or game info if needed
            updatedStats: stats,
            updatedGame: updatedGame
        });

        res.json({ game: updatedGame, stats, events });

    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// undo last game event
exports.undoLastEvent = async (req, res) => {
    try {
        const lastEvent = await GameEvent.findOne({ gameId: req.params.gameId, reversed: false })
            .sort('-createdAt');
        if (!lastEvent) return res.status(404).json({ error: 'No events to undo' });

        lastEvent.reversed = true;
        await lastEvent.save();

        // Reverse stats
        await updateStatsForEvent(lastEvent, true);

        const game = await Game.findById(req.params.gameId).lean();
        const stats = await GameStats.find({ gameId: game._id }).populate('playerId', 'jerseyNumber').lean();;
        const events = await GameEvent.find({ gameId: game._id, reversed: false })
            .sort('-createdAt').limit(50).populate('playerId', 'firstName lastName jerseyNumber').lean();


        // Get the WebSocket instance attached to the app
        const io = req.app.get('io');

        // Broadcast to clients that an event was undone\
        io.to(req.params.gameId).emit('event_undone', {
            message: "Last event undone",
            events: events,
            updatedStats: stats,
            updatedGame: game,
            lastEvent: lastEvent
        });

        res.json({ game, stats, events, lastEvent });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// add overtime
exports.addOvertime = async (req, res) => {
    try {
        const game = await Game.findById(req.params.gameId);

        if (!game) {
            return res.status(404).json({ 
                error: 'Game not found' 
            })
        };

        game.quarterScores.overtimes.push({ team: 0, opponent: 0 });
        game.currentPeriod = 5 + game.quarterScores.overtimes.length - 1;
        game.gameClock = '05:00';
        game.status = 'PAUSED';
        game.markModified('quarterScores');

        await game.save();


        // Get the WebSocket instance attached to the app
        const io = req.app.get('io');

        // Broadcast to clients that a new overtime period was added
        io.to(req.params.gameId).emit('overtime_added', {
            message: "Overtime period added",
            currentPeriod: game.currentPeriod,
            gameClock: game.gameClock,
            quarterScores: game.quarterScores,
            gameStatus: game.status,
            game: game
        });
        res.json(game);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

// get stats for a game
exports.loadStats = async (req, res) => {
    try {
        const stats = await GameStats.find({ gameId: req.params.gameId }).populate('playerId').lean();
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// get events for a game
exports.loadEvents = async (req, res) => {
    try {
        const events = await GameEvent.find({ gameId: req.params.gameId, reversed: false })
            .sort({createdAt: -1}).limit(100).populate('playerId').lean();
        res.json(events);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

// Generate game insights using AI
exports.generateInsights = async (req, res) => {
    try {
        const gameId = req.params.gameId;

        const game = await Game.findById(gameId).lean();
        const stats = await GameStats.find({ gameId }).lean();

        if (!game) {
            return res.status(404).json({ error: "Game not found" });
        }

        // Aggregate Team Stats
        let team = { pts: 0, reb: 0, ast: 0, fgMade: 0, fgAtt: 0, to: 0 };
        let opp = { pts: 0, reb: 0, ast: 0, fgMade: 0, fgAtt: 0, to: 0 };

        stats.forEach(s => {
            const target = s.team === 'lasalle' ? team : opp;

            Object.values(s.periodStats).forEach(period => {
                if (!period) return;

                target.pts += period.points || 0;
                target.reb += (period.offensiveRebounds || 0) + (period.defensiveRebounds || 0);
                target.ast += period.assists || 0;
                target.fgMade += period.fieldGoalsMade || 0;
                target.fgAtt += period.fieldGoalsAttempted || 0;
                target.to += period.turnovers || 0;
            });
        });

        const fgTeam = team.fgAtt ? (team.fgMade / team.fgAtt * 100).toFixed(1) : 0;
        const fgOpp = opp.fgAtt ? (opp.fgMade / opp.fgAtt * 100).toFixed(1) : 0;



        // ---- calculate win probability ----

        // Get past games vs opponent
        const pastGames = await Game.find({
            opponent: game.opponent,
            status: 'ENDED'
        })
        .sort({ gameDate: -1 })
        .limit(5)
        .lean();
        
        // compute data for insights
        let wins = 0;
        let totalMargin = 0;
        let totalTeamScore = 0;
        let totalOppScore = 0;

        pastGames.forEach(g => {
            if (g.teamScore > g.opponentScore) wins++;

            const margin = g.teamScore - g.opponentScore;
            totalMargin += margin;

            totalTeamScore += g.teamScore;
            totalOppScore += g.opponentScore;
        });

        const gamesCount = pastGames.length || 1;

        const avgMargin = gamesCount ? (totalMargin / gamesCount).toFixed(1) : 0;
        const avgTeamScore = gamesCount ? (totalTeamScore / gamesCount).toFixed(1) : 0;
        const avgOppScore = gamesCount ? (totalOppScore / gamesCount).toFixed(1) : 0;


        let winProb = 50;

        // simple heuristic
        winProb += (wins / gamesCount) * 20; 

        // clamp
        winProb = Math.max(0, Math.min(100, winProb));



        // Build RAG Context
        const context = `
            Game Status: ${game.status}
            Period: ${game.currentPeriod}

            Score:
            La Salle: ${team.pts}
            Opponent: ${opp.pts}

            Team Stats:
            FG%: ${fgTeam}
            Rebounds: ${team.reb}
            Assists: ${team.ast}
            Turnovers: ${team.to}

            Opponent Stats:
            FG%: ${fgOpp}
            Rebounds: ${opp.reb}
            Assists: ${opp.ast}
            Turnovers: ${opp.to}

            Estimated Win Probability (La Salle): ${winProb}%
        `;

        const historicalContext = `
            Historical Matchup Data:
            - Last ${gamesCount} games vs ${game.opponent}
            - Wins: ${wins}, Losses: ${gamesCount - wins}
            - Average scoring margin: ${avgMargin}
            - Average score: La Salle ${avgTeamScore} - Opponent ${avgOppScore}
        `;


        const fullContext = `
            ${context}

            ${historicalContext}
        `;

        // Prompt Engineering
        const prompt = `
            You are a basketball analytics assistant.

            Analyze the provided game data and return a JSON object strictly matching this structure. 
            Do NOT include markdown formatting or code blocks.
            
            {
                "keyInsights": ["insight 1", "insight 2", "insight 3"],
                "strengthsAndWeaknesses": ["point 1", "point 2"],
                "tacticalSuggestions": ["suggestion 1", "suggestion 2"],
                "winProbability": ["Estimated Win Probability (La Salle): 55%", "Estimated Win Probability (${game.opponent}): 55%"] // Optional: Only include if the game status is not ENDED or NOT_STARTED
            }
        `;

        // LLM Call
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json", // guarantees valid JSON output
            }
        });
        
        const result = await model.generateContent(`
            ${prompt}
            
            DATA:
            ${fullContext}
            
            IMPORTANT:
            - Be concise
            - Use bullet points
            - Do NOT repeat raw stats
        `);
        
        // Parse JSON output
        const insightsJSON = JSON.parse(result.response.text());

        res.json({
            gameId,
            insights: insightsJSON
        });

    } catch (err) {
        console.error("Backend error:", err);
        res.status(500).json({ 
            error: err.message 
        });
    }
};



// Get Games by Tournament - returns all games for a specific tournament, sorted by date (newest first)
exports.getGamesByTournament = async (req, res) => {
    try {
        const tournamentId = req.params.tournamentId; // Get tournament ID from URL parameters
        const games = await Game.find({ tournament: tournamentId }).sort({ gameDate: -1 }).lean();

        res.status(200).json({
            success: true,
            count: games.length,
            data: games
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching games for tournament.",
            error: error.message
        });
    }
};

// Get Games by Season - returns all games for a specific season, sorted by date (newest first)
exports.getGamesBySeason = async (req, res) => {
    try {
        const season = req.params.season; // Get season from URL parameters
        const tournaments = await Tournament.find({ season }).select('_id').lean();

        if (tournaments.length === 0) {
            return res.status(404).json({
                success: false,
                message: "No tournaments found for the specified season."
            });
        }

        const games = await Game.find({ tournament: { $in: tournaments.map(t => t._id) } }).sort({ gameDate: -1 }).lean();

        res.status(200).json({
            success: true,
            count: games.length,
            data: games
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching games for season.",
            error: error.message
        });
    }
};

// Get Games by Opponent - returns all games against a specific opponent, sorted by date (newest first)
exports.getGamesByOpponent = async (req, res) => {
    try {
        const opponentTeam = req.params.opponentTeam; // Get opponent from URL parameters
        const games = await Game.find({ opponent: opponentTeam }).sort({ gameDate: -1 }).lean();

        res.status(200).json({
            success: true,
            count: games.length,
            data: games
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching games for opponent.",
            error: error.message
        });
    }
};

// Get Games by Status - returns all games with a specific status (e.g., "Scheduled", "Completed"), sorted by date (newest first)
exports.getGamesByStatus = async (req, res) => {
    try {
        const status = req.params.status; // Get status from URL parameters
        const games = await Game.find({ status: status }).sort({ gameDate: -1 }).lean();

        res.status(200).json({
            success: true,
            count: games.length,
            data: games
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching games for status.",
            error: error.message
        });
    }
};

// Get Games by Result - returns all games with a specific result (e.g., "Win", "Loss"), sorted by date (newest first)
exports.getGamesByResult = async (req, res) => {
    try {
        const result = req.params.result; // Get result from URL parameters
        const games = await Game.find({ result: result }).sort({ gameDate: -1 }).lean();

        res.status(200).json({
            success: true,
            count: games.length,
            data: games
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching games for result.",
            error: error.message
        });
    }
};

// Get Games by Date Range - returns all games that occurred within a specified date range, sorted by date (newest first)
exports.getGamesByDateRange = async (req, res) => {
    try {
        const { startDate, endDate } = req.query; // Get start and end dates from query parameters

        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: "Start date and end date are required."
            });
        }

        const games = await Game.find({
            gameDate: {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            }
        }).sort({ gameDate: -1 }).lean();

        res.status(200).json({
            success: true,
            count: games.length,
            data: games
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching games for date range.",
            error: error.message
        });
    }
};

// Get Games by Venue - returns all games played at a specific venue, sorted by date (newest first)
exports.getGamesByVenue = async (req, res) => {
    try {
        const venue = req.params.venue; // Get venue from URL parameters
        const games = await Game.find({ venue: venue }).sort({ gameDate: -1 }).lean();

        res.status(200).json({
            success: true,
            count: games.length,
            data: games
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching games for venue.",
            error: error.message
        });
    }
};

/*
*   Get Games by Team Score Range - returns all games where the team's score falls 
*       within a specified range, sorted by date (newest first. This can be useful 
*       for analyzing games with high or low scoring outputs.)
*/ 
exports.getGamesByTeamScoreRange = async (req, res) => {
    try {
        const { minScore, maxScore } = req.query; // Get min and max scores from query parameters

        if (minScore === undefined || maxScore === undefined) {
            return res.status(400).json({
                success: false,
                message: "Minimum score and maximum score are required."
            });
        }

        const games = await Game.find({
            teamScore: {
                $gte: Number(minScore),
                $lte: Number(maxScore)
            }
        }).sort({ gameDate: -1 }).lean();

        res.status(200).json({
            success: true,
            count: games.length,
            data: games
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching games for team score range.",
            error: error.message
        });
    }
};


// Get Games by Opponent Score Range - returns all games where the opponent's score falls
exports.getGamesByOpponentScoreRange = async (req, res) => {
    try {
        const { minScore, maxScore } = req.query; // Get min and max scores from query parameters

        if (minScore === undefined || maxScore === undefined) {
            return res.status(400).json({
                success: false,
                message: "Minimum score and maximum score are required."
            });
        }

        const games = await Game.find({
            opponentScore: {
                $gte: Number(minScore),
                $lte: Number(maxScore)
            }
        }).sort({ gameDate: -1 }).lean();

        res.status(200).json({
            success: true,
            count: games.length,
            data: games
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching games for opponent score range.",
            error: error.message
        });
    }
};

/*
* Get Games by Score Difference Range - returns all games where the difference 
*        between the team's score and the opponent's score falls within a specified 
*        range, sorted by date (newest first). This can be useful for analyzing close 
*        games or blowouts.
*/
exports.getGamesByScoreDifferenceRange = async (req, res) => {
    try {
        const { minDifference, maxDifference } = req.query; // Get min and max score differences from query parameters

        if (minDifference === undefined || maxDifference === undefined) {
            return res.status(400).json({
                success: false,
                message: "Minimum score difference and maximum score difference are required."
            });
        }

        const games = await Game.find({
            $expr: {
                $and: [
                    { $gte: [{ $subtract: ["$teamScore", "$opponentScore"] }, Number(minDifference)] },
                    { $lte: [{ $subtract: ["$teamScore", "$opponentScore"] }, Number(maxDifference)] }
                ]
            }
        }).sort({ gameDate: -1 }).lean();

        res.status(200).json({
            success: true,
            count: games.length,
            data: games
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching games for score difference range.",
            error: error.message
        });
    }
};

// Get Games by Multiple Filters - returns all games that match a combination of filters (e.g., opponent, venue, season, status, result), sorted by date (newest first)
exports.getGamesByFilters = async (req, res) => {
    try {
        const filters = req.query; // Get filters from query parameters
        const query = {};

        // Build query object based on provided filters
        if (filters.opponent) query.opponent = filters.opponent;
        if (filters.venue) query.venue = filters.venue;
        if (filters.status) query.status = filters.status;
        if (filters.result) query.result = filters.result;

        const games = await Game.find(query).sort({ gameDate: -1 }).lean();

        res.status(200).json({
            success: true,
            count: games.length,
            data: games
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching games with filters.",
            error: error.message
        });
    }
};

// Get Games by Multiple Filters and Date Range - returns all games that match a combination of filters (e.g., opponent, venue, season, status, result) and occurred within a specified date range, sorted by date (newest first)
exports.getGamesByFiltersAndDateRange = async (req, res) => {
    try {
        const filters = req.query; // Get filters from query parameters
        const { startDate, endDate } = req.query; // Get start and end dates from query parameters
        const query = {};

        // Build query object based on provided filters
        if (filters.opponent) query.opponent = filters.opponent;
        if (filters.venue) query.venue = filters.venue;
        if (filters.status) query.status = filters.status;
        if (filters.result) query.result = filters.result;

        // Add date range to query if provided
        if (startDate && endDate) {
            query.gameDate = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const games = await Game.find(query).sort({ gameDate: -1 }).lean();

        res.status(200).json({
            success: true,
            count: games.length,
            data: games
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching games with filters and date range.",
            error: error.message
        });
    }
};

// Get Games by Multiple Filters and Score Range - returns all games that match a combination of filters (e.g., opponent, venue, season, status, result) and where the team's score and/or opponent's score falls within specified ranges, sorted by date (newest first)
exports.getGamesByFiltersAndScoreRange = async (req, res) => {
    try {
        const filters = req.query; // Get filters from query parameters
        const { minTeamScore, maxTeamScore, minOpponentScore, maxOpponentScore } = req.query; // Get score ranges from query parameters
        const query = {};

        // Build query object based on provided filters
        if (filters.opponent) query.opponent = filters.opponent;
        if (filters.venue) query.venue = filters.venue;
        if (filters.status) query.status = filters.status;
        if (filters.result) query.result = filters.result;

        // Add team score range to query if provided
        if (minTeamScore !== undefined && maxTeamScore !== undefined) {
            query.teamScore = {
                $gte: Number(minTeamScore),
                $lte: Number(maxTeamScore)
            };
        }

        // Add opponent score range to query if provided
        if (minOpponentScore !== undefined && maxOpponentScore !== undefined) {
            query.opponentScore = {
                $gte: Number(minOpponentScore),
                $lte: Number(maxOpponentScore)
            };
        }

        const games = await Game.find(query).sort({ gameDate: -1 }).lean();

        res.status(200).json({
            success: true,
            count: games.length,
            data: games
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching games with filters and score range.",
            error: error.message
        });
    }
};

// Get Games by Multiple Filters, Date Range, and Score Range - returns all games that match a combination of filters (e.g., opponent, venue, season, status, result), occurred within a specified date range, and where the team's score and/or opponent's score falls within specified ranges, sorted by date (newest first)
exports.getGamesByFiltersDateRangeAndScoreRange = async (req, res) => {
    try {
        const filters = req.query; // Get filters from query parameters
        const { startDate, endDate, minTeamScore, maxTeamScore, minOpponentScore, maxOpponentScore } = req.query; // Get date and score ranges from query parameters
        const query = {};

        // Build query object based on provided filters
        if (filters.opponent) query.opponent = filters.opponent;
        if (filters.venue) query.venue = filters.venue;
        if (filters.status) query.status = filters.status;
        if (filters.result) query.result = filters.result;

        // Add date range to query if provided
        if (startDate && endDate) {
            query.gameDate = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        // Add team score range to query if provided
        if (minTeamScore !== undefined && maxTeamScore !== undefined) {
            query.teamScore = {
                $gte: Number(minTeamScore),
                $lte: Number(maxTeamScore)
            };
        }

        // Add opponent score range to query if provided
        if (minOpponentScore !== undefined && maxOpponentScore !== undefined) {
            query.opponentScore = {
                $gte: Number(minOpponentScore),
                $lte: Number(maxOpponentScore)
            };
        }

        const games = await Game.find(query).sort({ gameDate: -1 }).lean();

        res.status(200).json({
            success: true,
            count: games.length,
            data: games
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching games with filters, date range, and score range.",
            error: error.message
        });
    }
};


// Update Game - allows updating any of the game's details, including scores and status. If scores are updated, the result (win/loss) is automatically recalculated based on the new scores.
exports.updateGame = async (req, res) => {
    try {
        const gameId = req.params.gameId; // Get game ID from URL parameters
        const game = await Game.findById(gameId);

        if (!game) {
            return res.status(404).json({
                success: false,
                message: "Game not found"
            });
        }

        const {
            gameDate,
            opponent,
            tournament,
            venue,
            startTime,
            quarterScores,
            status,
            teamScore,
            opponentScore,
            currentPeriod,
            gameClock
        } = req.body;

        // Update fields if they are provided in the request body
        if (gameDate) game.gameDate = gameDate;
        if (opponent) game.opponent = opponent;
        if (tournament) game.tournament = tournament;
        if (startTime) game.startTime = startTime;
        if (quarterScores) {
            game.quarterScores = quarterScores;
            game.markModified('quarterScores');
        }
        if (venue) game.venue = venue;
        if (status) game.status = status;
        if (currentPeriod !== undefined) game.currentPeriod = currentPeriod;
        if (gameClock) game.gameClock = gameClock;

        // Update scores if provided
        if (teamScore !== undefined) game.teamScore = teamScore;
        if (opponentScore !== undefined) game.opponentScore = opponentScore;

        // Recalculate final score if quarterScores changed
        if (quarterScores) {
            game.calculateFinalScore();
        }

        // Update result automatically based on scores
        if (game.teamScore > game.opponentScore) {
            game.result = "Win";
        } else if (game.teamScore < game.opponentScore) {
            game.result = "Loss";
        } else {
            game.result = undefined; // Tie or no result
        }

        const updatedGame = await game.save();
        await updatedGame.populate('createdBy', 'username email');
        await updatedGame.populate('tournament');

        res.status(200).json({
            success: true,
            message: "Game updated successfully",
            data: updatedGame
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error updating game.",
            error: error.message
        });
    }
};

// Delete Game - deletes a game by its ID. This should also handle cascading deletes or cleanup of related data (e.g., game stats) if necessary.
exports.deleteGame = async (req, res) => {
    try {
        const game = await Game.findByIdAndDelete(req.params.gameId);
        if (!game) {
            return res.status(404).json({ success: false, message: "Game not found." });
        }

        //  Cascade delete linked data (GameStats and GameEvents)
        // Using Promise.all allows both database queries to run at the same time for better performance
        await Promise.all([
            GameStats.deleteMany({ gameId: req.params.gameId }),
            GameEvent.deleteMany({ gameId: req.params.gameId })
        ]);

        return res.json({ 
            success: true, 
            message: "Game and all associated stats and events were successfully deleted." 
        });
    } catch (error) {
        console.error("Error deleting game:", error);
        return res.status(500).json({ 
            success: false, 
            message: "Error deleting game.", 
            error: error.message 
        });
    }
};

