import { WebSocketServer } from "ws";

const trackClients = new Map();

export function createWebSocketServer(server){
    const wss = new WebSocketServer({ server });

    wss.broadcast = function (data) {
      const msg = JSON.stringify(data);
      for (const client of wss.clients) {
        if (client.readyState === 1) {
          client.send(msg);
        }
      }
    };
  
    wss.on("connection", (ws) => {
      ws.on('message', (raw) => {
        const msg = JSON.parse(raw);
        if (msg.type === 'join-track') {
          const uuid = msg.uuid;
          if (!trackClients.has(uuid)) {
            trackClients.set(uuid, new Set());
          }
          const clients = trackClients.get(uuid);
          if (clients.size >= 4) {
            ws.send(JSON.stringify({
              type: "track-capacity",
              message: "Track is full (max 4 users)."
            }));
            ws.close()
            return;
          }
          clients.add(ws);
          ws.trackUUID = uuid;
        }
      });

      ws.on('close', () => {
        if (ws.trackUUID) {
          const clients = trackClients.get(ws.trackUUID);
          if (clients){
            clients.delete(ws);
            if (clients.size == 0) {
              trackClients.delete(ws.trackUUID);
            }
          }
        }
      });
    });

    return wss;
}