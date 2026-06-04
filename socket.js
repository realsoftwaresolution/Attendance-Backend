const WebSocket = require("ws");


let localClient = null;

const pendingRequests = new Map();

function initializeSocket(server) {
    const wss = new WebSocket.Server({ server });

    console.log("✔ WebSocket server running");

    wss.on("connection", (ws) => {

        localClient = ws;

        console.log("Local PC Connected");

        ws.send(JSON.stringify({
            event: "connected",
            data: {
                status: true,
                machineName: process.env.COMPUTERNAME || "",
                connectedAt: new Date()
            }
        }));

        ws.on("message", (message) => {
            try {

                const data = JSON.parse(message.toString());

                if (data.requestId && pendingRequests.has(data.requestId)) {

                    const resolve = pendingRequests.get(data.requestId);

                    resolve(data.data);

                    pendingRequests.delete(data.requestId);
                }

                if (data.event === "connected") {
                    console.log("[CLIENT_CONNECTED]", data.data);
                }

            } catch (err) {
                console.log(err);
            }
        });

        ws.on("close", () => {
            console.log("Local PC Disconnected");
            localClient = null;
        });

    });
}

async function requestLocalPC(event, payload) {
    return new Promise((resolve, reject) => {
        if (!localClient) {
            return reject(new Error("Local PC Offline"));
        }

        const requestId = Date.now().toString();

        pendingRequests.set(requestId, resolve);

        localClient.send(
            JSON.stringify({
                requestId,
                event,
                payload,
            }),
        );

        setTimeout(() => {
            if (pendingRequests.has(requestId)) {
                pendingRequests.delete(requestId);

                reject(new Error("Request timeout"));
            }
        }, 30000);
    });
}

module.exports = {
    initializeSocket,
    requestLocalPC,
};
