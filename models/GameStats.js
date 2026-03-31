// Each document represents one player’s performance in one game.

const mongoose = require('mongoose');


// Quarter stat schema
const periodStatSchema = new mongoose.Schema({
    minutesPlayed: { type: Number, default: 0 },
    isOnCourt: { type: Boolean, default: false },

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
        default: null
    },
    opponentPlayerIndex: { 
        type: Number, 
        default: null 
    },
    team: { 
        type: String, 
        enum: ['lasalle', 'opponent'], 
        required: true 
    },
    // --- Global minute tracking fields ---
    isOnCourt: { 
        type: Boolean, 
        default: false 
    },
    lastSubInTime: { 
        type: Number, 
        default: null // Will store gameTimeSeconds
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

    const statFields = [
        'minutesPlayed', 'points', 'fieldGoalsMade', 'fieldGoalsAttempted',
        'threePointersMade', 'threePointersAttempted', 'freeThrowsMade', 'freeThrowsAttempted',
        'offensiveRebounds', 'defensiveRebounds', 'assists', 'steals', 'blocks',
        'turnovers', 'fouls', 'plusMinus'
    ];

    statFields.forEach(field => { 
        totals[field] = 0; 
    });

    periods.forEach(period => { 
        if (period) {
            statFields.forEach(field => { 
                totals[field] += period[field] || 0; 
            }); 
        }
    });

    this.totals = totals;

    this.updatedAt = Date.now();    // Update timestamp

    //next();
});


// Two separate unique indexes: one for home (by playerId), one for opponent (by opponentPlayerIndex)
gameStatsSchema.index(
    { gameId: 1, playerId: 1 },
    { unique: true, partialFilterExpression: { team: 'lasalle' } }
);
gameStatsSchema.index(
    { gameId: 1, opponentPlayerIndex: 1 },
    { unique: true, partialFilterExpression: { team: 'opponent' } }
);

// Create and export the GameStats model
module.exports = mongoose.model('GameStats', gameStatsSchema);
