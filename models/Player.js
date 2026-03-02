// Stores player profile and roster information.

const mongoose = require('mongoose');

// Define the schema for a Player
const playerSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true,
        trim: true
    },
    lastName: {
        type: String,
        required: true,
        trim: true
    },
    position: {
        type: String,
        enum: ["PG", "SG", "SF", "PF", "C"],
        required: true
    },
    jerseyNumber: {
        type: Number,
        required: true,
        unique: true
    },
    heightCm: {
        type: Number,
        required: true
    },
    weightKg: {
        type: Number,
        required: true
    },
    yearLevel: {
        type: String,
        enum: ["Rookie", "Sophomore", "Junior", "Senior"],
        required: true
    },
    course: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ["Active", "Injured", "Inactive"]
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

// pre-save hook to update the updatedAt field
playerSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

// Create and export the Player model
module.exports = mongoose.model('Player', playerSchema);