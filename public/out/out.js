exports.loadStats = async (req, res) => {
    try {
        const gameId = req.params.gameId;

        const stats = await GameStats.aggregate([
            { $match: { gameId: new require('mongoose').Types.ObjectId(gameId) } },

            {
                $lookup: {
                    from: 'players',
                    localField: 'playerId',
                    foreignField: '_id',
                    as: 'player'
                }
            },

            { $unwind: { path: '$player', preserveNullAndEmptyArrays: true } },

            {
                $project: {
                    team: 1,
                    opponentPlayerIndex: 1,
                    player: { $arrayElemAt: ['$player', 0] },

                    totals: {
                        points: { $sum: '$periodStats.q1.points' }, // extend later
                    }
                }
            }
        ]);

        res.json({ stats });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};