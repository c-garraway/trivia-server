const mongoose = require('mongoose');

const pointsSchema = new mongoose.Schema({
    teamName: String,
    teamRank: Number,
    teamPointsTotal: Number,
    teamMembers: {
        lead: {
            email: String,
            pointsBlockTotal: Number,
            pointsBlock: Array,
            dailyPoints: Object,
        },
        partner: {
            email: String,
            pointsBlockTotal: Number,
            pointsBlock: Array,
            dailyPoints: Object,
        },
    }
});

module.exports = mongoose.model('Points', pointsSchema)