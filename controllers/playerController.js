const Player = require('../models/Player');
const GameStats = require('../models/GameStats');

// Create Player
exports.createPlayer = async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            position,
            jerseyNumber,
            heightCm,
            weightKg,
            yearLevel,
            course,
            status
        } = req.body;

        // Basic validation
        if (!firstName || !lastName || !position || !jerseyNumber || !heightCm || !weightKg || !yearLevel) {
            return res.status(400).json({
                success: false,
                message: "Missing required player fields"
            });
        }

        // Check if jersey number already exists AND player is active
        const existingPlayer = await Player.findOne({
            jerseyNumber: jerseyNumber,
            status: "Active"
        });

        if (existingPlayer) {
            return res.status(400).json({
                success: false,
                message: "Jersey number already assigned to an active player"
            });
        }

        const player = new Player({
            firstName,
            lastName,
            position,
            jerseyNumber,
            heightCm,
            weightKg,
            yearLevel,
            course,
            status
        });

        const savedPlayer = await player.save();

        res.status(201).json({
            success: true,
            message: "Player created successfully",
            data: savedPlayer
        });

    } catch (error) {
        console.error("Create Player Error:", error);
        res.status(500).json({
            success: false,
            message: "Error creating player",
            error: error.message
        });
    }
};


// Get all Players
exports.getAllPlayers = async (req, res) => {
    try {
        const players = await Player.find().sort({ jerseyNumber: 1 }).lean();
        res.status(200).json({
            success: true,
            data: players,
            count: players.length,
        });
    } catch (error) {
        console.error("Get All Players Error:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving players",
            error: error.message
        });
    }
};

// Get Player by ID
exports.getPlayerById = async (req, res) => {
    try {
        const playerId = req.params.id; // Get player ID from URL parameters
        
        const player = await Player.findById(playerId).lean();

        if (!player) {
            return res.status(404).json({
                success: false,
                message: "Player not found"
            });
        }

        res.status(200).json({
            success: true,
            data: player
        });
    } catch (error) {
        console.error("Get Player By ID Error:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving player",
            error: error.message
        });
    }
};

// Get Active Players
exports.getActiveRoster = async (req, res) => {
    try {
        const players = await Player.find({ status: "Active" }).sort({ jerseyNumber: 1 });

        res.status(200).json({
            success: true,
            rosterSize: players.length,
            data: players
        });
    } catch (error) {
        console.error("Get Active Players Error:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving roster",
            error: error.message
        });
    }
};

// Get Injured Players
exports.getInjuredPlayers = async (req, res) => {
    try {
        const players = await Player.find({ status: "Injured" }).sort({ jerseyNumber: 1 });

        res.status(200).json({
            success: true,
            injuredCount: players.length,
            data: players
        });
    } catch (error) {
        console.error("Get Injured Players Error:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving injured players",
            error: error.message
        });
    }
};

// Get Inactive Players
exports.getInactivePlayers = async (req, res) => {
    try {
        const players = await Player.find({ status: "Inactive" }).sort({ jerseyNumber: 1 });

        res.status(200).json({
            success: true,
            inactiveCount: players.length,
            data: players
        });
    } catch (error) {
        console.error("Get Inactive Players Error:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving inactive players",
            error: error.message
        });
    }
};

// Get Players by Position
exports.getPlayersByPosition = async (req, res) => {
    try {
        const position = req.params.position; // Get position from URL parameters
        const players = await Player.find({ position: position }).sort({ jerseyNumber: 1 });

        res.status(200).json({
            success: true,
            position: position,
            count: players.length,
            data: players
        });
    } catch (error) {
        console.error("Get Players By Position Error:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving players by position",
            error: error.message
        });
    }
};

// Get Players by Year Level
exports.getPlayersByYearLevel = async (req, res) => {
    try {
        const yearLevel = req.params.yearLevel; // Get year level from URL parameters
        const players = await Player.find({ yearLevel: yearLevel }).sort({ jerseyNumber: 1 });

        res.status(200).json({
            success: true,
            yearLevel: yearLevel,
            count: players.length,
            data: players
        });
    } catch (error) {
        console.error("Get Players By Year Level Error:", error);
        res.status(500).json({
            success: false,
            message: "Error retrieving players by year level",
            error: error.message
        });
    }
};

// Update player
exports.updatePlayer = async (req, res) => {
    try {
        const playerId = req.params.id; // Get player ID from URL parameters
        const updateData = req.body; // Get updated player data from request body

        // If jersey number is being updated, check for uniqueness among active players
        if (updateData.jerseyNumber) {
            const existingPlayer = await Player.findOne({
                jerseyNumber: updateData.jerseyNumber,
                status: "Active",
                _id: { $ne: playerId } // Exclude current player from search
            });

            if (existingPlayer) {
                return res.status(400).json({
                    success: false,
                    message: "Jersey number already assigned to an active player"
                });
            }
        }

        const updatedPlayer = await Player.findByIdAndUpdate(
            playerId, 
            updateData, 
            { new: true, runValidators: true}
        ).lean();

        if (!updatedPlayer) {
            return res.status(404).json({
                success: false,
                message: "Player not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Player updated successfully",
            data: updatedPlayer
        });
    } catch (error) {
        console.error("Update Player Error:", error);
        res.status(500).json({
            success: false,
            message: "Error updating player",
            error: error.message
        });
    }
};


// Delete player
exports.deletePlayer = async (req, res) => {
    try {
        const playerId = req.params.id; // Get player ID from URL parameters

         // Check if player has stats
         const existingStats = await GameStats.findOne({ playerId });

         if (existingStats) {
             return res.status(400).json({
                 success: false,
                 message: "Cannot delete player with recorded game statistics"
             });
         }

        const deletedPlayer = await Player.findByIdAndDelete(playerId).lean();

        if (!deletedPlayer) {
            return res.status(404).json({
                success: false,
                message: "Player not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Player deleted successfully",
            data: deletedPlayer
        });
    } catch (error) {
        console.error("Delete Player Error:", error);
        res.status(500).json({
            success: false,
            message: "Error deleting player",
            error: error.message
        });
    }
};


// Update player status
exports.updatePlayerStatus = async (req, res) => {
    try {
        const playerId = req.params.id; // Get player ID from URL parameters
        const { status } = req.body; // Get new status from request body

        if (!["Active", "Injured", "Inactive"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status value"
            });
        }

        const updatedPlayer = await Player.findByIdAndUpdate(
            playerId, 
            { status }, 
            { new: true, runValidators: true }
        ).lean();

        if (!updatedPlayer) {
            return res.status(404).json({
                success: false,
                message: "Player not found"
            });
        }

        res.status(200).json({
            success: true,
            message: "Player status updated successfully",
            data: updatedPlayer
        });
    } catch (error) {
        console.error("Update Player Status Error:", error);
        res.status(500).json({
            success: false,
            message: "Error updating player status",
            error: error.message
        });
    }
};


// Other player-related controllers can be added here (e.g., get players by course, get players by height/weight range, etc.)