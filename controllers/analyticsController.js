const mongoose = require('mongoose');
const Game = require('../models/Game');
const GameStats = require('../models/GameStats');
const Player = require("../models/Player");
// const OpenAI = require("openai");
//const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

// Get player performance in a specific quarter
exports.getPlayerPerformanceByQuarter = async (req, res) => {
    try {
        const { playerId, gameId, quarter } = req.params;   // front-end should send quarter as q1, q2, q3, q4 or overtimes**

        const performanceStats = await GameStats.aggregate([
            { $match: { playerId: mongoose.Types.ObjectId(playerId), gameId: mongoose.Types.ObjectId(gameId) } },
            {
                $project: {
                    points: `$periodStats.${quarter}.points`,
                    rebounds: { $add: [`$periodStats.${quarter}.offensiveRebounds`, `$periodStats.${quarter}.defensiveRebounds`] },
                    assists: `$periodStats.${quarter}.assists`,
                    steals: `$periodStats.${quarter}.steals`,
                    blocks: `$periodStats.${quarter}.blocks`,
                    turnovers: `$periodStats.${quarter}.turnovers`,
                    fouls: `$periodStats.${quarter}.fouls`,
                    plusMinus: `$periodStats.${quarter}.plusMinus`
                }
            }
        ]);

        if (performanceStats.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No stats found for this player in this quarter.",
                data: {}
            });
        }

        res.status(200).json({
            success: true,
            message: "Player performance for quarter retrieved successfully.",
            data: performanceStats[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error retrieving player performance for quarter.",
            error: error.message
        });
    }
};


// Get player performance in a specific half (combines q1+q2 for first half, q3+q4 for second half)
exports.getPlayerPerformanceByHalf = async (req, res) => {
    try {
        const { playerId, gameId, half } = req.params;   // front-end should send half as first or second

        // check that the playerId and gameId are valid ObjectIds
        if (!mongoose.Types.ObjectId.isValid(playerId) || !mongoose.Types.ObjectId.isValid(gameId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid playerId or gameId. Must be a valid ObjectId.",
                data: {}
            });
        }

        if (half !== 'first' && half !== 'second') {
            return res.status(400).json({
                success: false,
                message: "Invalid half parameter. Must be 'first' or 'second'.",
                data: {}
            });
        }

        const quarters = half === 'first' ? ['q1', 'q2'] : ['q3', 'q4'];

        const performanceStats = await GameStats.aggregate([
            { $match: { playerId: mongoose.Types.ObjectId(playerId), gameId: mongoose.Types.ObjectId(gameId) } },
            {
                $project: {
                    points: { $add: [`$periodStats.${quarters[0]}.points`, `$periodStats.${quarters[1]}.points`] },
                    rebounds: { $add: [
                        { $add: [`$periodStats.${quarters[0]}.offensiveRebounds`, `$periodStats.${quarters[0]}.defensiveRebounds`] },
                        { $add: [`$periodStats.${quarters[1]}.offensiveRebounds`, `$periodStats.${quarters[1]}.defensiveRebounds`] }
                    ] },
                    assists: { $add: [`$periodStats.${quarters[0]}.assists`, `$periodStats.${quarters[1]}.assists`] },
                    steals: { $add: [`$periodStats.${quarters[0]}.steals`, `$periodStats.${quarters[1]}.steals`] },
                    blocks: { $add: [`$periodStats.${quarters[0]}.blocks`, `$periodStats.${quarters[1]}.blocks`] },
                    turnovers: { $add: [`$periodStats.${quarters[0]}.turnovers`, `$periodStats.${quarters[1]}.turnovers`] },
                    fouls: { $add: [`$periodStats.${quarters[0]}.fouls`, `$periodStats.${quarters[1]}.fouls`] },
                    plusMinus: { $add: [`$periodStats.${quarters[0]}.plusMinus`, `$periodStats.${quarters[1]}.plusMinus`] }
                }
            }
        ]);

        if (performanceStats.length === 0) {
            return res.status(200).json({
                success: true,
                message: "No stats found for this player in this half.",
                data: {}
            });
        }

        res.status(200).json({
            success: true,
            message: "Players performance for half retrieved successfully.",
            data: performanceStats[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error retrieving player performance for half.",
            error: error.message
        });
    }
};

// Get performance for all players in a game by specific quarter (for coaches to analyze which players perform better in which quarters)
exports.getPerformanceByQuarterForAllPlayers = async (req, res) => {
    try {
        const { gameId, quarter } = req.params;   // front-end should send quarter as q1, q2, q3, q4

        const performanceStats = await GameStats.aggregate([
            { $match: { gameId: mongoose.Types.ObjectId(gameId) } },
            {
                $project: {
                    playerId: 1,
                    points: `$periodStats.${quarter}.points`,
                    rebounds: { $add: [`$periodStats.${quarter}.offensiveRebounds`, `$periodStats.${quarter}.defensiveRebounds`] },
                    assists: `$periodStats.${quarter}.assists`,
                    steals: `$periodStats.${quarter}.steals`,
                    blocks: `$periodStats.${quarter}.blocks`,
                    turnovers: `$periodStats.${quarter}.turnovers`,
                    fouls: `$periodStats.${quarter}.fouls`,
                    plusMinus: `$periodStats.${quarter}.plusMinus`
                }
            },
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
                    playerId: 1,
                    fullName: "$playerDetails.fullName",
                    jerseyNumber: "$playerDetails.jerseyNumber",
                    position: "$playerDetails.position",
                    points: 1,
                    rebounds: 1,
                    assists: 1,
                    steals: 1,
                    blocks: 1,
                    turnovers: 1,
                    fouls: 1,
                    plusMinus: 1
                }
            },
            { $sort: { jerseyNumber: 1 } }
        ]);

        res.status(200).json({
            success: true,
            message: "Performance for all players in quarter retrieved successfully.",
            gameId,
            data: performanceStats
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error retrieving performance for all players in quarter.",
            error: error.message
        });
    }
};


// Get performance for all players in a game by specific half (for coaches to analyze which players perform better in which halves)
exports.getPerformanceByHalfForAllPlayers = async (req, res) => {
    try {
        const { gameId, half } = req.params;   // front-end should send half as first or second

        if (half !== 'first' && half !== 'second') {
            return res.status(400).json({
                success: false,
                message: "Invalid half parameter. Must be 'first' or 'second'.",
                data: []
            });
        }

        const quarters = half === 'first' ? ['q1', 'q2'] : ['q3', 'q4'];

        const performanceStats = await GameStats.aggregate([
            { $match: { gameId: mongoose.Types.ObjectId(gameId) } },
            {
                $project: {
                    playerId: 1,
                    points: { $add: [`$periodStats.${quarters[0]}.points`, `$periodStats.${quarters[1]}.points`] },
                    rebounds: { $add: [
                        { $add: [`$periodStats.${quarters[0]}.offensiveRebounds`, `$periodStats.${quarters[0]}.defensiveRebounds`] },
                        { $add: [`$periodStats.${quarters[1]}.offensiveRebounds`, `$periodStats.${quarters[1]}.defensiveRebounds`] }
                    ] },
                    assists: { $add: [`$periodStats.${quarters[0]}.assists`, `$periodStats.${quarters[1]}.assists`] },
                    steals: { $add: [`$periodStats.${quarters[0]}.steals`, `$periodStats.${quarters[1]}.steals`] },
                    blocks: { $add: [`$periodStats.${quarters[0]}.blocks`, `$periodStats.${quarters[1]}.blocks`] },
                    turnovers: { $add: [`$periodStats.${quarters[0]}.turnovers`, `$periodStats.${quarters[1]}.turnovers`] },
                    fouls: { $add: [`$periodStats.${quarters[0]}.fouls`, `$periodStats.${quarters[1]}.fouls`] },
                    plusMinus: { $add: [`$periodStats.${quarters[0]}.plusMinus`, `$periodStats.${quarters[1]}.plusMinus`] }
                }
            },
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
                    playerId: 1,
                    fullName: "$playerDetails.fullName",
                    jerseyNumber: "$playerDetails.jerseyNumber",
                    position: "$playerDetails.position",
                    points: 1,
                    rebounds: 1,
                    assists: 1,
                    steals: 1,
                    blocks: 1,
                    turnovers: 1,
                    fouls: 1,
                    plusMinus: 1
                }
            },
            { $sort: { jerseyNumber: 1 } }
        ]);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Error retrieving performance for all players in half.",
            error: error.message
        });
    }
};


// NOTE: **Since overtimes are stored as arrays of player stats unlike q1 - q4 which are objects, we need a separate endpoint to get performance for all players in overtimes
// Also average points is not the same as ppg since a player may not score in a particular game
// Find ways to optimize the analytics endpoints since some of them may be computationally expensive (especially the ones that require lookups and grouping) 
// - maybe we can pre-aggregate some stats and store them in a separate collection for faster retrieval? This would require additional logic to update the pre-aggregated stats whenever new game stats are added or updated.




// Helper for total summaries for reports page
async function computeReportSummary(filters) {
    const { season, opponent, startDate, endDate } = filters;

        let gameFilter = {};

        // FILTERS
        if (season) {
            const Tournament = require('../models/Tournament');
            const t = await Tournament.findOne({ name: season });
            if (t) gameFilter.tournament = t._id;
        }

        if (opponent) {
            gameFilter.opponent = { $regex: opponent, $options: "i" };
        }

        if (startDate || endDate) {
            gameFilter.gameDate = {};
            if (startDate) gameFilter.gameDate.$gte = new Date(startDate);
            if (endDate) gameFilter.gameDate.$lte = new Date(endDate);
        }

        // FILTERED GAMES
        const games = await Game.find(gameFilter)
            .sort({ gameDate: 1 }) // ascending
            .lean();

        const gameIds = games.map(g => g._id);

        // FILTERED STATS
        const stats = await GameStats.find({ gameId: { $in: gameIds } });
    
        // =====================
        // COMPUTATIONS
        // =====================
        const totalGames = games.length;
        const wins = games.filter(g => g.result === 'Win').length;
        const losses = games.filter(g => g.result === 'Loss').length;

        const totalPoints = stats.reduce((sum, s) => sum + (s.totals?.points || 0), 0);

        const avgPoints = totalGames ? totalPoints / totalGames : 0;

        const efficiency = stats.length
            ? stats.reduce((sum, s) => {
                const t = s.totals || {};
                const rebounds = (t.offensiveRebounds || 0) + (t.defensiveRebounds || 0);

                return sum + (
                    (t.points || 0) +
                    rebounds +
                    (t.assists || 0) -
                    (t.turnovers || 0)
                );
            }, 0) / stats.length
            : 0;

        // CHART DATA
        const gameTrend = games.map(g => ({
            date: g.gameDate,
            opponent: g.opponent,
            points: g.teamScore,
            opponentPoints: g.opponentScore,
            result: g.teamScore > g.opponentScore ? "W" : "L"
        }));

        return {
            totalGames,
            wins,
            losses,
            winRate: totalGames ? (wins / totalGames) * 100 : 0,
            avgPoints,
            efficiency,
            games: gameTrend   // USED IN CHARTS DISPLAY
        };
}

// Helper function for player summaries
async function getPlayerSummaryData(filters = {}) {
    const { season, opponent, startDate, endDate } = filters;

    // =========================
    // BUILD MATCH FILTER
    // =========================
    let matchStage = {
        playerId: { $ne: null }
    };

    // HANDLE TOURNAMENT (season dropdown)
    if (season) {
        const Tournament = require('../models/Tournament');
        const t = await Tournament.findOne({ name: season });
        if (t) {
            matchStage["game.tournament"] = t._id;
        }
    }

    // OPPONENT FILTER
    if (opponent) {
        matchStage["game.opponent"] = { $regex: opponent, $options: "i" };
    }

    // DATE RANGE FILTER
    if (startDate || endDate) {
        matchStage["game.gameDate"] = {};
        if (startDate) matchStage["game.gameDate"].$gte = new Date(startDate);
        if (endDate) matchStage["game.gameDate"].$lte = new Date(endDate);
    }

    // SORT BY BEST PLAYERS (DEFAULT: PPG)
    const sortBy = filters.sortBy || "ppg";

    let sortStage = {};

    // 🔥 VALIDATE FIELD (prevents errors)
    const validFields = ["ppg", "rpg", "apg", "efficiency", "tsPercentage"];

    if (validFields.includes(sortBy)) {
        sortStage[sortBy] = -1;
    } else {
        sortStage["ppg"] = -1;
    }


    // =========================
    // AGGREGATION PIPELINE
    // =========================
    const players = await GameStats.aggregate([

        // JOIN GAME DATA (for filters)
        {
            $lookup: {
                from: "games",
                localField: "gameId",
                foreignField: "_id",
                as: "game"
            }
        },
        { $unwind: "$game" },

        // APPLY FILTERS
        { $match: matchStage },

        // =========================
        // GROUP PLAYER STATS
        // =========================
        {
            $group: {
                _id: "$playerId",

                gamesPlayed: { $sum: 1 },

                // BASIC
                totalPoints: { $sum: "$totals.points" },
                totalRebounds: {
                    $sum: {
                        $add: [
                            "$totals.offensiveRebounds",
                            "$totals.defensiveRebounds"
                        ]
                    }
                },
                totalAssists: { $sum: "$totals.assists" },

                totalFGA: { $sum: "$totals.fieldGoalsAttempted" },
                totalFTA: { $sum: "$totals.freeThrowsAttempted" },
                totalTurnovers: { $sum: "$totals.turnovers" },

                totalSteals: { $sum: { $ifNull: ["$totals.steals", 0] } },
                totalBlocks: { $sum: { $ifNull: ["$totals.blocks", 0] } }
            }
        },

        // =========================
        // COMPUTE ADVANCED METRICS
        // =========================
        {
            $project: {
                _id: 0,
                playerId: "$_id",

                // PER GAME STATS
                ppg: {
                    $cond: [
                        { $eq: ["$gamesPlayed", 0] },
                        0,
                        { $divide: ["$totalPoints", "$gamesPlayed"] }
                    ]
                },

                rpg: {
                    $cond: [
                        { $eq: ["$gamesPlayed", 0] },
                        0,
                        { $divide: ["$totalRebounds", "$gamesPlayed"] }
                    ]
                },

                apg: {
                    $cond: [
                        { $eq: ["$gamesPlayed", 0] },
                        0,
                        { $divide: ["$totalAssists", "$gamesPlayed"] }
                    ]
                },

                // TRUE SHOOTING %
                tsPercentage: {
                    $cond: [
                        {
                            $gt: [
                                {
                                    $add: [
                                        "$totalFGA",
                                        "$totalFTA"
                                    ]
                                },
                                0
                            ]
                        },
                        {
                            $divide: [
                                "$totalPoints",
                                {
                                    $multiply: [
                                        2,
                                        {
                                            $add: [
                                                "$totalFGA",
                                                { $multiply: [0.44, "$totalFTA"] }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },
                        0
                    ]
                },

                // EFFICIENCY
                efficiency: {
                    $subtract: [
                        {
                            $add: [
                                "$totalPoints",
                                "$totalRebounds",
                                "$totalAssists",
                                "$totalSteals",
                                "$totalBlocks"
                            ]
                        },
                        {
                            $add: [
                                "$totalTurnovers",
                                "$totalFGA" // missed shots proxy
                            ]
                        }
                    ]
                },

                // USAGE (SIMPLIFIED)
                usageRate: {
                    $add: [
                        "$totalFGA",
                        "$totalFTA",
                        "$totalTurnovers"
                    ]
                }
            }
        },

        // =========================
        // JOIN PLAYER INFO
        // =========================
        {
            $lookup: {
                from: "players",
                localField: "playerId",
                foreignField: "_id",
                as: "player"
            }
        },
        { $unwind: "$player" },

        // =========================
        // FINAL OUTPUT
        // =========================
        {
            $project: {
                name: {
                    $concat: [
                        { $ifNull: ["$player.firstName", ""] },
                        " ",
                        { $ifNull: ["$player.lastName", ""] }
                    ]
                },

                ppg: { $round: ["$ppg", 1] },
                rpg: { $round: ["$rpg", 1] },
                apg: { $round: ["$apg", 1] },

                tsPercentage: { $round: [{ $multiply: ["$tsPercentage", 100] }, 1] },
                efficiency: { $round: ["$efficiency", 1] },
                usageRate: { $round: ["$usageRate", 1] }
            }
        },

        { $sort: sortStage }

    ]);

    return players;
}


// Get reports summary for reports page
exports.reportSummary = async (req, res) => {
    try{
        const data = await computeReportSummary(req.query);
        res.json(data);
        
    } catch (err) {
        res.status(500).message("Error fetching summary");
        console.error("Error:", err.message);
    }
};



// player reports summary for the reports and analytics page
exports.reportPlayerSummary = async (req, res) => {
    try {
        const players = await getPlayerSummaryData(req.query);
        res.json(players);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error fetching player summary" });
    }
};



// Game summaries
exports.getGameSummaries = async (req, res) => {
    const game = await Game.findById(req.params.id);
    const stats = await GameStats.find({ game: game._id });
  
    res.json({
      opponent: game.opponent,
      score: game.teamScore + " - " + game.opponentScore,
      topPlayer: stats.sort((a,b) => b.totals.points - a.totals.points)[0]
    });
};


// fallback funtion to generate insights if AI fails
function generateFallbackInsights(summary, players) {
    let insights = [];

    if (summary.winRate < 50) {
        insights.push("Team is underperforming. Focus on defense and shot selection.");
    } else {
        insights.push("Team is performing well with a solid win rate.");
    }

    const topPlayer = players[0];
    if (topPlayer) {
        insights.push(`${topPlayer.name} is leading with ${topPlayer.ppg} PPG.`);
    }

    const inefficient = players.find(p => p.tsPercentage < 50);
    if (inefficient) {
        insights.push(`${inefficient.name} has low shooting efficiency.`);
    }

    return insights.join(" ");
}

// Generate AI insights with OpenAI
exports.getAIInsights = async (req, res) => {
    try {
        const { season } = req.query;
    
        // 1. RETRIEVE DATA
        const summary = await computeReportSummary({ season });
        const players = await getPlayerSummaryData({ season });
    
        // 2. BUILD CONTEXT
        const context = `
        Team Performance:
        - Games: ${summary.totalGames}
        - Win Rate: ${summary.winRate.toFixed(1)}%
        - Avg Points: ${summary.avgPoints.toFixed(1)}
    
        Top Players:
        ${players.slice(0,5).map(p =>
            `${p.name}: ${p.ppg} PPG, ${p.rpg} RPG, TS% ${p.tsPercentage}`
        ).join("\n")}
        `;
    
        // 3. GENERATE INSIGHT USING LLM
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash"
        });
        
        let insights = "";
        
        try {
            const result = await model.generateContent(`
                You are a basketball analyst.
                
                Analyze the season data and provide:
                - Team performance insights
                - Key player observations
                - Recommendations
                
                DATA:
                ${context}
            `);
        
            insights = result.response.text();
        
        } catch (aiError) {
            console.error("Gemini failed:", aiError.message);
            insights = generateFallbackInsights(summary, players);
        }

        res.json({ insights });
  
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to generate insights" });
    }
};


// Export CSV reports
exports.exportCSV = async (req, res) => {
    const stats = await GameStats.find().populate('playerId', 'firstName lastName');
  
    let csv = "Player,Points,Rebounds,Assists\n";
  
    stats.forEach(s => {
        const t = s.totals || {};
        const rebounds = (t.offensiveRebounds || 0) + (t.defensiveRebounds || 0);
        csv += `${s.playerId?.firstName} ${s.playerId?.lastName},${t.points},${rebounds},${t.assists}\n`;
    });
  
    res.header('Content-Type', 'text/csv');
    res.attachment('report.csv');
    res.send(csv);
};


// Export PDF reports
const PDFDocument = require('pdfkit');
exports.exportPDF =  async (req, res) => {
  const doc = new PDFDocument();

  res.setHeader('Content-Type', 'application/pdf');
  doc.pipe(res);

  doc.text("Team Performance Report");

  doc.end();
};


// Unified endpoint for dashboard
exports.getDashboardData = async (req, res) => {
    try {
        const { season } = req.query;
        let matchStage = {};
        
        if (season) {
            // season query parameter actually corresponds to Tournament name (e.g. "UAAP Season 87")
            const Tournament = require('../models/Tournament');
            const tournamentDoc = await Tournament.findOne({ name: season });
            if (tournamentDoc) {
                matchStage.tournament = tournamentDoc._id;
            } else {
                // If the user selected a season that doesn't exist, we should return empty data
                return res.json({
                    success: true,
                    gamesPlayed: 0,
                    avgPoints: 0,
                    avgRebounds: 0,
                    avgAssists: 0,
                    avgTurnovers: 0,
                    fgPercentage: 0,
                    threePtPercentage: 0,
                    ftPercentage: 0,
                    record: { wins: 0, losses: 0 },
                    perGameScoring: [],
                    leaders: { topScorers: [], topRebounders: [], topAssists: [] }
                });
            }
        }

        // Get games matching the season
        const games = await Game.find(matchStage).sort({ gameDate: 1 }).lean();
        const gameIds = games.map(g => g._id);

        let wins = 0;
        let losses = 0;
        let perGameScoring = [];

        games.forEach(game => {
            if (game.result === 'Win') wins++;
            else if (game.result === 'Loss') losses++;
            if (game.teamScore || game.opponentScore) {
                perGameScoring.push({
                    opponent: game.opponent,
                    teamScore: game.teamScore || 0,
                    opponentScore: game.opponentScore || 0
                });
            }
        });

        // Get aggregated stats
        const aggregatedStats = await GameStats.aggregate([
            { $match: { gameId: { $in: gameIds } } },
            {
                $group: {
                    _id: null,
                    totalPoints: { $sum: "$totals.points" },
                    totalRebounds: { $sum: { $add: ["$totals.offensiveRebounds", "$totals.defensiveRebounds"] } },
                    totalAssists: { $sum: "$totals.assists" },
                    totalTurnovers: { $sum: "$totals.turnovers" },
                    totalFGM: { $sum: "$totals.fieldGoalsMade" },
                    totalFGA: { $sum: "$totals.fieldGoalsAttempted" },
                    total3PM: { $sum: "$totals.threePointersMade" },
                    total3PA: { $sum: "$totals.threePointersAttempted" },
                    totalFTM: { $sum: "$totals.freeThrowsMade" },
                    totalFTA: { $sum: "$totals.freeThrowsAttempted" }
                }
            }
        ]);

        const stats = aggregatedStats[0] || {};
        const numGames = games.length;

        // Leaderboards logic
        const playerStats = await GameStats.aggregate([
            { $match: { gameId: { $in: gameIds } } },
            {
                $group: {
                    _id: "$playerId",
                    gamesPlayed: { $sum: 1 },
                    totalPoints: { $sum: "$totals.points" },
                    totalRebounds: { $sum: { $add: ["$totals.offensiveRebounds", "$totals.defensiveRebounds"] } },
                    totalAssists: { $sum: "$totals.assists" }
                }
            },
            {
                $lookup: {
                    from: "players",
                    localField: "_id",
                    foreignField: "_id",
                    as: "player"
                }
            },
            { $unwind: "$player" },
            {
                $project: {
                    _id: 0,
                    player: { firstName: "$player.firstName", lastName: "$player.lastName" },
                    ppg: { $cond: [{ $eq: ["$gamesPlayed", 0] }, 0, { $divide: ["$totalPoints", "$gamesPlayed"] }] },
                    rpg: { $cond: [{ $eq: ["$gamesPlayed", 0] }, 0, { $divide: ["$totalRebounds", "$gamesPlayed"] }] },
                    apg: { $cond: [{ $eq: ["$gamesPlayed", 0] }, 0, { $divide: ["$totalAssists", "$gamesPlayed"] }] }
                }
            }
        ]);

        const topScorers = [...playerStats].sort((a, b) => b.ppg - a.ppg).slice(0, 5).map(s => ({ player: s.player, ppg: s.ppg.toFixed(1) }));
        const topRebounders = [...playerStats].sort((a, b) => b.rpg - a.rpg).slice(0, 5).map(s => ({ player: s.player, rpg: s.rpg.toFixed(1) }));
        const topAssists = [...playerStats].sort((a, b) => b.apg - a.apg).slice(0, 5).map(s => ({ player: s.player, apg: s.apg.toFixed(1) }));

        res.json({
            success: true,
            gamesPlayed: numGames,
            avgPoints: numGames ? stats.totalPoints / numGames : 0,
            avgRebounds: numGames ? stats.totalRebounds / numGames : 0,
            avgAssists: numGames ? stats.totalAssists / numGames : 0,
            avgTurnovers: numGames ? stats.totalTurnovers / numGames : 0,
            fgPercentage: stats.totalFGA ? (stats.totalFGM / stats.totalFGA) * 100 : 0,
            threePtPercentage: stats.total3PA ? (stats.total3PM / stats.total3PA) * 100 : 0,
            ftPercentage: stats.totalFTA ? (stats.totalFTM / stats.totalFTA) * 100 : 0,
            record: { wins, losses },
            perGameScoring,
            leaders: { topScorers, topRebounders, topAssists }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
};

