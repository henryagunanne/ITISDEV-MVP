const Tournament = require('../models/Tournament');

// Controller function to get all tournaments
exports.getAllTournaments = async (req, res) => {
    try {
        const tournaments = await Tournament.find().sort({ createdAt: -1 });
        res.status(200).json({
            tournaments: tournaments,
            message: 'Tournaments retrieved successfully',
            tournamentCount: tournaments.length
        });
    } catch (error) {
        console.error('Error fetching tournaments:', error);
        res.status(500).send('Internal Server Error');
    }
};

// Controller function to get a tournament by ID
exports.getTournamentById = async (req, res) => {
    try {
        const tournamentId = req.params.id;
        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }
        res.status(200).json({
            tournament: tournament,
            message: 'Tournament retrieved successfully'
        });
    } catch (error) {
        console.error('Error fetching tournament:', error);
        res.status(500).send('Internal Server Error');
    }
};

// Controller function to create a new tournament
exports.createTournament = async (req, res) => {
    try {
        const { name, league, season, description, startDate, endDate } = req.body;
        const newTournament = new Tournament({
            name,
            league,
            season,
            description: description ? description : '',
            startDate,
            endDate: endDate ? endDate : '',
            createdBy: req.session.user.id
        });
        await newTournament.save();
        res.status(201).json({
            tournament: newTournament,
            message: 'Tournament created successfully'
        });
    } catch (error) {
        console.error('Error creating tournament:', error);
        res.status(500).send('Internal Server Error');
    }
};

// Controller function to update a tournament
exports.updateTournament = async (req, res) => {
    try {
        const tournamentId = req.params.id;
        const { name, league, season, description, startDate, endDate } = req.body;
        const updatedTournament = await Tournament.findByIdAndUpdate(
            tournamentId,
            { 
                name, 
                league, 
                season, 
                description: description ? description : '', 
                startDate, 
                endDate: endDate ? endDate :''
            },
            { new: true }
        );
        if (!updatedTournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }
        res.status(200).json({
            tournament: updatedTournament,
            message: 'Tournament updated successfully'
        });
    } catch (error) {
        console.error('Error updating tournament:', error);
        res.status(500).send('Internal Server Error');
    }
};

// Controller function to delete a tournament
exports.deleteTournament = async (req, res) => {
    try {
        const tournamentId = req.params.id;
        const deletedTournament = await Tournament.findByIdAndDelete(tournamentId);
        if (!deletedTournament) {
            return res.status(404).json({ message: 'Tournament not found' });
        }
        res.status(200).json({
            tournament: deletedTournament,
            message: 'Tournament deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting tournament:', error);
        res.status(500).send('Internal Server Error');
    }
};




// Additional controller functions for tournament-related operations can be added here (e.g., managing teams, players, games within a tournament, etc.)
