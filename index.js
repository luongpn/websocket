const decoder = new TextDecoder("utf-8");

const MESSAGE_ENUM = Object.freeze({
  JOIN_ROOM: "JOIN_ROOM",
  START: "START",
  SEND_DATA: "SEND_DATA",
  KICK: "KICK",
  LEAVE_ROOM: "LEAVE_ROOM"
});

const ROOM_STATUS = Object.freeze({
  START: "START",
  PENDING: "PENDING"
})

import uWS from "uWebSockets.js";
import { uuid } from "uuidv4";
const port = 3001;


let socketMap = new Map();

const app = uWS
  .App()
  .ws("/ws", {
    idleTimeout: 0,
    maxLifetime: 0,
    maxPayloadLength: 1024 * 1024 * 1024,
    open: (ws) => {
      ws.id = uuid();
      ws.send(JSON.stringify({
        connected: true,
        uuid: ws.id
      }));
    },

    message: (ws, message, isBinary) => {
      try {
        let clientMsg = JSON.parse(decoder.decode(message));
        let serverMsg = {};

        let room = socketMap.get(clientMsg.body.roomName);

        switch (clientMsg.type) {
          case MESSAGE_ENUM.JOIN_ROOM:
            if (ws.isSubscribed(`${clientMsg.body.roomName}`)) return;
            ws.subscribe(`${clientMsg.body.roomName}`);

            if (!room) {
              socketMap.set(clientMsg.body.roomName, {
                masterId: ws.id,
                status: ROOM_STATUS.PENDING,
                members: [{
                  username: clientMsg?.username,
                  uuid: ws.id
                }]
              })
            } else {
              socketMap.set(clientMsg.body.roomName, {
                ...room,
                members: [...room.members, {
                  username: clientMsg?.username,
                  uuid: ws.id
                }]
              })
            }

            room = socketMap.get(clientMsg.body.roomName);

            serverMsg = {
              type: MESSAGE_ENUM.JOIN_ROOM,
              body: clientMsg.body,
              room
            };

            app.publish(
              `${clientMsg.body.roomName}`,
              JSON.stringify(serverMsg)
            );

            break;

          case MESSAGE_ENUM.START:
            socketMap.set(clientMsg.body.roomName, {
              ...room,
              status: ROOM_STATUS.START,
            })

            room = socketMap.get(clientMsg.body.roomName);

            serverMsg = {
              type: MESSAGE_ENUM.START,
              body: clientMsg.body,
              room
            };

            app.publish(
              `${clientMsg.body.roomName}`,
              JSON.stringify(serverMsg)
            );
            break;

          case MESSAGE_ENUM.KICK:
            serverMsg = {
              type: MESSAGE_ENUM.KICK,
              body: clientMsg.body,
              room
            };

            room.members = room.members.filter(a => a.uuid != clientMsg.body.memberId);

            app.publish(
              `${clientMsg.body.roomName}`,
              JSON.stringify(serverMsg)
            );

            break;

          case MESSAGE_ENUM.LEAVE_ROOM:
            serverMsg = {
              type: MESSAGE_ENUM.LEAVE_ROOM,
              body: clientMsg.body,
              room
            };

            room.members = room.members.filter(a => a.uuid != ws.id);

            app.publish(
              `${clientMsg.body.roomName}`,
              JSON.stringify(serverMsg)
            );

            break;

          case MESSAGE_ENUM.SEND_DATA:
            serverMsg = {
              type: MESSAGE_ENUM.SEND_DATA,
              senderId: ws.id,
              body: clientMsg.body,
              room
            };

            app.publish(
              `${clientMsg.body.roomName}`,
              JSON.stringify(serverMsg)
            );
            break;
        }
      } catch (err) {

      }
    },

    close: (ws, code, message) => {
      try {
      } catch (error) { }
    },

  })
  .listen(port, () => {
    console.log(`Listening to port ${port}`)
  });
