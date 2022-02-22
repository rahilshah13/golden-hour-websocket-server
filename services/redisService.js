const redis = require('redis');
console.log("PLS ", process.env.REDIS_HOST);
const redisClient = redis.createClient({
    host: process.env.REDIS_HOST || 'localhost', 
    port: 6379,
});

(async () => await redisClient.connect())();

redisClient.on('connect', () => {
    console.log("connected to redis.");
});

redisClient.on('error', err => {
    console.log('Error ' + err);
});

async function createUserSession(user) {
    const res = await redisClient.get(user.email);
    if(res === null) {
        const base = {"email": "", "state": "not_ready", "gender": .5, "seeking": {low: 0, high: 1}, "year": {"low": "fr", "high": "grad"}};
        await redisClient.set(user.email, JSON.stringify(base));
    }
}

async function getUserSession(email) {
    console.log("get user session for", email);
    return await redisClient.get(email);
}

async function userReady(user) {
    if(!validateUserInput(user))
        return false;

    await redisClient.set(user.email, JSON.stringify({...user, ready: true}));
    return true;
}

// TODO: error handling
async function userUnready(user) {
    await redisClient.set(user.email, JSON.stringify({...user, ready: false}));
    return true;
}


function validateUserInput(user) {
    return (isFloat(user.gender) &&
        Array.isArray(user.preferences) &&
        user.preferences[0] < user.preferences[1] &&
        isFloat(user.preferences[0]) &&
        isFloat(user.preferences[1]) &&
        user.wavelength.length < 70 &&
        user.wavelength.length > 0
    );
}

const isFloat = (n) => {return Number(n) === n && n % 1 !== 0};

module.exports = {
    redisClient,
    createUserSession,
    getUserSession,
    userReady,
    userUnready
}