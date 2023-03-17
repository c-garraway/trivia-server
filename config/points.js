const mongoose = require('mongoose');

const pointsSchema = new mongoose.Schema({
    teamName: String,
    teamRank: Number,
    teamPointsTotal: Number,
    teamPointsBlock: Array,
    teamMembers: {
        lead: {
            email: String,
            leadPointsBlock: Array,
            dailyPoints: {}
        },
        partner: {
            email: String,
            partnerPointsBlock: Array,
            dailyPoints: {}
        },
    }
});

module.exports = mongoose.model('Points', pointsSchema)