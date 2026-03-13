const mongoose = require("mongoose");
const GameStats = require("../models/GameStats");
const Game = require("../models/Game");


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



