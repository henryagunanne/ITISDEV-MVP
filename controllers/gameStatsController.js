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

        const updatedStats = await GameStats.findById(id);
        
        if (!updatedStats) {
            return res.status(404).json({
                success: false,
                message: "Game stats not found."
            });
        }

        Object.assign(updatedStats, updateData);    // Update the document with new data

        await updatedStats.save();

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



// This endpoint generates a full box score for a specific game, including player stats.
exports.getGameBoxScore = async (req, res) => {
    try {
        const gameId = req.params.gameId;

        const boxScore = await GameStats.aggregate([
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
                    minutesPlayed: "$totals.minutesPlayed",
                    points: "$totals.points",
                    fieldGoalsMade: "$totals.fieldGoalsMade",
                    fieldGoalsAttempted: "$totals.fieldGoalsAttempted",
                    threePointersMade: "$totals.threePointersMade",
                    threePointersAttempted: "$totals.threePointersAttempted",
                    freeThrowsMade: "$totals.freeThrowsMade",
                    freeThrowsAttempted: "$totals.freeThrowsAttempted",
                    offensiveRebounds: "$totals.offensiveRebounds",
                    defensiveRebounds: "$totals.defensiveRebounds",
                    assists: "$totals.assists",
                    steals: "$totals.steals",
                    blocks: "$totals.blocks",
                    turnovers: "$totals.turnovers",
                    fouls: "$totals.fouls",
                    plusMinus: "$totals.plusMinus",
                    totalRebounds: { $add: ["$totals.offensiveRebounds", "$totals.defensiveRebounds"] },
                    FGPercentage: {
                        $cond: [
                            { $eq: ["$totals.fieldGoalsAttempted", 0] },
                            0,
                            { $multiply: [{ $divide: ["$totals.fieldGoalsMade", "$totals.fieldGoalsAttempted"] }, 100] }
                        ]
                    },
                    threePointPercentage: {
                        $cond: [
                            { $eq: ["$totals.threePointersAttempted", 0] },
                            0,
                            { $multiply: [{ $divide: ["$totals.threePointersMade", "$totals.threePointersAttempted"] }, 100] }
                        ]
                    },
                    freeThrowPercentage: {
                        $cond: [
                            { $eq: ["$totals.freeThrowsAttempted", 0] },
                            0,
                            { $multiply: [{ $divide: ["$totals.freeThrowsMade", "$totals.freeThrowsAttempted"] }, 100] }
                        ]
                    }
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
                    totalPoints: { $sum: "$totals.points" },
                    averagePoints: { $avg: "$totals.points" },
                    totalRebounds: { $sum: { $add: ["$totals.offensiveRebounds", "$totals.defensiveRebounds"] } },
                    averageRebounds: { $avg: { $add: ["$totals.offensiveRebounds", "$totals.defensiveRebounds"] } },

                    totalOffensiveRebounds: { $sum: "$totals.offensiveRebounds" },
                    averageOffensiveRebounds: { $avg: "$totals.offensiveRebounds" },
                    totalDefensiveRebounds: { $sum: "$totals.defensiveRebounds" },
                    averageDefensiveRebounds: { $avg: "$totals.defensiveRebounds" },

                    averageMinutesPlayed: { $avg: "$totals.minutesPlayed" },

                    averageFTM: { $avg: "$totals.freeThrowsMade" },
                    averageFTA: { $avg: "$totals.freeThrowsAttempted" },
                    totalFTM: { $sum: "$totals.freeThrowsMade" },
                    totalFTA: { $sum: "$totals.freeThrowsAttempted" },
                    FTPercentage: { 
                        $cond: [
                            { $eq: ["$totals.freeThrowsAttempted", 0] }, 
                            0, 
                            { $multiply: [{ $divide: ["$totals.freeThrowsMade", "$totals.freeThrowsAttempted"] }, 100] }
                        ] 
                    },

                    averageFGM: { $avg: "$totals.fieldGoalsMade" },
                    averageFGA: { $avg: "$totals.fieldGoalsAttempted" },
                    totalFGM: { $sum: "$totals.fieldGoalsMade" },
                    totalFGA: { $sum: "$totals.fieldGoalsAttempted" },
                    FGPercentage: { 
                        $cond: [
                            { $eq: ["$totals.fieldGoalsAttempted", 0] }, 
                            0, 
                            { $multiply: [{ $divide: ["$totals.fieldGoalsMade", "$totals.fieldGoalsAttempted"] }, 100] }
                        ] 
                    },

                    average3PM: { $avg: "$totals.threePointersMade" },
                    average3PA: { $avg: "$totals.threePointersAttempted" },
                    total3PM: { $sum: "$totals.threePointersMade" },
                    total3PA: { $sum: "$totals.threePointersAttempted" },
                    threePointPercentage: { 
                        $cond: [
                            { $eq: ["$totals.threePointersAttempted", 0] }, 
                            0, 
                            { $multiply: [{ $divide: ["$totals.threePointersMade", "$totals.threePointersAttempted"] }, 100] }
                        ] 
                    },

                    totalAssists: { $sum: "$totals.assists" },
                    averageAssists: { $avg: "$totals.assists" },
                    totalSteals: { $sum: "$totals.steals" },
                    averageSteals: { $avg: "$totals.steals" },
                    totalBlocks: { $sum: "$totals.blocks" },
                    averageBlocks: { $avg: "$totals.blocks" },
                    totalTurnovers: { $sum: "$totals.turnovers" },
                    averageTurnovers: { $avg: "$totals.turnovers" },
                    averageFouls: { $avg: "$totals.fouls" },
                    averagePlusMinus: { $avg: "$totals.plusMinus" }
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
                    totalPoints: { $sum: "$totals.points" },
                    averagePoints: { $avg: "$totals.points" },
                    totalRebounds: { $sum: { $add: ["$totals.offensiveRebounds", "$totals.defensiveRebounds"] } },
                    totalOffensiveRebounds: { $sum: "$totals.offensiveRebounds" },
                    totalDefensiveRebounds: { $sum: "$totals.defensiveRebounds" },
                    averageRebounds: { $avg: { $add: ["$totals.offensiveRebounds", "$totals.defensiveRebounds"] } },
                    totalAssists: { $sum: "$totals.assists" },
                    averageAssists: { $avg: "$totals.assists" },
                    totalSteals: { $sum: "$totals.steals" },
                    averageSteals: { $avg: "$totals.steals" },
                    totalBlocks: { $sum: "$totals.blocks" },
                    averageBlocks: { $avg: "$totals.blocks" },
                    totalTurnovers: { $sum: "$totals.turnovers" },
                    totalFouls: { $sum: "$totals.fouls" },
                    totalFTMs: { $sum: "$totals.freeThrowsMade" },
                    totalFTAs: { $sum: "$totals.freeThrowsAttempted" },
                    total3PA: { $sum: "$totals.threePointersAttempted" },
                    total3PM: { $sum: "$totals.threePointersMade" },
                    totalFGAs: { $sum: "$totals.fieldGoalsAttempted" },
                    totalFGMs: { $sum: "$totals.fieldGoalsMade" },
                    averageMinutesPlayed: { $avg: "$totals.minutesPlayed" },
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
                    totalPoints: { $sum: "$totals.points" },
                    averagePoints: { $avg: "$totals.points" },
                    totalRebounds: { $sum: { $add: ["$totals.offensiveRebounds", "$totals.defensiveRebounds"] } },
                    averageRebounds: { $avg: { $add: ["$totals.offensiveRebounds", "$totals.defensiveRebounds"] } },
                    totalAssists: { $sum: "$totals.assists" },
                    averageAssists: { $avg: "$totals.assists" },
                    totalSteals: { $sum: "$totals.steals" },
                    averageSteals: { $avg: "$totals.steals" },
                    totalBlocks: { $sum: "$totals.blocks" },
                    averageBlocks: { $avg: "$totals.blocks" },
                    totalTurnovers: { $sum: "$totals.turnovers" },
                    averageTurnovers: { $avg: "$totals.turnovers" },
                    averageFouls: { $avg: "$totals.fouls" },
                    averagePlusMinus: { $avg: "$totals.plusMinus" },
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
                    totalPoints: { $sum: "$totals.points" },
                    averagePoints: { $avg: "$totals.points" },
                    totalRebounds: { $sum: { $add: ["$totals.offensiveRebounds", "$totals.defensiveRebounds"] } },
                    averageRebounds: { $avg: { $add: ["$totals.offensiveRebounds", "$totals.defensiveRebounds"] } },
                    totalAssists: { $sum: "$totals.assists" },
                    averageAssists: { $avg: "$totals.assists" },
                    totalSteals: { $sum: "$totals.steals" },
                    averageSteals: { $avg: "$totals.steals" },
                    totalBlocks: { $sum: "$totals.blocks" },
                    averageBlocks: { $avg: "$totals.blocks" },
                    totalTurnovers: { $sum: "$totals.turnovers" },
                    averageTurnovers: { $avg: "$totals.turnovers" },
                    averageFouls: { $avg: "$totals.fouls" },
                    averagePlusMinus: { $avg: "$totals.plusMinus" },
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
                    totalPoints: { $sum: "$totals.points" },
                    averagePoints: { $avg: "$totals.points" },
                    totalRebounds: { $sum: { $add: ["$totals.offensiveRebounds", "$totals.defensiveRebounds"] } },
                    averageRebounds: { $avg: { $add: ["$totals.offensiveRebounds", "$totals.defensiveRebounds"] } },
                    totalAssists: { $sum: "$totals.assists" },
                    averageAssists: { $avg: "$totals.assists" },
                    totalSteals: { $sum: "$totals.steals" },
                    averageSteals: { $avg: "$totals.steals" },
                    totalBlocks: { $sum: "$totals.blocks" },
                    averageBlocks: { $avg: "$totals.blocks" },
                    totalTurnovers: { $sum: "$totals.turnovers" },
                    averageTurnovers: { $avg: "$totals.turnovers" },
                    averageFouls: { $avg: "$totals.fouls" },
                    averagePlusMinus: { $avg: "$totals.plusMinus" },
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


// Get top scorers in a specific season
exports.getTopScorersBySeason = async (req, res) => {
    try {
        const { season, limit = 10 } = req.params;
        const games = await Game.find({ season }, { _id: 1 });
        const gameIds = games.map(game => game._id);

        if (gameIds.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No games found for this season.",
                data: []
            });
        }

        const topScorers = await GameStats.aggregate([
            { $match: { gameId: { $in: gameIds } } },
            {
                $group: {
                    _id: "$playerId",
                    totalPoints: { $sum: "$totals.points" },
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

// Get top rebounders in a specific season
exports.getTopReboundersBySeason = async (req, res) => {
    try {
        const { season, limit = 10 } = req.params;
        const games = await Game.find({ season }, { _id: 1 });
        const gameIds = games.map(game => game._id);

        if (gameIds.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No games found for this season.",
                data: []
            });
        }

        const topRebounders = await GameStats.aggregate([
            { $match: { gameId: { $in: gameIds } } },
            {
                $group: {
                    _id: "$playerId",
                    totalRebounds: { $sum: { $add: ["$totals.offensiveRebounds", "$totals.defensiveRebounds"] } },
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

// Get top assist leaders in a specific season
exports.getTopAssistLeadersBySeason = async (req, res) => {
    try {
        const { season, limit = 10 } = req.params;
        const games = await Game.find({ season }, { _id: 1 });
        const gameIds = games.map(game => game._id);

        if (gameIds.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No games found for this season.",
                data: []
            });
        }

        const topAssistLeaders = await GameStats.aggregate([
            { $match: { gameId: { $in: gameIds } } },
            {
                $group: {
                    _id: "$playerId",
                    totalAssists: { $sum: "$totals.assists" },
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
                    points: "$totals.points",
                    rebounds: { $add: ["$totals.offensiveRebounds", "$totals.defensiveRebounds"] },
                    assists: "$totals.assists",
                    steals: "$totals.steals",
                    blocks: "$totals.blocks",
                    turnovers: "$totals.turnovers",
                    fouls: "$totals.fouls",
                    plusMinus: "$totals.plusMinus",
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
                    points: "$totals.points",
                    rebounds: { $add: ["$totals.offensiveRebounds", "$totals.defensiveRebounds"] },
                    assists: "$totals.assists",
                    steals: "$totals.steals",
                    blocks: "$totals.blocks",
                    turnovers: "$totals.turnovers",
                    fouls: "$totals.fouls",
                    plusMinus: "$totals.plusMinus"
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
                    totalPoints: { $sum: "$totals.points" },
                    totalRebounds: { $sum: { $add: ["$totals.offensiveRebounds", "$totals.defensiveRebounds"] } },
                    totalAssists: { $sum: "$totals.assists" },
                    totalSteals: { $sum: "$totals.steals" },
                    totalBlocks: { $sum: "$totals.blocks" },
                    totalTurnovers: { $sum: "$totals.turnovers" },
                    totalFouls: { $sum: "$totals.fouls" },
                    totalMinutesPlayed: { $sum: "$totals.minutesPlayed" },
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
                    points: "$totals.points",
                    rebounds: { $add: ["$totals.offensiveRebounds", "$totals.defensiveRebounds"] },
                    assists: "$totals.assists",
                    steals: "$totals.steals",
                    blocks: "$totals.blocks",
                    turnovers: "$totals.turnovers",
                    fouls: "$totals.fouls",
                    minutesPlayed: "$totals.minutesPlayed"
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


