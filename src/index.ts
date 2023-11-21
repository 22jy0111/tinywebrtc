import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from './models';

const app = express();
const port = 3001;
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer);
const path = require("path");

io.of('/').on('connection', (socket) => {
    console.log(`connect: ${socket.id}`);

    socket.on('join', (roomId) => {
        socket.join(roomId);
        console.log(`join room: ${roomId}`);

        let num = io.of('/').adapter.rooms.get(roomId)?.size;
        if (num && num >= 2) {
            console.log(`-------------------------------------`);
            console.log(`START`);
            console.log(`-------------------------------------`);
            for (let room of socket.rooms) {
                if (room != socket.id) {
                    socket.broadcast.to(room).emit('requestSDPOffer');
                    console.log(`server-send requestSDPOffer ${socket.id}`);
                    break;
                }
            }
        }
    })

    socket.on('responseSDPOffer', (sdpOffer) => {
        console.log(`client-send SDPOffer ${socket.id} length:${sdpOffer.length}`);
        for (let room of socket.rooms) {
            if (room != socket.id) {
                socket.broadcast.to(room).emit('broadcastSDPOffer', sdpOffer);
                console.log(`server-send broadcastSDPOffer ${socket.id} room:${room}/${socket.rooms.size}`);
            }
        }
    });

    socket.on('responseSDPAnswer', (sdpOffer) => {
        console.log(`client-send SDPAnswer ${socket.id} length:${sdpOffer.length}`);
        for (let room of socket.rooms) {
            if (room != socket.id) {
                socket.broadcast.to(room).emit('broadcastSDPOffer', sdpOffer);
                console.log(`server-send broadcastSDPOffer ${socket.id} room:${room}/${socket.rooms.size}`);
            }
        }
    });

    socket.on('broadcastICE', (ice) => {
        console.log(`client-send broadcastICE ${socket.id}`)
        for (let room of socket.rooms) {
            if (room != socket.id) {
                socket.broadcast.to(room).emit('broadcastICE', ice);
                console.log(`server-send broadcastICE room:${room}/${socket.rooms.size}`);
            }
        }
    });

    socket.on('sdpAnswerReceive', () => {
        console.log(`client-send sdpAnswerReceive ${socket.id}`);
        for (let room of socket.rooms) {
            if (room != socket.id) {
                io.sockets.in(room).emit('requestICE');
                console.log(`server-send requestICE room:${room}/${socket.rooms.size}`);
            }
        }
    });

    socket.on('iceReceive', () => {
        console.log(`client-send iceReceive ${socket.id}`);
    });

    socket.on("disconnect", (reason) => {
        console.log(`disconnected: ${socket.id} reason: ${reason}`);
    });
});

app.use(express.static('static'));

app.get('/room', (req, res) => {
    res.sendFile(path.join(__dirname, "../", "static", "room.html"));
}); 

httpServer.listen(port, () => {
    console.log(`listening on: ${port}`);
});
