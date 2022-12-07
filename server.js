const config = {
    port: 3000,
    WebSocketPort: 7777,
    WorldSettings: {
        ServerName: "WNJO Server",
        Description: "A WNJO server",
        WorldSeed: 1234,
        WorldSize: 5000,
        PlayerCap: 100
    },
    AdminPanelKey: '123' // replace with whatever you want the password to be
}

/**
 * npm imports:
 * - express
 * - cryptkhen
 * - uuid
 * - ws
 * - simplex noise
 */

const express = require('express');
const cryptkhen = require('@ryanbekhen/cryptkhen')
const simplex = require('simplex-noise');
const noise = simplex.createNoise2D(() => config.WorldSettings.WorldSeed);
const aes256 = new cryptkhen.AES256Encryption(config.AdminPanelKey);
const os = require('os');
const fs = require('fs');
const path = require('path');
const uuid = require('uuid');
const app = express();
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: config.WebSocketPort });

app.use(express.static(path.join(__dirname, 'Client')));

const Clients = new Map();
var Accounts = new Map();
fs.readFile(path.join(__dirname, 'accounts/Accounts.json'), (err, data) => {
    if (err) return console.log("Was unable to load account data.");
    const parsed = JSON.parse(data);
    parsed.forEach(e => {
        Accounts.set(e.key, e.value);
    })
});
const QuickLog = new Map();
var Players = new Map();
fs.readFile(path.join(__dirname, './WorldSave/Players.json'), (err, data) => {
    if (err) return console.log("Was unable to load player data.");
    const parsed = JSON.parse(data);
    parsed.forEach(e => {
        Players.set(e.key, new Player(e.value.uuid, e.value.Name, e.value.position, e.value.rotation, e.value.inventory, e.value.stats));
    })
});
var Chunks = [];
fs.readFile(path.join(__dirname, './WorldSave/Chunks.json'), (err, data) => {
    if (err) return console.log("Was unable to load chunk data.");
    const parsed = JSON.parse(data);
    Chunks = parsed;
});

process.on('SIGINT', () => {
    process.exit();
})

process.on('exit', () => {
    let _a = [];
    Accounts.forEach((value, key, map) => {
        _a.push({
            key: key,
            value: value
        })
    })
    fs.writeFileSync('./accounts/Accounts.json', JSON.stringify(_a));
    let _p = [];
    Players.forEach((value, key, map) => {
        _p.push({
            key: key,
            value: {
                uuid: value.uuid,
                Name: value.Name,
                position: value.position,
                rotation: value.rotation,
                inventory: value.inventory,
                stats: value.stats
            }
        })
    })
    fs.writeFileSync(path.join(__dirname, 'WorldSave/Players.json'), JSON.stringify(_p));
    console.log("\nSaved players, and accounts.");
})

wss.on('connection', (ws, req) => {
    ws.onmessage = (data) => {
        try {
            const message = JSON.parse(data.data);
            if (message.type === 'Account') {
                handleAccountActions(ws, message);
            } else if (message.type === 'SYNC') {
                let player = Players.get(message.Name);
                if (player !== undefined) {
                    let delivered = player.setData(ws, message);
                    if (!delivered) return sendMessage(ws, {
                        status: 404,
                        message: "Error while syncing, please refresh the website."
                    })
                }
            } else if (message.type === 'Inventory') {
                inventoryActions(ws, message);
            } else if (message.type === 'PlayerAction') {
                playerActions(ws, message);
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
    if (data === undefined) {
        console.log("An internal error occurred.");
        return sendMessage(ws, {
            status: 404,
            message: "An internal error occurred."
        })
    }
    if ("Name" in data) {
        if ("Password" in data) {
            let acc = Accounts.get(data.Name)
            if (data.action === 'Login') {
                if (acc) {
                    if (aes256.decrypt(Buffer.from(acc.Password, 'base64')).toString() === data.Password) {
                        let _quicklog = uuid.v1();
                        sendJson(ws, {
                            type: "Login",
                            Name: acc.Name,
                            coins: acc.points,
                            QuickLoginKey: _quicklog
                        })
                        let plr = Players.get(acc.Name);
                        if (plr === undefined) {
                            Players.set(acc.Name, new NewPlayer(acc._id, acc.Name));
                            console.log('new player')
                        }
                        Clients.set(ws, { _id: acc._id });
                        QuickLog.set(_quicklog, acc.Name);
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
                    return sendMessage(ws, {
                        status: 404,
                        message: "Account doesn't exist."
                    })
                }
            } else if (data.action === 'CreateAccount') {
                if (acc) return sendMessage(ws, {
                    status: 404,
                    message: "An account with that name already exists."
                });
                if (data.Password.length < 5) {
                    return sendMessage(ws, {
                        status: 404,
                        message: "Password is too short."
                    })
                } else if (data.Password.length > 32) {
                    return sendMessage(ws, {
                        status: 404,
                        message: "Password is too long."
                    })
                } else if (data.Name.length < 3) {
                    return sendMessage(ws, {
                        status: 404,
                        message: "Name is too short."
                    })
                } else if (data.Name.length > 16) {
                    return sendMessage(ws, {
                        status: 404,
                        message: "Name is too long."
                    })
                }
                let newUUID = uuid.v1();
                let _quicklog = uuid.v1();
                let password = data.Password;
                const passBuffer = Buffer.from(password);
                password = aes256.encrypt(passBuffer).toString('base64');
                const newAcc = Accounts.set(data.Name, new AccountInformation(data.Name, password, newUUID));
                sendJson(ws, {
                    type: "Login",
                    Name: data.Name,
                    coins: newAcc.points,
                    QuickLoginKey: _quicklog
                })
                QuickLog.set(_quicklog, data.Name);
                if (!Players.has(data.Name)) {
                    Players.set(data.Name, new NewPlayer(newUUID, data.Name));
                }
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
            }
        }
    } else if ("QuickLog" in data) {
        let _quicklogaccess = QuickLog.get(data.QuickLog);
        if (_quicklogaccess !== undefined) {
            let acc = Accounts.get(_quicklogaccess);
            if (acc !== undefined) {
                let _quicklog = uuid.v1();
                sendJson(ws, {
                    type: "Login",
                    Name: acc.Name,
                    coins: acc.points,
                    QuickLoginKey: _quicklog
                })
                Clients.forEach((value, key, map) => {
                    if (value._id === acc._id) {
                        key.terminate();
                    }
                })
                Clients.set(ws, { _id: acc._id });
                QuickLog.set(_quicklog, acc.Name);
                sendMessage(ws, {
                    status: 200,
                    message: "You have been successfully quick logged in."
                })
            }
        }
        return;
    }
}

const inventoryActions = (ws, data) => {
    if (data.action === 'move') {

    }
}

const playerActions = (ws, data) => {

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
        this.points = 0;
        this.status = 'User';
    }
}

const generateChunks = (position) => {
    const chunkPosition = {
        x: Math.floor(position.x / 256),
        y: Math.floor(position.y / 256)
    }
    for (let y = 0; y <= 1; y++) {
        for (let x = 0; x <= 1; x++) {
            let chunk = Chunks.find(obj => obj.x === chunkPosition.x + x && obj.y === chunkPosition.y + y);
            if (chunk !== undefined) continue;
            let newchunk = {
                x: chunkPosition.x + x,
                y: chunkPosition.y + y,
                Solids: []
            }
            for (let a = 0; a < 8; a++) {
                for (let b = 0; b < 8; b++) {
                    let height = noise(chunkPosition.x * 256 + a * 16, chunkPosition.y * 256 + b * 16);
                    if (height > 0.8) {
                        newchunk.Solids.push({
                            id: 0,
                            position: {
                                x: chunkPosition.x * 256 + a * 16, 
                                y: chunkPosition.y * 256 + b * 16
                            }
                        })
                    }
                }
            }
        }
    }
}

class Player {
    constructor(uuid=String, Name=String, position, rotation=Number, inventory, stats) {
        // generate new player around the map
        // random position
        this.uuid = uuid; // more auth
        this.Name = Name; // auth kinda
        this.position = position;
        this.rotation = rotation;
        this.inventory = inventory;
        this.isSleeping = false;
        this.stats = stats;
    }

    toClient() {
        return {
            Name: this.Name,
            position: this.position,
            rotation: this.rotation
        }
    }

    setData(ws, data) {
        /**
         * Required
         * position
         * rotation
         * 
         */
        let Client = Clients.get(ws)
        if (Client === undefined) return sendMessage(ws, {
            status: 404,
            message: "Client has been logged out on the server, please relogin again."
        })
        if (Client._id === this.uuid) {
            if (!("position" in data) || !("rotation" in data)) {
                sendMessage(ws, {
                    status: 404,
                    message: "Error: Error sync parameters."
                })
                return false;
            }
            let diff = {
                x: this.position.x - data.position.x,
                y: this.position.y - data.position.y
            }
            let distance = Math.abs(diff.x) + Math.abs(diff.y);
            if (distance <= 2) {
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
                if (Math.abs(diff.x) < 300 && Math.abs(diff.y) < 300) {
                    _sendData.push(value.toClient());
                }
            })
            sendJson(ws, {
                type: "SYNC",
                body: _sendData
            })
            return true;
        }
        sendMessage(ws, {
            status: 404,
            message: JSON.stringify(Client) + JSON.stringify(this)
        })
        return false;
    }

    addItem(ws, item) {
        let Client = Clients.get(ws)
        if (Client === undefined) return sendMessage(ws, {
            status: 404,
            message: "Client has been logged out on the server, please relogin again."
        })
        if (Client._id === this.uuid) {
            for (let i = 0; i < this.inventory.length; i++) {
                
            }
        }
    }
}

class NewPlayer extends Player {
    constructor(uuid, Name) {
        // generate new player around the map
        // random position
        let position = {
            x: Math.floor((Math.random() - 0.5) * 2 * 5000),
            y: Math.floor((Math.random() - 0.5) * 2 * 5000)
        }
        position = { x: 0, y: 0 } // temporary debug setpos to send everyone to 0 0 
        let inventory = [];
        for(let i = 0; i < 12; i++) {
            let item = {
                Name: null,
                Quantity: 0,
                Properites: []
            }
            inventory.push(item);
        }
        let stats = {
            health: 45 + Math.floor(Math.random() * 20),
            food: 70 + Math.floor(Math.random() * 50),
            water: 80 + Math.floor(Math.random() * 50),
            bleeding: 0,
            radiation: 0
        }

        super(uuid, Name, position, 0, inventory, stats);
    }
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
})
app.get('/info', (req, res) => {
    res.send({
        ServerName: config.WorldSettings.ServerName,
        PlayerCap: config.WorldSettings.PlayerCap,
        WorldSize: config.WorldSettings.WorldSize,
        Description: config.WorldSettings.Description,
        OnlinePlayers: Clients.size,
        officialServer: true
    })
})

app.get('/Client/ClientScripts/network.js', (req, res) => {
    res.sendFile(path.join(__dirname, '/Client/ClientScripts/network.js'));
})

app.get('/favicon.ico', (req, res) => {
    res.sendFile(path.join(__dirname, '/favicon.ico'));
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

app.get('/admin', (req, res) => {
    let options = req.url.replace("/admin?", "").split(";").filter(obj => obj !== '');
    options.forEach(value => {
        let ss = value.split(":");
        if (ss[0] === 'key' && ss[1] === config.AdminPanelKey) {
            res.sendFile(path.join(__dirname, 'adminPanel.html'));
        }
    })
})

var cpuUsage = process.cpuUsage();

app.post('/admin', (req, res) => {
    let options = req.url.replace("/admin?", "").split(";").filter(obj => obj !== '');
    options.forEach(value => {
        let ss = value.split(":");
        if (ss[0] === 'key' && ss[1] === config.AdminPanelKey) {
            cpuUsage = process.cpuUsage(cpuUsage);
            onlinePlayers = [];
            Players.forEach((value, key, map) => {
                onlinePlayers.push(value.Name)
            })
            res.send({
                memory: Math.round(cpuUsage.user / 1024 / 1024 * 1000) / 1000,
                Players: onlinePlayers
            })
        }
    })
})

app.use('/client', express.static(__dirname + '/Client'));

app.listen(config.port, () => {
    console.log(`Listening on ${config.port}!`);
})