const Game = require("../models/Game");
const Tournament = require('../models/Tournament');

// Create Game
exports.createGame = async (req, res) => {
    try {
        const {
            gameDate,
            opponent,
            tournament, // id of the tournament
            venue,  
            teamScore,
            opponentScore,
            status,
        } = req.body;

        // Validate required fields
        if (
            !gameDate ||
            !opponent ||
            !tournament ||
            !venue ||
            teamScore === undefined ||
            opponentScore === undefined 
        ) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields."
            });
        }

        // Validate tournament exists
        const tournamentExists = await Tournament.findById(tournament);
        if (!tournamentExists) {
            return res.status(404).json({
                success: false,
                message: "Tournament not found."
            });
        }
        // Determine result automatically
        let result;

        if (teamScore > opponentScore) {
            result = "Win";
        } else if (teamScore < opponentScore) {
            result = "Loss";
        } else if (teamScore === opponentScore) {
            result = null;
        }

        // Create new Game document
        const game = new Game({
            gameDate,
            opponent,
            tournament,
            venue,
            result,
            teamScore,
            opponentScore,
            status,
            createdBy: req.session.user.id 
        });

        const savedGame = await game.save();

        res.status(201).json({
            success: true,
            message: "Game created successfully.",
            data: savedGame
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error creating game.",
            error: error.message
        });
    }
};

// Get All Games - with optional sorting by date (newest first)
exports.getAllGames = async (req, res) => {
    try {
        const games = await Game.find().sort({ gameDate: -1 }).lean();
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
        const gameId = req.params.id; // Get game ID from URL parameters
        const game = await Game.findById(gameId).lean();

        if (!game) {
            return res.status(404).json({
                success: false,
                message: "Game not found."
            });
        }

        res.status(200).json({
            success: true,
            data: game
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error fetching game.",
            error: error.message
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
        const opponent = req.params.opponent; // Get opponent from URL parameters
        const games = await Game.find({ opponent: opponent }).sort({ gameDate: -1 }).lean();

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
            tournament, // id of the tournament
            venue,
            teamScore,
            opponentScore,
            status
        } = req.body;

        // Update fields if they are provided in the request body
        if (gameDate) game.gameDate = gameDate;
        if (opponent) game.opponent = opponent;
        if (tournament) game.tournament = tournament;
        if (venue) game.venue = venue;
        if (status) game.status = status;

        if (teamScore != null) game.teamScore = teamScore;
        if (opponentScore != null) game.opponentScore = opponentScore;

        // Update result automatically
        if (game.teamScore > game.opponentScore) {
            game.result = "Win";
        } else if (game.teamScore < game.opponentScore) {
            game.result = "Loss";
        }

        const updatedGame = await game.save();

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

