const Game = require("../models/Game");
const Tournament = require('../models/Tournament');
const GameEvent = require('../models/GameEvents');
const GameStats = require('../models/GameStats');
const Player = require('../models/Player');


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


// Create a new game
exports.createGame = async (req, res) => {
    try { 
        const { opponent, opponentPlayers, tournament, venue, gameDate } = req.body;
        if (!opponent) return res.status(400).json({ error: 'Opponent name required' });
        if (!opponentPlayers || opponentPlayers.length < 5) {
            return res.status(400).json({ error: 'Minimum 5 opponent players required' });
        }
        // Validate unique jersey numbers
        const jerseys = opponentPlayers.map(p => p.jerseyNumber);
        if (new Set(jerseys).size !== jerseys.length) {
            return res.status(400).json({ error: 'Opponent jersey numbers must be unique' });
        }

        const game = new Game({
            opponent,
            opponentPlayers,
            tournament,
            venue: venue || 'TBD',
            gameDate: gameDate || new Date(),
            startTime: new Date(),
            teamScore: 0,
            opponentScore: 0,
            status: 'NOT_STARTED'
        });
        await game.save();

        // Create GameStats entries for all home players
        const homePlayers = await Player.find({ status: 'Active' });
        for (const p of homePlayers) {
            const gs = new GameStats({ gameId: game._id, playerId: p._id, team: 'lasalle' });
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

        res.status(201).json({ 
            success: true, 
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

// update a game status/period
exports.updateGameStatus = async (req, res) => {
    try {
        const updates = {};
        if (req.body.status) updates.status = req.body.status;
        if (req.body.currentPeriod) updates.currentPeriod = req.body.currentPeriod;
        if (req.body.gameClock) updates.gameClock = req.body.gameClock;
        const game = await Game.findByIdAndUpdate(req.params.gameId, updates, { returnDocument: 'after' });
        res.json(game);
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

        const event = new GameEvent({
            gameId: game._id,
            team,
            playerId: team === 'lasalle' ? playerId : null,
            opponentPlayer: team === 'opponent' ? opponentPlayer : undefined,
            period: game.currentPeriod,
            gameClock: gameClock || game.gameClock,
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
        const updatedGame = await Game.findById(game._id);
        const stats = await GameStats.find({ gameId: game._id });
        const events = await GameEvent.find({ gameId: game._id, reversed: false })
            .sort('-createdAt').limit(50).populate('playerId').lean();
        
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

        const game = await Game.findById(req.params.gameId);
        const stats = await GameStats.find({ gameId: game._id });
        const events = await GameEvent.find({ gameId: game._id, reversed: false })
            .sort('-createdAt').limit(50).populate('playerId').lean();

        res.json({ game, stats, events });
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
        const gameId = req.params.id; // Get game ID from URL parameters
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
            status
        } = req.body;

        // Update fields if they are provided in the request body
        if (gameDate) game.gameDate = gameDate;
        if (opponent) game.opponent = opponent;
        if (tournament) game.tournament = tournament;
        if (startTime) game.startTime = startTime;
        if (quarterScores) game.quarterScores = quarterScores;
        if (venue) game.venue = venue;
        if (status) game.status = status;

        // Recalculate final score if quarterScores changed
        if (quarterScores) {
            game.calculateFinalScore();
        }

        // Update result automatically
        if (game.teamScore > game.opponentScore) {
            game.result = "Win";
        } else if (game.teamScore < game.opponentScore) {
            game.result = "Loss";
        }

        const updatedGame = await game.save();
        await game.populate('createdBy', 'username email').populate('tournament');

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
        const gameId = req.params.id; // Get game ID from URL parameters
        const game = await Game.findByIdAndDelete(gameId);

        if (!game) {
            return res.status(404).json({
                success: false,
                message: "Game not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Game deleted successfully"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error deleting game",
            error: error.message
        });
    }
};

