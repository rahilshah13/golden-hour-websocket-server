const { Server } = require("socket.io");
const { createServer } = require("http");
const { OAuth2Client } = require('google-auth-library');
const config = require('./config/googleOAuth.json');
const httpServer = createServer();
const authClient = new OAuth2Client(config.web.client_id, config.web.client_secret);
const { createUserSession, getUserSession, userReady, userUnready} = require('./services/redisService');

const io = new Server(httpServer, { cors: { origin: "*", methods: ["GET", "POST"] } });

// upon entering the lobby after signing in
io.on("connection", async (socket) => {

    const token = socket.handshake.auth.token;
    console.log("new connection wtf.");
    // validate token
    const authRes = await authClient.verifyIdToken({
        idToken: token, 
        audience: config.web.client_id 
    }).catch(e => console.log("Invalid Token.", e));

    if (!authRes || authRes.payload.hd != 'vt.edu') 
        return new Error('Authentication error');

    await createUserSession(authRes.payload);

    var debugEvent = new Date();
    debugEvent.setHours(debugEvent.getHours() + 1);

    socket.join('lobby');
    socket.emit("connection", {
        "nUsers": socket.adapter.rooms.get('lobby').size || 1,
        "startTime":  debugEvent.toUTCString()
    });

    io.emit("num_connected", socket.adapter.rooms.get('lobby').size || 1);

    socket.on("profile_update", (user) => {
        if(userReady(user)) io.emit("user_state", true);
        else io.emit("user_state", false)
    });

    socket.on("unready", (user) => {
        if(userUnready(user))
            io.emit("ready_state", false)
    });
    
    socket.on("swipe", (swipe) => {});
    
    socket.on("disconnect", () => {
        socket.leave('lobby');
        socket.emit("num_connected", socket.adapter.rooms.get('lobby') ? socket.adapter.rooms.get('lobby').size : 1);
    });

    /////////////////// WEBRTC HANDLERS /////////////////////
    socket.on("offer", (offer) => {
        socket.to("lobby").emit("offer", offer);
    });

    socket.on("new_ice_candidate", candidate => {
        socket.to("lobby").emit("remote_ice_candidate", candidate);
    });
});


io.on("error", err => console.log(err));
httpServer.listen(4000);

/* 
    The server needs the client to know what the global app state is.
        - app_state = { state: open || closed, start_time: XXX, end_time: YYY }
    the client needs the server to know what state it is in.
        - must be authenticated
        - client_state = { state: not_ready || ready || in_meeting, }
*/