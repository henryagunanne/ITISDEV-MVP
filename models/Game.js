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
gameSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Automatically populate user reference
gameSchema.pre('find', function (next) {
    this.populate('createdBy', 'username email')
    .populate('tournament'); // Populate all fields in the tournament schema
    next();
});


// Export the Game model for use in other files 
module.exports = mongoose.model('Game', gameSchema);
