const url = window.location.hostname === 'wnjo.kanapka.eu' ? 'wss://wnjo.kanapka.eu/wss' : `ws://${window.location.hostname}:7777`

let p = document.createElement('p')
p.style.zIndex = 1;
p.style.position = 'absolute';

let Debug = document.body.appendChild(p);

var socket;
var PlayerName = null;
var LoggedIn = false;
var QuickLog = localStorage.getItem("QuickLog");
const Connect = () => {
    socket = new WebSocket(url);
    socket.onmessage = (data) => {
        try {
            const message = JSON.parse(data);
            if (message.type === 'Welcome') {
                if (QuickLog !== null) {
                    socket.send(JSON.stringify({
                        type: "Account",
                        action: "Login",
                        QuickLog: QuickLog
                    }))
                }
            } else if (message.type === 'Login') {
                PlayerName = message.Name;
                localStorage.setItem("QuickLog", message.QuickLog);
                QuickLog = message.QuickLog;
            } else if (message.type === 'SYNC') {
                Players = message.body;
            } else if (message.type === 'Chunks') {
                message.body.forEach(chunk => {
                    Chunks.set(chunk.position, chunk.solids);
                })
            }
        } catch (e) { console.log(e); }
    }
    socket.onerror = () => {

    }
    socket.onclose = () => {
        Connect();
    }
}
Connect();

const login = (Name, Password) => {
    socket.send(JSON.stringify({
        type: "Account",
        action: "Login",
        Name: Name,
        Password: Password
    }))
}

const createAccount = (Name, Password) => {
    socket.send(JSON.stringify({
        type: "Account",
        action: "CreateAccount",
        Name: Name,
        Password: Password
    }))
}

const debug = (data) => {
    Debug.textContent = JSON.stringify(data);
}

const Update = () => {
    let StartTime = Date.now();
    render();
    let TimeDifference = Date.now() - StartTime;
    setTimeout(Update, 1000 / 30 - TimeDifference);
    debug({
        ExecuteTime: TimeDifference
    })
}
Update();