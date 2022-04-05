const { Server } = require("socket.io");
const { createServer } = require("http");
const { OAuth2Client } = require('google-auth-library');
const config = require('./config/googleOAuth.json');
const httpServer = createServer();
const authClient = new OAuth2Client(config.web.client_id, config.web.client_secret);
const { createUserSession, getUserSession, userReady, userUnready, redisClient} = require('./services/redisService');

const io = new Server(httpServer, { cors: { origin: "*", methods: ["GET", "POST"] } });

// upon entering the lobby after signing in
io.of("/socket.io/").on("connection", async (socket) => {
    const token = socket.handshake.auth.token;
    // validate token
    const authRes = await authClient.verifyIdToken({
        idToken: token, 
        audience: config.web.client_id 
    }).catch(e => console.log("Invalid Token.", e));

    // enable this later
    // if (!authRes || authRes.payload.hd != 'vt.edu') 
    //     return new Error('Authentication error');
    await createUserSession(authRes.payload);

    var debugEvent = new Date();
    debugEvent.setHours(debugEvent.getHours() + 1);

    socket.join('lobby');
    socket.user = authRes.payload.email;

    socket.emit("connection", {
        "nUsers": io.engine.clientsCount || 1,
        "startTime":  debugEvent.toUTCString()
    });

    socket.broadcast.emit("num_connected", io.engine.clientsCount || 1);

    socket.on("profile_update", (user) => {
        if(userReady(user, socket.user)) io.emit("user_state", true);
        else io.emit("user_state", false);
    });

    socket.on("unready", (user) => {
        if(userUnready(user))
            io.emit("ready_state", false)
    });
    
    socket.on("swipe", (swipe) => {
        console.log("swipe registered.");
    });
    
    socket.on("disconnect", () => {
        // TODO: delete key from redis
        socket.broadcast.emit("num_connected", io.engine.clientsCount || 1);
        socket.leave('lobby');
    });

    /* WEBRTC HANDLERS */
    socket.on("offer", async (message) => {
        const a = await redisClient.get(socket.user);
        //console.log(socket.user, JSON.parse(a));
        // TODO: save offer in redis
        socket.to("lobby").emit("offer", message);
    });


    socket.on("new_ice_candidate", candidate => {
        // TODO: route to correct socket
        socket.to("lobby").emit("remote_ice_candidate", candidate);
    });
});


io.on("error", err => console.log(err));
httpServer.listen(4000);