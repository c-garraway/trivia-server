function checkAuthenticated(req, res, next){
    if(req.isAuthenticated()){
        res.status(401).json({message: 'Already logged in', status: 'error'});
        return;
    }
    next();
}

function checkNotAuthenticated(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    res.status(401).json({message: 'Not authenticated to perform transaction', status: 'error'});
}

module.exports = {
    checkAuthenticated,
    checkNotAuthenticated
}