/* Stores game-level metadata.
    Purpose:
    Game scheduling
    Game result storage
    Season grouping
    Analytics per game
*/

const mongoose = require('mongoose');


// Define the schema for a Game
const gameSchema = new mongoose.Schema({
    gameDate: {
        type: Date,
        required: true
    },
    opponent: {
        type: String,
        required: true,
        trim: true
    },
    tournament: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tournament",
        required: true
    },
    venue: {
        type: String,
        required: true,
        trim: true
    },
    startTime: {
        type: Date,
        required: true
    },
    quarterScores: {
        q1: {
            team: { type: Number, default: 0 },
            opponent: { type: Number, default: 0 }
        },
        q2: {
            team: { type: Number, default: 0 },
            opponent: { type: Number, default: 0 }
        },
        q3: {
            team: { type: Number, default: 0 },
            opponent: { type: Number, default: 0 }
        },
        q4: {
            team: { type: Number, default: 0 },
            opponent: { type: Number, default: 0 }
        },
    
        overtimes: [
            {
                team: { type: Number, default: 0 },
                opponent: { type: Number, default: 0 }
            }
        ]
    },
    teamScore: {
        type: Number,
        required: true,
    },
    opponentScore: {
        type: Number,
        required: true,
    },
    result: {
        type: String,
        enum: ["Win", "Loss"]
    },
    status: {
      type: String,
      enum: ["Scheduled", "Completed", "Cancelled"],
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }, // reference to User
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update timestamp
gameSchema.pre('save', function () {
    this.updatedAt = Date.now();
   //next();
});

// Automatically populate user reference
gameSchema.pre('find', function () {
    this.populate('createdBy', 'username email')
    .populate('tournament'); // Populate all fields in the tournament schema
    //next();
});

// Method to calculate final score based on quarter scores and overtimes
gameSchema.methods.calculateFinalScore = function () {

    let teamTotal =
        this.quarterScores.q1.team +
        this.quarterScores.q2.team +
        this.quarterScores.q3.team +
        this.quarterScores.q4.team;

    let opponentTotal =
        this.quarterScores.q1.opponent +
        this.quarterScores.q2.opponent +
        this.quarterScores.q3.opponent +
        this.quarterScores.q4.opponent;

    this.quarterScores.overtimes.forEach(ot => {
        teamTotal += ot.team;
        opponentTotal += ot.opponent;
    });

    this.teamScore = teamTotal;
    this.opponentScore = opponentTotal;
};


// Export the Game model for use in other files 
module.exports = mongoose.model('Game', gameSchema);
