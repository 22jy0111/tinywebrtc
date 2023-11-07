import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from './models';

const app = express();
const port = 3001;
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer);
const path = require("path");

io.on('connection', (socket) => {
    console.log(`connect: ${socket.id}`);

    socket.on('join', (roomId) => {
        console.log(`join room: ${roomId}`);
        socket.join(roomId);

        socket.emit('requestSDPOffer');
        console.log(`requestSDPOffer`);
    })

    socket.on('responseSDPOffer', (sdpOffer) => {
        console.log(`SDPOffer: ${sdpOffer}`);
        for (let room of socket.rooms) {
            if (room != socket.id) {
                console.log(`broadcastSDPOffer: ${room}`);
                socket.broadcast.to(room).emit('broadcastSDPOffer', sdpOffer);
            }
        }
    });
    socket.on('responseSDPAnswer', (sdpOffer) => {
        console.log(`SDPAnswer: ${sdpOffer}`);
        for (let room of socket.rooms) {
            if (room != socket.id) {
                console.log(`broadcastSDPOffer: ${room}`);
                socket.broadcast.to(room).emit('broadcastSDPOffer', sdpOffer);
            }
        }
    });
    socket.on('broadcastICE', (ice) => {
        console.log(`broadcastICE`);

        for (let room of socket.rooms) {
            if (room != socket.id) {
                console.log(`broadcastICE: ${room}`);
                socket.broadcast.to(room).emit('broadcastICE', ice);
            }
        }
    });
    socket.on('iceReceive', () => {
        console.log(`iceReceive`);
    });

    socket.on("disconnect", (reason) => {
        console.log(`disconnected. reason: ${reason}`);
    });
});

app.use(express.static('static'));

app.get('/room', (req, res) => {
    res.sendFile(path.join(__dirname, "../", "static", "room.html"));
}); 

httpServer.listen(port, () => {
    console.log(`listening on: ${port}`);
});
