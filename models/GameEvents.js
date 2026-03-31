const mongoose = require("mongoose");

const gameEventSchema = new mongoose.Schema({
    gameId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Game",
        required: true
    },
    // For home team players (from Player collection)
    playerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Player"
    },
    // For opponent players (embedded - NOT in Player collection)
    opponentPlayer: {
        jerseyNumber: { type: Number },
        fullName: { type: String }
    },
    team: { 
        type: String, 
        enum: ['lasalle', 'opponent'], 
        required: true 
    },
    period: {
        type: Number, // 1,2,3,4,5,6...
        required: true
    },
    gameClock: {
        type: String // "08:32"
    },
    gameTimeSeconds: {
        type: Number
    },
    eventType: {
        type: String,
        enum: [
            "shot made",
            "shot missed",
            "free throw made",
            "free throw missed",
            "offensive rebound",
            "defensive rebound",
            "assist",
            "steal",
            "block",
            "turnover",
            "foul",
            "sub_in",
            "sub_out"
        ]
    },
    shotType: {
        type: String,
        enum: ["2PT", "3PT", "FT", ""],
        default: ''
    },
    points: {
        type: Number,
        default: 0
    },
    assistPlayerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Player"
    },
    reversed: { 
        type: Boolean, 
        default: false 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
}, { timestamps: true });


module.exports = mongoose.model("GameEvent", gameEventSchema);