const express = require('express');
const passport = require('passport');
const { checkAuthenticated, checkNotAuthenticated } = require('../utilities/utility')
const Team = require('../config/teams')
const User = require('../config/users')
const Points = require('../config/points')
const pointsRouter = express.Router();
const { updateTeamRanks, sortTeams } = require('../utilities/helper')

pointsRouter.get('/', checkNotAuthenticated, async (req, res) => {
    const searchTeamName = req.session.team.name;

    if(searchTeamName) {
        try {
            const teamPoints = await Points.findOne({ 
                teamName: {'$regex': searchTeamName, "$options": "i" },
            });

            if (teamPoints === null) {
                throw new Error("Team Points Info Not Found")
            };

            console.log(teamPoints)

            res.status(200).json(teamPoints);
    
        } catch (error) {
            console.log(error)
            res.status(404).json(error.message)
        } 
    };
});

pointsRouter.put('/updateDailyPoints', checkNotAuthenticated, async (req, res) => {
    const user = req.session.passport.user;
    const userEmail = user?.email
    const userID = user?._id
    const userType = user?.userType;
    const teamName = req.session.team.name;
    const category = req.body.category;
    const difficulty = req.body.difficulty;
    const dailyPointsTotal = req.body.dailyPointsTotal;
    const dailyPointsBlock = req.body.dailyPointsBlock;
    const currentDate = new Date().toISOString().slice(0, 10);
    
    try {
        //Input validation block

        if(!userEmail || !userType || !userID) {
            throw new Error('User cookie not sent in header! ');
        };

        if(!teamName ) {
            throw new Error('Team name required! ');
        };
    
        if(!category) {
            throw new Error('Category required! ');
        };

        if(!difficulty) {
            throw new Error('difficulty required! ');
        };

        if(!dailyPointsTotal) {
            throw new Error('dailyPointsTotal required! ');
        };

        if(!dailyPointsBlock) {
            throw new Error('dailyPointsBlock required! ');
        };



        //TODO: Check for team point document if not found create entry
        let teamPointsCheck = await Points.findOne({ 
            teamName: {'$regex': teamName, "$options": "i" },
        });
        //console.log(teamPointsCheck) 
        if(!teamPointsCheck) {
            let leadUserEmail;
            let partnerUserEmail;
            if(userType === 'lead') {
                leadUserEmail = userEmail
            } else {
                leadUserEmail = null
            }
            if(userType === 'partner') {
                partnerUserEmail = userEmail
            } else {
                partnerUserEmail = null
            }
            // Create new record.
            await Points.create({
                teamName: teamName,
                teamRank: null,
                teamPointsTotal: null,
                teamMembers: {
                    lead: {
                        email: leadUserEmail,
                        pointsBlockTotal: 0,
                        pointsBlock: [],
                        dailyPoints: {}
                    },
                    partner: {
                        email: partnerUserEmail,
                        pointsBlockTotal: 0,
                        pointsBlock: [],
                        dailyPoints: {}
                    }
                }
            })
            teamPointsCheck = await Points.findOne({ 
                teamName: {'$regex': teamName, "$options": "i" },
            });
        }
        //Check if daily update already exists
        const dailyPointsCheck = await Points.findOne({
            $and: [
                {_id: teamPointsCheck._id},
                {[`teamMembers.${userType}.dailyPoints.${currentDate}`]: {$exists: true}}
            ]
        })
        console.log(dailyPointsCheck)
        if(dailyPointsCheck) {
            throw new Error("Daily entry already exists"); //future remove
        }

        // Database update block
        console.log(category, difficulty, dailyPointsTotal, dailyPointsBlock)

        const teamPoints = await Points.findByIdAndUpdate(
            teamPointsCheck._id,
            { $set: { [`teamMembers.${userType}.dailyPoints.${currentDate}`]: {
                category: category,
                difficulty: difficulty,
                dailyPointsTotal: dailyPointsTotal,
                dailyPointsBlock: dailyPointsBlock
                } 
            }},
            { new: true }
        );

        //Perform calculations
        //Points block update with daily total
        console.log('TPC: ' + teamPointsCheck)
        const leadPointsBlockArray =  teamPointsCheck.teamMembers.lead.pointsBlock
        const partnerPointsBlockArray = teamPointsCheck.teamMembers.partner.pointsBlock

        const pointsBlock = userType === 'lead' ? leadPointsBlockArray : partnerPointsBlockArray
        
        console.log('PB: ' + pointsBlock)

        async function calcPointBlock() {
            pointsBlock.push(dailyPointsTotal);
            if(pointsBlock.length > 7) {
                pointsBlock.shift()
            }
        } 
        await calcPointBlock()
        console.log('PB2: ' + pointsBlock)

        //Points block sum of lead and partner
        const pointsBlockTotal = pointsBlock.reduce((accumulator, currentValue) => accumulator + currentValue)

        const updatePointsBlock = await Points.findByIdAndUpdate(
            teamPointsCheck._id,
            { $set: { 
                [`teamMembers.${userType}.pointsBlock`]: pointsBlock,
                [`teamMembers.${userType}.pointsBlockTotal`]: pointsBlockTotal,
            }},
            { new: true }
        );
        console.log('UPB: ' + updatePointsBlock)

         //Team point total lead pointsBlock + partner pointsBlock
        teamPointsCheck = await Points.findOne({ 
            teamName: {'$regex': teamName, "$options": "i" },
        });
        const partnerPointsBlockTotal = teamPointsCheck.teamMembers.partner.pointsBlockTotal
        const leadPointsBlockTotal = teamPointsCheck.teamMembers.lead.pointsBlockTotal

        console.log(leadPointsBlockTotal, partnerPointsBlockTotal)
        const teamPointsTotal = leadPointsBlockTotal + partnerPointsBlockTotal
         
        const teamPointsUpdate = await Points.findByIdAndUpdate(
            teamPointsCheck._id,
            { $set: { teamPointsTotal: teamPointsTotal }},
            { new: true }
        );
        console.log('TPU: ' + teamPointsUpdate)

        const sortedTeams = await sortTeams();
        const teamRanks = await updateTeamRanks(sortedTeams);

        console.log(sortedTeams, teamRanks)
        res.status(200).json(teamPointsUpdate);

    } catch (error) {
        console.log(error.message)
        res.status(400).json(error.message)
    }  
});

pointsRouter.get('/getTeam', checkNotAuthenticated, async (req, res) => {
    const user = req.session.passport.user;
    const email = user?.email

    try {
        const team = await Team.findOne({ 
            $or: [
                {'members.lead': email},
                {'members.partner': email}
            ]
        });

        if (team === null) {
            throw new Error("Team Info Not Found")
        };

        console.log(team)

        res.status(200).json(team);
        
    } catch (error) {
        console.log(error.message)
        res.status(400).json({error: error.message})
    }
});

module.exports = pointsRouter;
