const config = {
    port: 3000,
    WebSocketPort: 7777,
    WorldSettings: {
        ServerName: "WNJO Server",
        WorldSeed: 1234,
        WorldSize: 5000,
        PlayerCap: 100
    }
}

const express = require('express');
const fs = require('fs');
const path = require('path');
const uuid = require('uuid');
const app = express();
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: config.WebSocketPort });

app.use(express.static(path.join(__dirname, 'Client')));

const Clients = new Map();
const Accounts = new Map();
const QuickLog = new Map();
const Players = new Map();

process.on('SIGINT', () => {
    Accounts.forEach((value, key) => {
        // new file for each account to prevent corruption
    })
    process.exit();
})

wss.on('connection', (ws, req) => {
    ws.onmessage = (data) => {
        try {
            const message = JSON.parse(data.data);
            if (message.type === 'Account') {
                handleAccountActions(ws, message);
            } else if (message.type === 'SYNC') {

            }
        } catch (e) {
            console.log(e);
        }
    }
    ws.onopen = () => {
        sendJson(ws, {
            type: "Welcome"
        })
        console.log("welcome");
    }
    ws.onclose = (data) => {
        Clients.delete(ws);
    }
    ws.onerror = (data) => {
        console.log(data.message);
    }
})

const handleAccountActions = (ws, data) => {
    if (data.action === 'Login') {
        if ("QuickLog" in data) {
            let ql = QuickLog.get(data.QuickLog);
            if (ql !== undefined) {
                let acc = Accounts.get(ql);
                if (acc !== undefined) {
                    let _quicklog = uuid.v1();
                    sendJson(ws, {
                        type: "Login",
                        Name: acc.Name,
                        QuickLoginKey: _quicklog
                    })
                    Clients.set(ws, { _id: acc._id });
                    QuickLog.set(_quicklog, data.Name);
                    sendMessage(ws, {
                        status: 200,
                        message: "You have been successfully quick logged in."
                    })
                }
            }
            return;
        }
        if ("Name" in data) {
            let acc = Accounts.get(data.Name)
            if (acc) {
                if ("Password" in data) {
                    if (acc.Password === data.Password) {
                        let _quicklog = uuid.v1();
                        sendJson(ws, {
                            type: "Login",
                            Name: acc.Name,
                            QuickLoginKey: _quicklog
                        })
                        Players.set(data.Name, new Player(acc._id, acc.Name));
                        Clients.set(ws, { _id: acc._id });
                        QuickLog.set(_quicklog, data.Name);
                        sendMessage(ws, {
                            status: 200,
                            message: "You have been successfully logged in. Welcome " + data.Name
                        })
                    } else {
                        sendMessage(ws, {
                            status: 404,
                            message: "Wrong password. Please try again."
                        })
                    }
                } else {
                    sendMessage(ws, {
                        status: 404,
                        message: "Error: Missing Password."
                    })
                }
            } else {
                sendMessage(ws, {
                    status: 404,
                    message: "An account with that name doesnt exist"
                })
            }
        } else {
            sendMessage(ws, {
                status: 404,
                message: "Error: Missing Name."
            })
        }
    } else if (data.action === 'CreateAccount') {
        if (Accounts.get(data.Name)) return sendMessage(ws, {
            status: 404,
            message: "An account with that name already exists."
        });
        if ("Name" in data) {
            if ("Password" in data) {
                let newUUID = uuid.v1();
                let _quicklog = uuid.v1();
                Accounts.set(data.Name, new AccountInformation(data.Name, data.Password, newUUID));
                sendJson(ws, {
                    type: "Login",
                    Name: data.Name,
                    QuickLoginKey: _quicklog
                })
                QuickLog.set(_quicklog, data.Name);
                Players.set(data.Name, new Player(newUUID, data.Name));
                Clients.set(ws, { _id: newUUID });
                Players.get(data.Name).setData(ws, {
                    position: {
                        x: 0,
                        y: 0
                    },
                    rotation: 0
                })
                return sendMessage(ws, {
                    status: 200,
                    message: `Successfully created a new account ${data.Name}.`
                })
            } else {
                return sendMessage(ws, {
                    status: 404,
                    message: "Password input not found."
                })
            }
        } else {
            return sendMessage(ws, {
                status: 404,
                message: "Name input not found."
            })
        }
    }
}

const sendJson = (ws, data) => {
    ws.send(JSON.stringify(data));
}

const sendMessage = (ws, data) => {
    sendJson(ws, {
        type: "INFO",
        status: data.status,
        message: data.message
    })
}

class AccountInformation {
    constructor(Name, Password, _id) {
        this.Name = Name;
        this.Password = Password;
        this._id = _id;
    }
}

class Player {
    constructor(uuid, Name) {
        // generate new player around the map
        // random position
        this.uuid = uuid; // more auth
        this.Name = Name; // auth kinda
        this.position = {
            x: Math.floor((Math.random() - 0.5) * 2 * 5000),
            y: Math.floor((Math.random() - 0.5) * 2 * 5000)
        }
        this.rotation = 0;
    }

    toClient() {
        return {
            Name: this.Name,
            position: this.position,
            rotation: this.rotation
        }
    }

    setData(ws, data) {
        if (Clients.get(ws)._id === this.uuid) {
            let diff = {
                x: data.position.x - data.position.x,
                y: data.position.y - data.position.y
            }
            let distance = Math.sqrt(diff.x * diff.x + diff.y * diff.y);
            if (distance < 2) {
                this.position.x = data.position.x;
                this.position.y = data.position.y;
            }
            this.rotation = data.rotation;
            let _sendData = [];
            Players.forEach((value, key) => {
                let diff = {
                    x: value.position.x - this.position.x,
                    y: value.position.y - this.position.y
                }
                if (Math.sqrt(diff.x * diff.x + diff.y * diff.y) < 300) {
                    _sendData.push(value.toClient());
                }
            })
            sendJson(ws, {
                type: "SYNC",
                body: _sendData
            })
        } else {
            return;
        }
    }
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
})

app.get('/Client/ClientScripts/network.js', (req, res) => {
    res.sendFile(path.join(__dirname, '/Client/ClientScripts/network.js'));
})

app.get('/Client/ClientScripts/renderer.js', (req, res) => {
    res.sendFile(path.join(__dirname, '/Client/ClientScripts/renderer.js'));
})

app.get('/Client/ClientScripts/userInput.js', (req, res) => {
    res.sendFile(path.join(__dirname, '/Client/ClientScripts/userInput.js'));
})

app.get('/Client/ClientStyles/styles.css', (req, res) => {
    res.sendFile(path.join(__dirname, '/Client/ClientStyles/styles.css'));
})

app.listen(config.port, () => {
    console.log(`Listening on ${config.port}!`);
})