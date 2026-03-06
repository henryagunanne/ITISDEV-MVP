// Each document represents one player’s performance in one game.

const mongoose = require('mongoose');

// Define the schema for Game Stats
const gameStatsSchema = new mongoose.Schema({
    gameId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Game',
        required: true
    },
    playerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Player',
        required: true
    },

    minutesPlayed: {
        type: Number,
        default: 0
    },

    points: {
        type: Number,
        default: 0
    },
    fieldGoalsMade: {
        type: Number,
        default: 0
    },
    fieldGoalsAttempted: {
        type: Number,
        default: 0
    },
    threePointersMade: {
        type: Number,
        default: 0
    },
    threePointersAttempted: {
        type: Number,
        default: 0
    },
    freeThrowsMade: {
        type: Number,
        default: 0
    },
    freeThrowsAttempted: {
        type: Number,
        default: 0
    },

    offensiveRebounds: {
        type: Number,
        default: 0
    },
    defensiveRebounds: {
        type: Number,
        default: 0
    },
    assists: {
        type: Number,
        default: 0
    },
    steals: {
        type: Number,
        default: 0
    },
    blocks: {
        type: Number,
        default: 0
    },
    turnovers: {
        type: Number,
        default: 0
    },
    fouls: {
        type: Number,
        default: 0
    },

    plusMinus: {
        type: Number,
        default: 0
    },

    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Pre-save hook to update the updatedAt field
gameStatsSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Automatically populate game and player references
gameStatsSchema.pre('find', function (next) {
    this.populate('gameId').populate('playerId');
    next();
});

// Create and export the GameStats model
module.exports = mongoose.model('GameStats', gameStatsSchema);
