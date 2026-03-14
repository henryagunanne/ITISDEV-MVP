// Each document represents one player’s performance in one game.

const mongoose = require('mongoose');


// Quarter stat schema
const periodStatSchema = new mongoose.Schema({
    minutesPlayed: { type: Number, default: 0 },

    points: { type: Number, default: 0 },

    fieldGoalsMade: { type: Number, default: 0 },
    fieldGoalsAttempted: { type: Number, default: 0 },

    threePointersMade: { type: Number, default: 0 },
    threePointersAttempted: { type: Number, default: 0 },

    freeThrowsMade: { type: Number, default: 0 },
    freeThrowsAttempted: { type: Number, default: 0 },

    offensiveRebounds: { type: Number, default: 0 },
    defensiveRebounds: { type: Number, default: 0 },

    assists: { type: Number, default: 0 },
    steals: { type: Number, default: 0 },
    blocks: { type: Number, default: 0 },

    turnovers: { type: Number, default: 0 },
    fouls: { type: Number, default: 0 },

    plusMinus: { type: Number, default: 0 }

}, { _id: false });


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

    // Stats per quarter
    periodStats: {

        q1: { type: periodStatSchema, default: () => ({}) },
        q2: { type: periodStatSchema, default: () => ({}) },
        q3: { type: periodStatSchema, default: () => ({}) },
        q4: { type: periodStatSchema, default: () => ({}) },

        // Support multiple overtimes
        overtimes: {
            type: [periodStatSchema],
            default: []
        }
    },

    // Optional cached totals (computed)
    totals: {

        minutesPlayed: { type: Number, default: 0 },
        points: { type: Number, default: 0 },

        fieldGoalsMade: { type: Number, default: 0 },
        fieldGoalsAttempted: { type: Number, default: 0 },

        threePointersMade: { type: Number, default: 0 },
        threePointersAttempted: { type: Number, default: 0 },

        freeThrowsMade: { type: Number, default: 0 },
        freeThrowsAttempted: { type: Number, default: 0 },

        offensiveRebounds: { type: Number, default: 0 },
        defensiveRebounds: { type: Number, default: 0 },

        assists: { type: Number, default: 0 },
        steals: { type: Number, default: 0 },
        blocks: { type: Number, default: 0 },

        turnovers: { type: Number, default: 0 },
        fouls: { type: Number, default: 0 },

        plusMinus: { type: Number, default: 0 }
    },

    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }

}, { timestamps: true });


// Auto compute totals before saving
gameStatsSchema.pre('save', function() {

    // Gather all periods (quarters + overtimes)
    const periods = [
        this.periodStats.q1,
        this.periodStats.q2,
        this.periodStats.q3,
        this.periodStats.q4,
        ...this.periodStats.overtimes    // Spread operator to include all overtime periods
    ];

    const totals = {};  // Initialize totals object

    // Sum up stats across all periods
    periods.forEach(period => {
        for (let stat in period) {
            if (!totals[stat]) {
                totals[stat] = 0;
            }
            totals[stat] += period[stat] || 0;  // Add current period stat to total, defaulting to 0 if undefined
        }

    });

    // Cache totals for quick access (optional)
    this.totals = totals;

    this.updatedAt = Date.now();    // Update timestamp

    //next();
});

// Automatically populate game and player references
gameStatsSchema.pre(/^find/, function () {
    this.populate('gameId').populate('playerId');
    //next();
});

// Prevent duplicate stats for same player in same game
gameStatsSchema.index({ gameId: 1, playerId: 1 }, { unique: true });

// Create and export the GameStats model
module.exports = mongoose.model('GameStats', gameStatsSchema);
