import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from './models';

const app = express();
const port = 3001;
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer);

io.on('connection', (socket) => {
    console.log(`connect: ${socket.id}`);

    socket.emit('requestSDPOffer');
    console.log(`requestSDPOffer`);

    socket.on('responseSDPOffer', (sdpOffer) => {
        //console.log(`SDPOffer: ${sdpOffer}`);
        console.log(`SDPOffer`);
        socket.broadcast.emit('broadcastSDPOffer', sdpOffer);
    });
    socket.on('responseSDPAnswer', (sdpOffer) => {
        //console.log(`SDPAnswer: ${sdpOffer}`);
        console.log(`SDPAnswer`);
        socket.broadcast.emit('broadcastSDPOffer', sdpOffer);
    });
    socket.on('broadcastICE', (ice) => {
        console.log(`broadcastICE`);
        socket.broadcast.emit('broadcastICE', ice);
    });
    socket.on('iceRecieve', () => {
        console.log(`iceRecieve`);
    });

    socket.on("disconnect", (reason) => {
        console.log(`disconnected. reason: ${reason}`);
    });
});

app.use(express.static('static'));

httpServer.listen(port, () => {
    console.log(`listening on: ${port}`);
});
