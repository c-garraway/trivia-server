const express = require('express');
//const passport = require('passport');
const { checkNotAuthenticated } = require('../utilities/utility')
//const Team = require('../config/teams')
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
    //const userEmail = user?.email
    const userID = user?._id
    const userType = user?.userType;
    const teamName = req.session.team.name;
    const leadEmail = req.session.team.members.lead;
    const partnerEmail = req.session.team.members.partner;
    const category = req.body.category;
    const difficulty = req.body.difficulty;
    const dailyPointsTotal = req.body.dailyPointsTotal;
    const dailyPointsBlock = req.body.dailyPointsBlock;
    const currentDate = new Date().toISOString().slice(0, 10);
    
    try {
        //Input validation block
        if(!leadEmail || !userType || !teamName  || !userID) {
            throw new Error('User cookie not sent in header! ');
        };

        if(!partnerEmail) {
            throw new Error('Partner registration required to save points! ');
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



        //Check for team point document if not found create entry
        let teamPointsCheck = await Points.findOne({ 
            teamName: {'$regex': teamName, "$options": "i" },
        });
        //console.log(teamPointsCheck) 
        if(!teamPointsCheck) {
            await Points.create({
                teamName: teamName,
                teamRank: null,
                teamPointsTotal: null,
                teamMembers: {
                    lead: {
                        email: leadEmail,
                        pointsBlockTotal: 0,
                        pointsBlock: [],
                        dailyPoints: {}
                    },
                    partner: {
                        email: partnerEmail,
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

        //Update last game in user table and session
        const updateLastGame = await User.findByIdAndUpdate(
            userID,
            { $set: { 
                lastGame: currentDate,
            }},
            { new: true }
        );
        

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

        //Update session user
        req.session.passport.user = await User.findOne({
            _id: userID
        })
        res.status(200).json({message: 'Points successfully saved'});

    } catch (error) {
        console.log(error.message)
        res.status(400).json(error.message)
    }  
});

pointsRouter.get('/getTeamRanks', checkNotAuthenticated, async (req, res) => {

    try {
        
        const teamRanks = await Points.find({}).select('_id teamName teamRank teamPointsTotal')
        const sortedTeams = teamRanks.sort(function(a, b) {return b.teamPointsTotal - a.teamPointsTotal})
        res.status(200).json(sortedTeams);
        
    } catch (error) {
        console.log(error.message)
        res.status(400).json({error: error.message})
    }
});

module.exports = pointsRouter;
