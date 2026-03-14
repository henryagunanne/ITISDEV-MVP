const mongoose = require("mongoose");

const gameEventSchema = new mongoose.Schema({
    gameId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Game",
        required: true
    },
    playerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Player"
    },
    period: {
        type: Number, // 1,2,3,4,5,6...
        required: true
    },
    gameClock: {
        type: String // "08:32"
    },
    eventType: {
        type: String,
        enum: [
            "shot_made",
            "shot_missed",
            "free_throw",
            "offensive rebound",
            "defensive rebound",
            "assist",
            "steal",
            "block",
            "turnover",
            "foul",
            "substitution"
        ]
    },
    shotType: {
        type: String,
        enum: ["2PT", "3PT", "FT"]
    },
    points: {
        type: Number,
        default: 0
    },
    assistPlayerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Player"
    }
}, { timestamps: true });


module.exports = mongoose.model("GameEvent", gameEventSchema);