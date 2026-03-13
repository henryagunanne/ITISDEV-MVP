const mongoose = require("mongoose");
const GameStats = require("../models/GameStats");
const Game = require("../models/Game");
const Player = require("../models/Player");

// Create new game stats
exports.createGameStats = async (req, res) => {
    try {
        const { gameId, playerId, periodStats } = req.body;

        // Validate required fields
        if (!gameId || !playerId) {
            return res.status(400).json({
                success: false,
                message: "gameId and playerId are required."
            });
        }

        const gameStats = new GameStats({ gameId, playerId, periodStats });

        await gameStats.save();
        res.status(201).json({
            success: true,
            message: "Game stats created successfully.",
            data: gameStats
        });
    } catch (error) {
        // Handle duplicate key error
        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                message: "Stats for this player in this game already exist."
            });
        }
        res.status(500).json({
            success: false,
            message: "Error creating game stats.",
            error: error.message
        });
    }
};


// Update game stats by ID
exports.updateGameStats = async (req, res) => {
    try {
        const { id } = req.params;
        const updateData = req.body;

        const updatedStats = await GameStats.findByIdAndUpdate(id, updateData, { new: true });

        if (!updatedStats) {
            return res.status(404).json({
                success: false,
                message: "Game stats not found."
            });
        }

        res.status(200).json({
            success: true,
            message: "Game stats updated successfully.",
            data: updatedStats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error updating game stats.",
            error: error.message
        });
    }
};


// Get game stats by gameId - returns all player stats for a specific game (useful for box scores)
exports.getStatsByGameId = async (req, res) => {
    try {
        const { gameId } = req.params;

        const stats = await GameStats.find({ gameId }).populate('playerId', 'fullName jerseyNumber position');

        res.status(200).json({
            success: true,
            message: "Game stats retrieved successfully.",
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error retrieving game stats.",
            error: error.message
        });
    }
};

// Get game stats by playerId - returns all game stats for a specific player (useful for player profiles and career stats)
exports.getStatsByPlayerId = async (req, res) => {
    try {
        const { playerId } = req.params;

        const stats = await GameStats.find({ playerId }).populate('gameId', 'gameDate opponent tournament, result, teamScore opponentScore').sort({ gameDate: -1 });

        res.status(200).json({
            success: true,
            message: "Game stats retrieved successfully.",
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error retrieving game stats.",
            error: error.message
        });
    }
};


// Delete game stats by ID
exports.deleteGameStats = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedStats = await GameStats.findByIdAndDelete(id);

        if (!deletedStats) {
            return res.status(404).json({
                success: false,
                message: "Game stats not found."
            });
        }

        res.status(200).json({
            success: true,
            message: "Game stats deleted successfully."
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error deleting game stats.",
            error: error.message
        });
    }
};


// This endpoint generates a full box score for a specific game, including player stats.
exports.getGameBoxScore = async (req, res) => {
    try {
        const gameId = req.params.gameId;

        const boxScore = await GameStatistics.aggregate([
            {
                $match: { gameId: new mongoose.Types.ObjectId(gameId) }
            },
            {
                $lookup: {
                    from: "players",
                    localField: "playerId",
                    foreignField: "_id",
                    as: "player"
                }
            },
            { $unwind: "$player" },
            {
                $project: {
                    _id: 0,
                    playerName: "$player.fullName",
                    jerseyNumber: "$player.jerseyNumber",
                    position: "$player.position",
                    minutesPlayed: 1,
                    points: 1,
                    fieldGoalsMade: 1,
                    fieldGoalsAttempted: 1,
                    threePointersMade: 1,
                    threePointersAttempted: 1,
                    freeThrowsMade: 1,
                    freeThrowsAttempted: 1,
                    offensiveRebounds: 1,
                    defensiveRebounds: 1,
                    assists: 1,
                    steals: 1,
                    blocks: 1,
                    turnovers: 1,
                    fouls: 1,
                    plusMinus: 1,
                    totalRebounds: { $add: ["$offensiveRebounds", "$defensiveRebounds"] },
                    FGPercentage: { $cond: [{ $eq: ["$fieldGoalsAttempted", 0] }, 0, { $multiply: [{ $divide: ["$fieldGoalsMade", "$fieldGoalsAttempted"] }, 100] }] },
                    threePointPercentage: { $cond: [{ $eq: ["$threePointersAttempted", 0] }, 0, { $multiply: [{ $divide: ["$threePointersMade", "$threePointersAttempted"] }, 100] }] },
                    freeThrowPercentage: { $cond: [{ $eq: ["$freeThrowsAttempted", 0] }, 0, { $multiply: [{ $divide: ["$freeThrowsMade", "$freeThrowsAttempted"] }, 100] }] }
                }
            },
            { $sort: { jerseyNumber: 1 } }
        ]);

        res.status(200).json({
            success: true,
            message: "Box score generated successfully.",
            gameId: gameId,
            data: boxScore
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error generating box score",
            error: error.message
        });
    }
};


// Get all game stats (for admin or analytics purposes)
exports.getAllGameStats = async (req, res) => {
    try {
        const stats = await GameStats.find().lean();

        res.status(200).json({
            success: true,
            message: "All game stats retrieved successfully.",
            data: stats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error retrieving game stats.",
            error: error.message
        });
    }
};

// Get aggregated stats for a player (career totals, averages, etc.)
exports.getAggregatedStatsByPlayerId = async (req, res) => {
    try {
        const { playerId } = req.params;

        const aggregatedStats = await GameStats.aggregate([
            { $match: { playerId: mongoose.Types.ObjectId(playerId) } },
            {
                $group: {
                    _id: "$playerId",
                    totalGames: { $sum: 1 },
                    totalPoints: { $sum: "$points" },
                    averagePoints: { $avg: "$points" },
                    totalRebounds: { $sum: { $add: ["$offensiveRebounds", "$defensiveRebounds"] } },
                    averageRebounds: { $avg: { $add: ["$offensiveRebounds", "$defensiveRebounds"] } },

                    totalOffensiveRebounds: { $sum: "$offensiveRebounds" },
                    averageOffensiveRebounds: { $avg: "$offensiveRebounds" },
                    totalDefensiveRebounds: { $sum: "$defensiveRebounds" },
                    averageDefensiveRebounds: { $avg: "$defensiveRebounds" },

                    averageMinutesPlayed: { $avg: "$minutesPlayed" },

                    averageFTM: { $avg: "$freeThrowsMade" },
                    averageFTA: { $avg: "$freeThrowsAttempted" },
                    totalFTM: { $sum: "$freeThrowsMade" },
                    totalFTA: { $sum: "$freeThrowsAttempted" },
                    FTPercentage: { $cond: [{ $eq: ["$freeThrowsAttempted", 0] }, 0, { $multiply: [{ $divide: ["$freeThrowsMade", "$freeThrowsAttempted"] }, 100] }] },

                    averageFGM: { $avg: "$fieldGoalsMade" },
                    averageFGA: { $avg: "$fieldGoalsAttempted" },
                    totalFGM: { $sum: "$fieldGoalsMade" },
                    totalFGA: { $sum: "$fieldGoalsAttempted" },
                    FGPercentage: { $cond: [{ $eq: ["$fieldGoalsAttempted", 0] }, 0, { $multiply: [{ $divide: ["$fieldGoalsMade", "$fieldGoalsAttempted"] }, 100] }] },

                    averge3PM: { $avg: "$threePointersMade" },
                    average3PA: { $avg: "$threePointersAttempted" },
                    total3PA: { $avg: "$threePointersAttempted" },
                    total3PM: { $avg: "$threePointersMade" },
                    threePointPercentage: { $cond: [{ $eq: ["$threePointersAttempted", 0] }, 0, { $multiply: [{ $divide: ["$threePointersMade", "$threePointersAttempted"] }, 100] }] },

                    totalAssists: { $sum: "$assists" },
                    averageAssists: { $avg: "$assists" },
                    totalSteals: { $sum: "$steals" },
                    averageSteals: { $avg: "$steals" },
                    totalBlocks: { $sum: "$blocks" },
                    averageBlocks: { $avg: "$blocks" },
                    totalTurnovers: { $sum: "$turnovers" },
                    averageTurnovers: { $avg: "$turnovers" },
                    averageFouls: { $avg: "$fouls" },
                    averagePlusMinus: { $avg: "$plusMinus" },
                    // Add more aggregated fields as needed
                }
            }
        ]);

        res.status(200).json({
            success: true,
            message: "Aggregated stats retrieved successfully.",
            data: aggregatedStats[0] || {}
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error retrieving aggregated stats.",
            error: error.message
        });
    }
};

// Get aggregated stats for a game (team totals, averages, etc.)
exports.getAggregatedStatsByGameId = async (req, res) => {
    try {
        const { gameId } = req.params;

        const aggregatedStats = await GameStats.aggregate([
            { $match: { gameId: mongoose.Types.ObjectId(gameId) } },
            {
                $group: {
                    _id: "$gameId",
                    totalPoints: { $sum: "$points" },
                    averagePoints: { $avg: "$points" },
                    totalRebounds: { $sum: { $add: ["$offensiveRebounds", "$defensiveRebounds"] } },
                    totalOffensiveRebounds: { $sum: "$offensiveRebounds" },
                    totalDefensiveRebounds: { $sum: "$defensiveRebounds" },
                    averageRebounds: { $avg: { $add: ["$offensiveRebounds", "$defensiveRebounds"] } },
                    totalAssists: { $sum: "$assists" },
                    averageAssists: { $avg: "$assists" },
                    totalSteals: { $sum: "$steals" },
                    averageSteals: { $avg: "$steals" },
                    totalBlocks: { $sum: "$blocks" },
                    averageBlocks: { $avg: "$blocks" },
                    totalTurnovers: { $sum: "$turnovers" },
                    totalFouls: { $sum: "$fouls" },
                    totalFTMs: { $sum: "$freeThrowsMade" },
                    totalFTAs: { $sum: "$freeThrowsAttempted" },
                    total3PA: { $sum: "$threePointersAttempted" },
                    total3PM: { $sum: "$threePointersMade" },
                    totalFGAs: { $sum: "$fieldGoalsAttempted" },
                    totalFGMs: { $sum: "$fieldGoalsMade" },
                    averageMinutesPlayed: { $avg: "$minutesPlayed" },
                    // Add more aggregated fields as needed
                }
            }
        ]);

        res.status(200).json({
            success: true,
            message: "Aggregated stats retrieved successfully.",
            data: aggregatedStats[0] || {}
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error retrieving aggregated stats.",
            error: error.message
        });
    }
};


// Get aggregated stats for the entire season (requires additional fields in Game model to filter by season)
exports.getAggregatedStatsBySeason = async (req, res) => {
    try {
        const { season } = req.params;
        // Find all game IDs for the season
        const games = await Game.find({ season }, { _id: 1 });
        const gameIds = games.map(game => game._id);
        if (gameIds.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No games found for this season.",
                data: {}
            });
        }
        const aggregatedStats = await GameStats.aggregate([
            { $match: { gameId: { $in: gameIds } } },
            {
                $group: {
                    _id: null,
                    totalPoints: { $sum: "$points" },
                    averagePoints: { $avg: "$points" },
                    totalRebounds: { $sum: { $add: ["$offensiveRebounds", "$defensiveRebounds"] } },
                    averageRebounds: { $avg: { $add: ["$offensiveRebounds", "$defensiveRebounds"] } },
                    totalAssists: { $sum: "$assists" },
                    averageAssists: { $avg: "$assists" },
                    totalSteals: { $sum: "$steals" },
                    averageSteals: { $avg: "$steals" },
                    totalBlocks: { $sum: "$blocks" },
                    averageBlocks: { $avg: "$blocks" },
                    totalTurnovers: { $sum: "$turnovers" },
                    averageTurnovers: { $avg: "$turnovers" },
                    averageFouls: { $avg: "$fouls" },
                    averagePlusMinus: { $avg: "$plusMinus" },
                    totalGames: { $sum: 1 },
                }
            }
        ]);

        res.status(200).json({
            success: true,
            message: "Aggregated stats for season retrieved successfully.",
            data: aggregatedStats[0] || {}
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error retrieving aggregated stats for season.",
            error: error.message
        });
    }
};



// Get aggregated stats for a player in a specific tournament (requires additional fields in Game model to filter by tournament)
exports.getAggregatedStatsByPlayerIdAndTournament = async (req, res) => {
    try {
        const { playerId, tournamentId } = req.params;

        const aggregatedStats = await GameStats.aggregate([
            {
                $lookup: {
                    from: "games",
                    localField: "gameId",
                    foreignField: "_id",
                    as: "gameDetails"
                }
            },
            { $unwind: "$gameDetails" },
            { $match: { playerId: mongoose.Types.ObjectId(playerId), "gameDetails.tournament":  mongoose.Types.ObjectId(tournamentId) } },
            {
                $group: {
                    _id: "$playerId",
                    totalPoints: { $sum: "$points" },
                    averagePoints: { $avg: "$points" },
                    totalRebounds: { $sum: { $add: ["$offensiveRebounds", "$defensiveRebounds"] } },
                    averageRebounds: { $avg: { $add: ["$offensiveRebounds", "$defensiveRebounds"] } },
                    totalAssists: { $sum: "$assists" },
                    averageAssists: { $avg: "$assists" },
                    totalSteals: { $sum: "$steals" },
                    averageSteals: { $avg: "$steals" },
                    totalBlocks: { $sum: "$blocks" },
                    averageBlocks: { $avg: "$blocks" },
                    totalTurnovers: { $sum: "$turnovers" },
                    averageTurnovers: { $avg: "$turnovers" },
                    averageFouls: { $avg: "$fouls" },
                    averagePlusMinus: { $avg: "$plusMinus" },
                    // Add more aggregated fields as needed
                }
            }
        ]);

        res.status(200).json({
            success: true,
            message: "Aggregated stats for tournament retrieved successfully.",
            data: aggregatedStats[0] || {}
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error retrieving aggregated stats for tournament.",
            error: error.message
        });
    }
};

// Get aggregated stats for a player in a specific season (requires additional fields in Game model to filter by season)
exports.getAggregatedStatsByPlayerIdAndSeason = async (req, res) => {
    try {
        const { playerId, season } = req.params;

        // Find all game IDs for the season
        const games = await Game.find({ season }, { _id: 1 });
        const gameIds = games.map(game => game._id);

        if (gameIds.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No games found for this season.",
                data: {}
            });
        }

        // Aggregate stats for the player in those games
        const aggregatedStats = await GameStats.aggregate([
            {
                $match: {
                    playerId: mongoose.Types.ObjectId(playerId),
                    gameId: { $in: gameIds }
                }
            },
            {
                $group: {
                    _id: "$playerId",
                    totalPoints: { $sum: "$points" },
                    averagePoints: { $avg: "$points" },
                    totalRebounds: { $sum: { $add: ["$offensiveRebounds", "$defensiveRebounds"] } },
                    averageRebounds: { $avg: { $add: ["$offensiveRebounds", "$defensiveRebounds"] } },
                    totalAssists: { $sum: "$assists" },
                    averageAssists: { $avg: "$assists" },
                    totalSteals: { $sum: "$steals" },
                    averageSteals: { $avg: "$steals" },
                    totalBlocks: { $sum: "$blocks" },
                    averageBlocks: { $avg: "$blocks" },
                    totalTurnovers: { $sum: "$turnovers" },
                    averageTurnovers: { $avg: "$turnovers" },
                    averageFouls: { $avg: "$fouls" },
                    averagePlusMinus: { $avg: "$plusMinus" },
                }
            }
        ]);

        res.status(200).json({
            success: true,
            message: "Aggregated stats for season retrieved successfully.",
            data: aggregatedStats[0] || {}
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error retrieving aggregated stats for season.",
            error: error.message
        });
    }
};

// Get top scorers in a specific season (requires additional fields in Game model to filter by season)
exports.getTopScorersBySeason = async (req, res) => {
    try {
        const { season, limit = 10 } = req.params;

        // Find all game IDs for the season
        const games = await Game.find({ season }, { _id: 1 });
        const gameIds = games.map(game => game._id);

        if (gameIds.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No games found for this season.",
                data: []
            });
        }

        // Aggregate total points for each player in those games and sort by points
        const topScorers = await GameStats.aggregate([
            { $match: { gameId: { $in: gameIds } } },
            {
                $group: {
                    _id: "$playerId",
                    totalPoints: { $sum: "$points" },
                    gamesPlayed: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "players",
                    localField: "_id",
                    foreignField: "_id",
                    as: "playerDetails"
                }
            },
            { $unwind: "$playerDetails" },
            {
                $project: {
                    _id: 0,
                    playerId: "$_id",
                    fullName: "$playerDetails.fullName",
                    jerseyNumber: "$playerDetails.jerseyNumber",
                    position: "$playerDetails.position",
                    totalPoints: 1,
                    gamesPlayed: 1,
                    PointsPerGame: { $cond: [{ $eq: ["$gamesPlayed", 0] }, 0, { $divide: ["$totalPoints", "$gamesPlayed"] }] }
                }
            },
            { $sort: { PointsPerGame: -1 } },
            { $limit: parseInt(limit) },
        ]);

        res.status(200).json({
            success: true,
            message: "Top scorers retrieved successfully.",
            data: topScorers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error retrieving top scorers.",
            error: error.message
        });
    }
};


// Get top rebounders in a specific season (requires additional fields in Game model to filter by season)
exports.getTopReboundersBySeason = async (req, res) => {
    try {
        const { season, limit = 10 } = req.params;

        // Find all game IDs for the season
        const games = await Game.find({ season }, { _id: 1 });
        const gameIds = games.map(game => game._id);
        if (gameIds.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No games found for this season.",
                data: []
            });
        }

        // Aggregate total rebounds for each player in those games and sort by rebounds
        const topRebounders = await GameStats.aggregate([
            { $match: { gameId: { $in: gameIds } } },
            {
                $group: {
                    _id: "$playerId",
                    totalRebounds: { $sum: { $add: ["$offensiveRebounds", "$defensiveRebounds"] } },
                    gamesPlayed: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "players",
                    localField: "_id",
                    foreignField: "_id",
                    as: "playerDetails"
                }
            },
            { $unwind: "$playerDetails" },
            {
                $project: {
                    _id: 0,
                    playerId: "$_id",
                    fullName: "$playerDetails.fullName",
                    jerseyNumber: "$playerDetails.jerseyNumber",
                    position: "$playerDetails.position",
                    totalRebounds: 1,
                    gamesPlayed: 1,
                    ReboundsPerGame: { $cond: [{ $eq: ["$gamesPlayed", 0] }, 0, { $divide: ["$totalRebounds", "$gamesPlayed"] }] }
                }
            },
            { $sort: { ReboundsPerGame: -1 } },
            { $limit: parseInt(limit) },
        ]);

        res.status(200).json({
            success: true,
            message: "Top rebounders retrieved successfully.",
            data: topRebounders
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error retrieving top rebounders.",
            error: error.message
        });
    }
};


// Get top assist leaders in a specific season (requires additional fields in Game model to filter by season)
exports.getTopAssistLeadersBySeason = async (req, res) => {
    try {
        const { season, limit = 10 } = req.params;
        // Find all game IDs for the season
        const games = await Game.find({ season }, { _id: 1 });
        const gameIds = games.map(game => game._id);
        if (gameIds.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No games found for this season.",
                data: []
            });
        }

        // Aggregate total assists for each player in those games and sort by assists
        const topAssistLeaders = await GameStats.aggregate([
            { $match: { gameId: { $in: gameIds } } },
            {
                $group: {
                    _id: "$playerId",
                    totalAssists: { $sum: "$assists" },
                    gamesPlayed: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "players",
                    localField: "_id",
                    foreignField: "_id",
                    as: "playerDetails"
                }
            },
            { $unwind: "$playerDetails" },
            {
                $project: {
                    _id: 0,
                    playerId: "$_id",
                    fullName: "$playerDetails.fullName",
                    jerseyNumber: "$playerDetails.jerseyNumber",
                    position: "$playerDetails.position",
                    totalAssists: 1,
                    gamesPlayed: 1,
                    AssistsPerGame: { $cond: [{ $eq: ["$gamesPlayed", 0] }, 0, { $divide: ["$totalAssists", "$gamesPlayed"] }] }
                }
            },
            { $sort: { AssistsPerGame: -1 } },
            { $limit: parseInt(limit) },
        ]);

        res.status(200).json({
            success: true,
            message: "Top assist leaders retrieved successfully.",
            data: topAssistLeaders
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error retrieving top assist leaders.",
            error: error.message
        });
    }
};



// Get player performance in a specific tournament (requires additional fields in Game model to filter by tournament)
exports.getPlayerPerformanceByTournament = async (req, res) => {
    try {
        const { playerId, tournamentId } = req.params;

        const performanceStats = await GameStats.aggregate([
            {
                $lookup: {
                    from: "games",
                    localField: "gameId",
                    foreignField: "_id",
                    as: "gameDetails"
                }
            },
            { $unwind: "$gameDetails" },
            { $match: { playerId: mongoose.Types.ObjectId(playerId), "gameDetails.tournament": mongoose.Types.ObjectId(tournamentId) } },
            {
                $project: {
                    gameId: 1,
                    points: 1,
                    rebounds: { $add: ["$offensiveRebounds", "$defensiveRebounds"] },
                    assists: 1,
                    steals: 1,
                    blocks: 1,
                    turnovers: 1,
                    fouls: 1,
                    plusMinus: 1,
                    gameDate: "$gameDetails.gameDate",
                    opponent: "$gameDetails.opponent",
                    result: "$gameDetails.result"
                }
            },
            { $sort: { gameDate: -1 } }
        ]);

        res.status(200).json({
            success: true,
            message: "Player performance for tournament retrieved successfully.",
            data: performanceStats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error retrieving player performance for tournament.",
            error: error.message
        });
    }
};


// Get player performance in a specific season (requires additional fields in Game model to filter by season)
exports.getPlayerPerformanceBySeason = async (req, res) => {
    try {
        const { playerId, season } = req.params;

        // Find all game IDs for the season
        const games = await Game.find({ season }, { _id: 1 });
        const gameIds = games.map(game => game._id);

        if (gameIds.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No games found for this season.",
                data: []
            });
        }

        const performanceStats = await GameStats.aggregate([
            { $match: { playerId: mongoose.Types.ObjectId(playerId), gameId: { $in: gameIds } } },
            {
                $project: {
                    gameId: 1,
                    points: 1,
                    rebounds: { $add: ["$offensiveRebounds", "$defensiveRebounds"] },
                    assists: 1,
                    steals: 1,
                    blocks: 1,
                    turnovers: 1,
                    fouls: 1,
                    plusMinus: 1
                }
            },
            {
                $lookup: {
                    from: "games",
                    localField: "gameId",
                    foreignField: "_id",
                    as: "gameDetails"
                }
            },
            { $unwind: "$gameDetails" },
            {
                $project: {
                    points: 1,
                    rebounds: 1,
                    assists: 1,
                    steals: 1,
                    blocks: 1,
                    turnovers: 1,
                    fouls: 1,
                    plusMinus: 1,
                    gameDate: "$gameDetails.gameDate",
                    opponent: "$gameDetails.opponent",
                    result: "$gameDetails.result"
                }
            },
            { $sort: { gameDate: -1 } }
        ]);

        res.status(200).json({
            success: true,
            message: "Player performance for season retrieved successfully.",
            data: performanceStats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error retrieving player performance for season.",
            error: error.message
        });
    }
};


// Get player PER (Player Efficiency Rating) for a specific season (requires additional fields in Game model to filter by season)
// Note: PER calculation is complex and typically requires league averages, so this is a simplified version for demonstration purposes.
exports.getPlayerPERBySeason = async (req, res) => {
    try {
        const { playerId, season } = req.params;

        // Find all game IDs for the season
        const games = await Game.find({ season }, { _id: 1 });
        const gameIds = games.map(game => game._id);

        if (gameIds.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No games found for this season.",
                data: {}
            });
        }

        // Aggregate stats needed for PER calculation
        const stats = await GameStats.aggregate([
            { $match: { playerId: mongoose.Types.ObjectId(playerId), gameId: { $in: gameIds } } },
            {
                $lookup: {
                    from: "players",
                    localField: "playerId",
                    foreignField: "_id",
                    as: "playerDetails"
                }
            },
            { $unwind: "$playerDetails" },
            {
                $group: {
                    _id: "$playerId",
                    playerName: { $first: "$playerDetails.fullName" },
                    jerseyNumber: { $first: "$playerDetails.jerseyNumber" },
                    position: { $first: "$playerDetails.position" },
                    totalPoints: { $sum: "$points" },
                    totalRebounds: { $sum: { $add: ["$offensiveRebounds", "$defensiveRebounds"] } },
                    totalAssists: { $sum: "$assists" },
                    totalSteals: { $sum: "$steals" },
                    totalBlocks: { $sum: "$blocks" },
                    totalTurnovers: { $sum: "$turnovers" },
                    totalFouls: { $sum: "$fouls" },
                    totalMinutesPlayed: { $sum: "$minutesPlayed" },
                    gamesPlayed: { $sum: 1 }
                }
            }
        ]);

        if (stats.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No stats found for this player in this season.",
                data: {}
            });
        }

        const playerStats = stats[0];

        // Simplified PER calculation (not using league averages or pace adjustment)
        const PER = ((playerStats.totalPoints + playerStats.totalRebounds + playerStats.totalAssists + playerStats.totalSteals + playerStats.totalBlocks) - (playerStats.totalTurnovers + playerStats.totalFouls)) / playerStats.gamesPlayed;

        res.status(200).json({
            success: true,
            message: "Player PER for season retrieved successfully.",
            data: {
                PER,
                ...playerStats
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error retrieving player PER for season.",
            error: error.message
        });
    }
};


// Get player PER (Player Efficiency Rating) for a game (requires additional fields in Game model to filter by game)
exports.getPlayerPERByGameId = async (req, res) => {
    try {
        const { playerId, gameId } = req.params;

        // Aggregate stats needed for PER calculation
        const stats = await GameStats.aggregate([
            { $match: { playerId: mongoose.Types.ObjectId(playerId), gameId: mongoose.Types.ObjectId(gameId) } },
            {
                $lookup: {
                    from: "players",
                    localField: "playerId",
                    foreignField: "_id",
                    as: "playerDetails"
                }
            },
            { $unwind: "$playerDetails" },
            {
                $project: {
                    playerName: "$playerDetails.fullName",
                    jerseyNumber: "$playerDetails.jerseyNumber",
                    position: "$playerDetails.position",
                    points: 1,
                    rebounds: { $add: ["$offensiveRebounds", "$defensiveRebounds"] },
                    assists: 1,
                    steals: 1,
                    blocks: 1,
                    turnovers: 1,
                    fouls: 1,
                    minutesPlayed: 1
                }
            }
        ]);

        if (stats.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No stats found for this player in this game.",
                data: {}
            });
        }

        const playerStats = stats[0];

        // Simplified PER calculation (not using league averages or pace adjustment)
        const PER = ((playerStats.points + playerStats.rebounds + playerStats.assists + playerStats.steals + playerStats.blocks) - (playerStats.turnovers + playerStats.fouls)) / (playerStats.minutesPlayed / 48); // Assuming 48 minutes per game

        res.status(200).json({
            success: true,
            message: "Player PER for game retrieved successfully.",
            data: {
                PER,
                ...playerStats
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error retrieving player PER for game.",
            error: error.message
        });
    }
};

