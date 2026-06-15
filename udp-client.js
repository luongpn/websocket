import dgram from 'dgram';
const client = dgram.createSocket('udp4');
import { uuid } from "uuidv4";

client.send(
    Buffer.from(JSON.stringify({
        body: {
        },
        type: "JOIN_ROOM",
        username: "luong",
        uuid: uuid()
    })),
    3002,
    '127.0.0.1',
    (err) => {
        if (err) console.error(err);
    }
);

client.on('message', (msg) => {
    console.log('Response:', msg.toString());
});