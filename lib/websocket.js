"use strict";

const express = require("express");
const http = require("http");
const ws = require("ws");
const app = express();
const server = http.createServer(app);
const wss = new ws.Server({ server });

class WebSocketServer {
    constructor(platform) {
        this.platform = platform;
        wss.on('connection', (ws, req) => {
            var client = req.connection.remoteAddress + ":" + req.connection.remotePort;
            platform.clients[client] = ws;
            platform.log.debug("Connection Established From " + client);
            ws.on("close", () => {
                delete platform.clients[client];
                platform.log.debug(client + " Disconnected");
            });
            ws.on("error", (message) => {
                platform.log.error(message);
            });
            ws.on("message", (data) => {
                ws.send(JSON.stringify(platform.receiveMessage(data)));
            });
        });
        platform.log.info("Starting WebSocket Server");
        server.listen(4050, () => {
            platform.log.info("WebSocket Server Started At %j ", server.address());
        });
    }
}
exports.WebSocketServer = WebSocketServer;
//# sourceMappingURL=websocket.js.map
