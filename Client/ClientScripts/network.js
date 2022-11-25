const url = window.location.hostname === 'wnjo.kanapka.eu' ? 'wss://wnjo.kanapka.eu/wss' : `ws://${window.location.hostname}:7777`

var socket;
var PlayerName = null;
var LoggedIn = false;
var QuickLog = localStorage.getItem("QuickLog");
const Connect = () => {
    let displayDelay = Date.now() - 3000;
    let messageCount = 0;
    socket = new WebSocket(url);
    socket.onmessage = (data) => {
        try {
            const message = JSON.parse(data.data);
            if (message.type === 'Welcome') {
                if (QuickLog !== null) {
                    socket.send(JSON.stringify({
                        type: "Account",
                        action: "Login",
                        QuickLog: QuickLog
                    }))
                }
                console.log("Received Server Response: Welcome");
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
            } else if (message.type === 'INFO') {
                if (messageCount > 3) return;
                const display = () => {
                    messageCount++;
                    const _msg = document.createElement('p');
                    _msg.classList.add('InfoDisplay');
                    if (message.status === 200) {
                        _msg.style.backgroundColor = "rgba(0, 255, 0, 0.5)";
                    } else if (message.status === 404) {
                        _msg.style.backgroundColor = "rgba(255, 0, 0, 0.5)";
                    } else if (message.status === 300) {
                        _msg.style.backgroundColor = "rgba(255, 135, 0, 0.5)";
                    }
                    _msg.textContent = message.message;
                    const element = document.body.appendChild(_msg);
                    setTimeout(() => {
                        element.remove();
                        messageCount--;
                    }, 3000)
                }
                if (displayDelay > Date.now()) {
                    setTimeout(display, displayDelay - Date.now());
                    displayDelay += 3000;
                } else {
                    display();
                    displayDelay = Date.now() + 3000;
                }
            }
        } catch (e) {
            console.log(e);
            console.log(data.data)
        }
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

const Update = () => {
    let StartTime = Date.now();
    socket.send(JSON.stringify({
        type: "SYNC",

    }))
    render();
    let TimeDifference = Date.now() - StartTime;
    setTimeout(Update, 1000 / 30 - TimeDifference);
}
Update();