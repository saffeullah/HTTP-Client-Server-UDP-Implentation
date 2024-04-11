const dgram = require('dgram');

const client = dgram.createSocket('udp4');

const serverAddress = '127.0.0.1';
const serverPort = 3035;

// Set up the event listener for messages
client.on('message', (msg, rinfo) => {
    const packet = JSON.parse(msg);

    if (packet.type === 'SYN-ACK') {
        // Handle the SYN-ACK packet, e.g., send an ACK packet
        console.log('Received SYN-ACK. Initiating ACK...');
        const ackPacket = {
            type: 'ACK',
            seqNumber: 2, // Adjust the sequence number as needed
            peerAddress: serverAddress,
            peerPort: serverPort,
            payload: Buffer.from(''), // No payload in the ACK packet
        };

        client.send(Buffer.from(JSON.stringify(ackPacket)), serverPort, serverAddress, (err) => {
            if (err) {
                console.error('Error sending ACK packet:', err);
            } else {
                console.log('ACK packet sent successfully');
            }
            client.close();
        });
    } else if (packet.type === 'DATA') {
        // Handle other responses, e.g., print the received data
        const { status, headers, body } = JSON.parse(packet.payload.data);
        console.log('Received response:');
        console.log('Status:', status);
        console.log('Headers:', headers);
        console.log('Body:', body);
        client.close();
    } else {
        console.error('Received packet of unexpected type:', packet.type);
        client.close();
    }
});

// Step 1: SYN (Client to Server)
const synPacket = {
    type: 'SYN',
    seqNumber: 1, // Initial sequence number for the handshake
    peerAddress: serverAddress,
    peerPort: serverPort,
    payload: Buffer.from(''), // No payload in the SYN packet
};

client.send(Buffer.from(JSON.stringify(synPacket)), serverPort, serverAddress, (err) => {
    if (err) {
        console.error('Error sending SYN packet:', err);
        client.close();
    } else {
        console.log('SYN packet sent successfully');
    }
});

// Example HTTP GET request
const getRequest = {
    method: 'GET',
    url: 'data/abc.txt',
};

const message = JSON.stringify(getRequest);

// const postRequest = {
//     method: 'POST',
//     url: 'data/you.txt',
//     headers: {
//         overwrite: 'true',
//         // Add other headers as needed
//     },
//     payload: {
//         data: 'this is test',
//     },
// };
//
// const message = JSON.stringify(postRequest);

const packet = {
    type: 'DATA',
    seqNumber: 1,
    peerAddress: serverAddress,
    peerPort: serverPort,
    payload: Buffer.from(message),
};

// Step 4: Send the actual data packet
client.send(Buffer.from(JSON.stringify(packet)), serverPort, serverAddress, (err) => {
    if (err) {
        console.error('Error sending packet:', err);
        client.close();
    } else {
        console.log('Packet sent successfully');
    }
});
