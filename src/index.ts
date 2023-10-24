import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { ClientToServerEvents, ServerToClientEvents } from './models';

const app = express();
const port = 3001;
const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer);

io.on('connection', (socket) => {
    console.log(socket.id);
    socket.emit("hello", "from server");

    socket.on("message", (message) => {
        console.log(`from client: ${message}`);
    });

    socket.on("disconnect", (reason) => {
        console.log(`user disconnected. reason: ${reason}`);
    });
});

app.use(express.static('static'));

httpServer.listen(port, () => {
    console.log(`listening on: ${port}`);
});
