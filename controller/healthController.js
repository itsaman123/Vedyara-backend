const mongoose = require('mongoose')

function getHealthStatus(req, res) {
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const dbState = mongoose.connection.readyState;
    let dbStatus = 'Disconnected';
    if (dbState === 1) dbStatus = 'Connected';
    else if (dbState === 2) dbStatus = 'Connecting';
    
    // Check the required ecosystem environment variables
    
    return res.status(200).json({
        server: 'OK',
        database: dbStatus,
        currentEnvironment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
}

module.exports = { getHealthStatus }
