/* Stores game-level metadata.
    Purpose:
    Game scheduling
    Game result storage
    Season grouping
    Analytics per game
*/

const mongoose = require('mongoose');

// Define the schema for a Game Type
const gameTypeSchema = new mongoose.Schema({
    name: {
        type: String,
        enum: ["Preseason", "UAAP", "Tune-Up"],
        required: true,
        default: "Preseason"
    },
    description: {
        type: String,
        trim: true
    },
});

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
    gameType: {
        type: gameTypeSchema, 
        required: true
    },
    venue: {
        type: String,
        required: true,
        trim: true
    },
    season: {
        type: String,
    },
    result: {
      type: String,
      enum: ["Win", "Loss"]
    },
    teamScore: {
        type: Number,
        required: true,
    },
    opponentScore: {
        type: Number,
        required: true,
    },
    status: {
      type: String,
      enum: ["Scheduled", "Completed"]
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

// Pre-save hook to update the updatedAt field
gameSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Automatically populate user reference
gameSchema.pre('find', function (next) {
    this.populate('createdBy', 'username email');
    next();
});


// Export the Game model for use in other files 
module.exports = mongoose.model('Game', gameSchema);

// Example of creating a new game document
// const newGame = new Game({
//     gameDate: new Date('2024-09-01'),   
//     opponent: 'Rival Team',
//     gameType: { name: 'UAAP', description: 'University Athletic Association of the Philippines' },
//     venue: 'Home Court',
//     season: '2024-2025',
//     result: 'Win',
//     teamScore: 85,
//     opponentScore: 78,
//     status: 'Completed',
//     createdBy: someUserId
// });