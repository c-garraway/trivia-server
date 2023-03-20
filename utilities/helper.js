const Points = require('../config/points')

function inputValidation(values) {
    values.map(value => {
        if(!value) {
            throw new Error(`${value} is required`)
        }
    })
}

async function sortTeams() {
    //1. get and push all team points with id [{_id: xxx, pts: 200}, {_id: xxx, pts: 300}] into array
    const teamPoints = await Points.find({}).select('_id teamPointsTotal')
    //2. sort array by pts in descending order [{_id: xxx, pts: 300}, {_id: xxx, pts: 200}]
    const sortedTeams = teamPoints.sort(function(a, b) {return b.teamPointsTotal - a.teamPointsTotal})

    return sortedTeams
}

async function updateTeamRanks(sortedTeams) {
    console.log('ST1: ' + sortedTeams)
    for (let index = 0; index < sortedTeams.length; index++) {
        const team = sortedTeams[index];
        const rank = index + 1;
        //console.log(rank);
        //console.log(team);
        const updatedTeam = await Points.findByIdAndUpdate(
            team._id,
            { $set: { teamRank: rank } },
            { new: true }
        );
        console.log(updatedTeam);
    }
}

module.exports = {
    inputValidation,
    sortTeams,
    updateTeamRanks
}