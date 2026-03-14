const mongoose = require('mongoose');

// Define the schema for a Tournament
const tournamentSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    league: {
        type: String,
        enum: ["UAAP", "NCAA", "Preseason", "Tune-Up"],
        required: true
    },
    season: {
        type: String,
        required: true
    },
    description: {
        type: String,
        trim: true
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

// Update timestamp
tournamentSchema.pre('save', function () {
    this.updatedAt = Date.now();
    //next();
});

// Virtual for formatted date range
tournamentSchema.virtual('dateRange').get(function () {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    const start = this.startDate.toLocaleDateString('en-US', options);
    const end = this.endDate ? this.endDate.toLocaleDateString('en-US', options) : null;
    return end ? `${start} - ${end}` : start;
});

// Automatically populate user reference
tournamentSchema.pre('find', function () {
    this.populate('createdBy', 'username'); // Populate createdBy with username only
    //next();
});


// Create and export the Tournament model
module.exports = mongoose.model('Tournament', tournamentSchema);