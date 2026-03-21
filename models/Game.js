/* Stores game-level metadata.
    Purpose:
    Game scheduling
    Game result storage
    Season grouping
    Analytics per game
*/

const mongoose = require('mongoose');

const opponentPlayerSchema = new mongoose.Schema({
    jerseyNumber: { type: Number, required: true },
    fullName: { type: String, required: true, trim: true },
    position: { type: String, default: '' }
}, { _id: false });

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
    opponentPlayers: { 
        type: [opponentPlayerSchema], 
        default: [] 
    },
    tournament: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Tournament"
    },
    players: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GameStats'
    }],
    venue: {
        type: String,
        default: 'TBD',
        trim: true
    },
    startTime: {
        type: Date
    },
    currentPeriod: { 
        type: Number, 
        default: 1 
    },
    gameClock: { 
        type: String, 
        default: '10:00' 
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
      enum: ['NOT_STARTED', 'PLAYING', 'PAUSED', 'ENDED'],
      default: 'NOT_STARTED'
    },
    
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
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
    .populate('tournament') // Populate all fields in the tournament schema
    .populate('players')
    //next();
});

// Method to calculate final score based on quarter scores and overtimes
gameSchema.methods.calculateFinalScore = function () {
    let teamTotal = (this.quarterScores.q1?.team || 0) + 
                    (this.quarterScores.q2?.team || 0) +
                    (this.quarterScores.q3?.team || 0) + 
                    (this.quarterScores.q4?.team || 0);

    let oppTotal = (this.quarterScores.q1?.opponent || 0) + 
                    (this.quarterScores.q2?.opponent || 0) +
                    (this.quarterScores.q3?.opponent || 0) + 
                    (this.quarterScores.q4?.opponent || 0);
                    
    (this.quarterScores.overtimes || []).forEach(ot => { 
        teamTotal += ot.team; 
        oppTotal += ot.opponent; 
    });

    this.teamScore = teamTotal;
    this.opponentScore = oppTotal;

    // Update result automatically
    if (this.teamScore > this.opponentScore) {
        this.result = "Win";
    } else if (this.teamScore < this.opponentScore) {
        this.result = "Loss";
    } 

};


// Export the Game model for use in other files 
module.exports = mongoose.model('Game', gameSchema);
