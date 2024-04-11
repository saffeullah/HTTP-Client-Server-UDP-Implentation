const dgram = require('dgram');
const fs = require('fs');
const path = require('path');
const server = dgram.createSocket('udp4');
let clientInfo = null; // To store client information during the handshake

const serverPort = 3035;
const directory = '/Applications/MAMP/htdocs/cnassignment3/data';

process.on('SIGINT', () => {
    console.log('Closing server gracefully...');

    // Close the server
    server.close((err) => {
        if (err) {
            console.error('Error closing server:', err);
        } else {
            console.log('Server closed.');
            setTimeout(() => {
                process.exit(); // Exit the process after a delay
            }, 1000); // Adjust the delay as needed
        }
    });
});

server.on('message', (msg, rinfo) => {
    try {
        const packet = JSON.parse(msg);

        if (packet.type === 'SYN') {
            // Step 2: SYN-ACK (Server to Client)
            const synAckPacket = {
                type: 'SYN-ACK',
                seqNumber: 1, // Initial sequence number for the handshake
                peerAddress: rinfo.address,
                peerPort: rinfo.port,
                payload: Buffer.from(''), // No payload in the SYN-ACK packet
            };

            server.send(Buffer.from(JSON.stringify(synAckPacket)), rinfo.port, rinfo.address, (err) => {
                if (err) {
                    console.error('Error sending SYN-ACK packet:', err);
                } else {
                    console.log('SYN-ACK packet sent successfully');
                    // Store client information for future communication
                    clientInfo = {
                        address: rinfo.address,
                        port: rinfo.port,
                    };
                }
            });
        } else if (packet.type === 'ACK' && clientInfo !== null && clientInfo.address === rinfo.address && clientInfo.port === rinfo.port) {
            // Handle the ACK received from the client after the SYN-ACK
            console.log('Received ACK from client. Handshake completed.');
            // Now, you can proceed with handling the actual UDP communication
            handleUDPCommunication(packet, clientInfo);
        } else if (packet.type === 'DATA' && clientInfo !== null && clientInfo.address === rinfo.address && clientInfo.port === rinfo.port) {
            // Handle the DATA packet received from the client
            handleUDPCommunication(packet, clientInfo);
        } else {
            console.error('Received packet of unexpected type:', packet.type);
        }
    } catch (error) {
        console.error('Error parsing JSON:', error);
    }
});

server.on('listening', () => {
    const address = server.address();
    console.log(`Server listening on ${address.address}:${address.port}`);
});

server.bind(serverPort);

function handleFileUpload(data) {
    const fileName = path.basename(data.url);
    const filePath = path.join(directory, fileName);
    const content = data.payload.data;
    const overwrite = data.headers && data.headers['overwrite'] === 'true';

    if (!overwrite && fs.existsSync(filePath)) {
        return {
            status: 409,
            headers: { 'Content-Type': 'text/plain' },
            body: 'File already exists. Use overwrite=true to overwrite',
        };
    } else {
        fs.writeFileSync(filePath, content);
        console.log(`File created or overwritten: ${filePath}`);
        return {
            status: 201,
            headers: { 'Content-Type': 'text/plain' },
            body: 'File created or overwritten successfully',
        };
    }
}


function handleGetRequest(url) {
    console.log(url);
    if (url === '/') {
        const fileNames = fs.readdirSync(directory);
        console.log(`Serving files in directory: ${directory}`);
        const httpResponse = {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fileNames),
        };
        return httpResponse;
    } else {
        return handleFileRequest(url);
    }
}

function handleFileRequest(url) {
    const fileName = path.basename(url);
    const filePath = path.join(directory, fileName);
    console.log("File path", filePath);

    if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        return {
            status: 200,
            headers: { 'Content-Type': 'text/plain' },
            body: content,
        };
    } else {
        return {
            status: 404,
            headers: { 'Content-Type': 'text/plain' },
            body: 'File not found',
        };
    }
}

function handleUDPCommunication(packet, clientInfo) {
    // Your existing UDP communication logic goes here
    // For example, you can handle GET, POST, or other types of messages
    const buffer = Buffer.from(packet.payload.data);
    const jsonString = buffer.toString();

    // Check if the JSON string is not empty before parsing
    if (jsonString.trim() !== '') {
        try {
            const parsedData = JSON.parse(jsonString);

            console.log('Testing packet payload:', parsedData);

            // Destructure the properties of the parsed JSON object
            const { url, method } = parsedData;

            console.log('URL:', url);
            console.log('Method:', method);

            let httpResponse;
            if (method === 'GET') {
                httpResponse = handleGetRequest(url);
                console.log(httpResponse);
            } else if (method === 'POST') {
                httpResponse = handleFileUpload(parsedData);
            } else {
                httpResponse = {
                    status: 400,
                    headers: { 'Content-Type': 'text/plain' },
                    body: 'Invalid request',
                };
            }

            const responsePacket = {
                type: 'DATA',
                seqNumber: packet.seqNumber, // Use the received sequence number
                peerAddress: clientInfo.address,
                peerPort: clientInfo.port,
                payload: Buffer.from(JSON.stringify(httpResponse)),
            };

            server.send(Buffer.from(JSON.stringify(responsePacket)), clientInfo.port, clientInfo.address, (err) => {
                if (err) {
                    console.error('Error sending response packet:', err);
                } else {
                    console.log('Response packet sent successfully');
                }
            });
        } catch (error) {
            console.error('Error parsing JSON:', error);
        }
    } else {
        console.error(''); //empty string
    }
}



