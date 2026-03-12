const mongoose = require("mongoose");
const GameStats = require("../models/GameStats");


// Create new game stats
exports.createGameStats = async (req, res) => {
    try {
        const {
            gameId,
            playerId,
            minutesPlayed,
            points,
            fieldGoalsMade,
            fieldGoalsAttempted,
            threePointersMade,
            threePointersAttempted,
            freeThrowsMade,
            freeThrowsAttempted,
            offensiveRebounds,
            defensiveRebounds,
            assists,
            steals,
            blocks,
            turnovers,
            fouls,
            plusMinus
        } = req.body;

        // Validate required fields
        if (!gameId || !playerId) {
            return res.status(400).json({
                success: false,
                message: "gameId and playerId are required."
            });
        }

        // Create new GameStats document
        const gameStats = new GameStats({
            gameId,
            playerId,
            minutesPlayed,
            points,
            fieldGoalsMade,
            fieldGoalsAttempted,
            threePointersMade,
            threePointersAttempted,
            freeThrowsMade,
            freeThrowsAttempted,
            offensiveRebounds,
            defensiveRebounds,
            assists,
            steals,
            blocks,
            turnovers,
            fouls,
            plusMinus
        });

        const savedStats = await gameStats.save();

        res.status(201).json({
            success: true,
            message: "Game stats created successfully.",
            data: savedStats
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

        const stats = await GameStats.find({ playerId }).populate('gameId', 'gameDate opponent tournament, result, teamScore opponentScore');

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

// Get aggregated stats for a player in a specific tournament (requires additional fields in Game model to filter by tournament)
exports.getAggregatedStatsByPlayerIdAndTournament = async (req, res) => {
    try {
        const { playerId, tournament } = req.params;

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
            { $match: { playerId: mongoose.Types.ObjectId(playerId), "gameDetails.tournament": tournament } },
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
            { $match: { playerId: mongoose.Types.ObjectId(playerId), "gameDetails.season": season } },
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

// Additional controller functions for specific queries (e.g., top scorers in a season, player performance in a tournament, etc.) can be added here as needed.