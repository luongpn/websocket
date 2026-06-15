import dgram from 'node:dgram';
const server = dgram.createSocket('udp4');
import { uuid } from "uuidv4";

export const MESSAGE_ENUM = Object.freeze({
    INIT: 'INIT',
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

const socketMap = new Map();
const decoder = new TextDecoder("utf-8");

server.on('listening', () => {
    const address = server.address();
    console.log(`UDP Server listening on ${address.address}:${address.port}`);
});


server.on('message', (msg, rinfo) => {
    try {

        console.log(
            `Received: ${msg.toString()} from ${rinfo.address}:${rinfo.port}`
        );

        let clientMsg = JSON.parse(msg.toString());
        let serverMsg = {};

        if (!clientMsg.body?.roomName || !clientMsg?.uuid || !clientMsg?.username) {
            return;
        }

        let room = socketMap.get(clientMsg.body.roomName);



        switch (clientMsg.type) {
            case MESSAGE_ENUM.JOIN_ROOM:
                if (!room) {
                    socketMap.set(clientMsg.body.roomName, {
                        masterId: clientMsg?.uuid,
                        status: ROOM_STATUS.PENDING,
                        members: [{
                            username: clientMsg?.username,
                            uuid: clientMsg?.uuid,
                            rinfo_port: rinfo.port,
                            rinfo_address: rinfo.address
                        }]
                    })
                } else {
                    const foundMember = room?.members?.find(a => a.uuid == clientMsg?.uuid)

                    if (!foundMember) return;

                    socketMap.set(clientMsg.body.roomName, {
                        ...room,
                        members: [...room.members, {
                            username: clientMsg?.username,
                            uuid: clientMsg?.uuid,
                            rinfo_port: rinfo.port,
                            rinfo_address: rinfo.address
                        }]
                    })
                }

                room = socketMap.get(clientMsg.body.roomName);

                serverMsg = {
                    type: MESSAGE_ENUM.JOIN_ROOM,
                    senderId: clientMsg?.uuid,
                    body: clientMsg.body,
                    room: room
                };

                break;

            case MESSAGE_ENUM.START:
                socketMap.set(clientMsg.body?.roomName, {
                    ...room,
                    status: ROOM_STATUS.START,
                })

                room = socketMap.get(clientMsg.body?.roomName);

                serverMsg = {
                    type: MESSAGE_ENUM.START,
                    senderId: clientMsg?.uuid,
                    body: clientMsg.body,
                    room
                };

                break;

            case MESSAGE_ENUM.KICK:
                serverMsg = {
                    type: MESSAGE_ENUM.KICK,
                    senderId: clientMsg?.uuid,
                    body: clientMsg.body,
                    room
                };

                room.members = room.members.filter(a => a.uuid != clientMsg?.body?.memberId);

                break;

            case MESSAGE_ENUM.LEAVE_ROOM:
                serverMsg = {
                    type: MESSAGE_ENUM.LEAVE_ROOM,
                    senderId: clientMsg?.uuid,
                    body: clientMsg.body,
                    room
                };

                room.members = room.members.filter(a => a.uuid != clientMsg?.uuid);

                break;

            case MESSAGE_ENUM.SEND_DATA:
                serverMsg = {
                    type: MESSAGE_ENUM.SEND_DATA,
                    senderId: clientMsg?.uuid,
                    body: clientMsg.body,
                    room
                };

                break;
        }

        for (const member of room.members) {
            console.log("🚀 ~ serverMsg:", JSON.stringify(serverMsg), member.rinfo_port, member.rinfo_address);
            server.send(JSON.stringify(serverMsg),
                member.rinfo_port,
                member.rinfo_address)
        }
    } catch (error) {

    }
});

server.bind(3002);