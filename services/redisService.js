/* run with visualizer:
    docker run --rm -p 5001:5001 --link redis:latest marian/rebrow
    use name of redis container for "host name"
*/
const redis = require('redis');
const redisClient = redis.createClient({
    url: process.env.REDIS_HOST ? `redis://${process.env.REDIS_HOST}:6379`: ""
}); 

(async () => await redisClient.connect())();

redisClient.on('connect', () => {
    console.log("connected to redis.");
    //insertDummyData();
});

redisClient.on('error', err => {
    console.log('Error ' + err);
});

//////////
async function insertDummyData(){
    const names = ["ligma", "sigma", "joe", "joseph", "bob", "carl", "doug", "kodak", "shelly", "plankton"];
    for(let i=0; i < 20; i++ ) {
        let email = names[(Math.floor(Math.random() * 100)) % 10].concat(names[(Math.floor(Math.random() * 100)) % 10]);
        await redisClient.set(email.concat("@vt.edu"), '{"email":"","state":"not_ready","gender":0.5,"seeking":{"low":0,"high":1},"year":{"low":"fr","high":"grad"}}');
    }
}
///////////

async function createUserSession(user) {
    console.log(user.email)
    const res = await redisClient.get(user.email);
    if(res === null) {
        const base = {email: "", state: "not_ready", gender: .5, seeking: {low: 0, high: 1}, year: {low: "fr", high: "grad"}};
        await redisClient.set(user.email, JSON.stringify(base));
    }
}

async function getUserSession(email) {
    console.log("get user session for", email);
    return await redisClient.get(email);
}

async function userReady(user, email) {

    if(!validateUserInput(user))
        return false;

    await redisClient.set(email, JSON.stringify({...user, ready: true}));
    return true;
}

// TODO: error handling
async function userUnready(user) {
    await redisClient.set(user.email, JSON.stringify({...user, ready: false}));
    return true;
}


function validateUserInput(user) {
    return (isFloat(user.gender) &&
        user.preference.length === 2 &&
        user.preference[0] < user.preference[1] &&
        user.preference[0] >= 0 &&
        user.preference[1] <= 1 &&
        user.wavelength.length < 70 &&
        user.wavelength.length > 0
    );
}

async function addOffer() {

}



const isFloat = (n) => {return Number(n) === n && n % 1 !== 0};

module.exports = {
    redisClient,
    createUserSession,
    getUserSession,
    userReady,
    userUnready
}