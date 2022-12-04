const url = window.location.hostname === 'wnjo.kanapka.eu' ? 'wss://wnjo.kanapka.eu/wss' : `ws://${window.location.hostname}:7777`
var socket;
var PlayerName = null;
var LoggedIn = false;
var QuickLog = localStorage.getItem("QuickLog");
var IsLoading = false;

const Debug = {
    Display: localStorage.getItem('DebugDisplay') !== null ? true : false,
    Log: (text) => {
        if (!Debug.Display) return;
        const p = document.createElement('p');
        p.className = 'Debug Message';
        let time = Date.now();
        let mm = time % 1000;
        time = Math.floor(time / 1000);
        let seconds = time % 60;
        if (seconds <= 9) seconds = "0" + seconds;
        let minutes = Math.floor(time / 60) % 60;
        if (minutes <= 9) minutes = "0" + minutes;
        let hours = Math.floor(time / 3600) % 24;
        p.innerHTML = `[${hours}:${minutes}:${seconds}:${mm}] ${text}`;
        const ww = document.getElementById('DebugWindow')
        ww.appendChild(p);
        setTimeout(() => {
            ww.scrollTop = ww.scrollHeight;
        }, 1)
    },
    Error: (text) => {
        if (!Debug.Display) return;
        const p = document.createElement('p');
        p.className = 'Debug Message';
        p.style.color = 'red';
        let time = Date.now();
        let mm = time % 1000;
        time = Math.floor(time / 1000);
        let seconds = time % 60;
        if (seconds <= 9) seconds = "0" + seconds;
        let minutes = Math.floor(time / 60) % 60;
        if (minutes <= 9) minutes = "0" + minutes;
        let hours = Math.floor(time / 3600) % 24;
        p.innerHTML = `(ERR) [${hours}:${minutes}:${seconds}:${mm}] ${text} (ERR)`;
        const ww = document.getElementById('DebugWindow')
        ww.appendChild(p);
        setTimeout(() => {
            ww.scrollTop = ww.scrollHeight;
        }, 1)
    },
    SetDisplay: (State) => {
        if (State) {
            localStorage.setItem('DebugDisplay', 'true');
            window.location.reload();
        } else if (localStorage.getItem('DebugDisplay') !== null) {
            localStorage.removeItem('DebugDisplay');
        }
    }
}
if (!Debug.Display) document.getElementById('DebugWindow').parentNode.remove();

const LoadingScreen = {
    isLoading: false,
    parts: {
        left: document.getElementsByClassName('LOADINGSCREEN left')[0],
        right: document.getElementsByClassName('LOADINGSCREEN right')[0],
        icon: document.getElementsByClassName('LOADINGSCREEN Icon')[0],
        main: document.getElementsByClassName('FRAME LOADINGSCREEN')[0]
    },
    setCurrentlyLoading: () => {
        LoadingScreen.parts.left.style.right = '50%';
        LoadingScreen.parts.right.style.left = '50%';
        LoadingScreen.parts.main.style.zIndex = '5';
        LoadingScreen.parts.icon.style.setProperty('--Size', '300px');
        Debug.Log('LoadingScreen: Initiated Loading Screen.')
    },
    stopLoading: () => {
        LoadingScreen.parts.left.style.right = '100%';
        LoadingScreen.parts.right.style.left = '100%';
        LoadingScreen.parts.icon.style.setProperty('--Size', '0px');
        setTimeout(() => {
            LoadingScreen.parts.main.style.zIndex = '-2';
        }, 500);
        Debug.Log('LoadingScreen: Stopped Loading Screen.')
    },
}

const waitForWebSocket = (ws, attempt) => {
    if (ws.readyState > 1) return;
    if (ws.readyState === 1) {
        if (QuickLog !== undefined || QuickLog !== null) {
            socket.send(JSON.stringify({
                type: "Account",
                action: "Login",
                QuickLog: QuickLog
            }))
            setTimeout(() => { if (!LoggedIn) openWindow('Login') }, 10);
            Debug.Log('Established WebSocket connection.');
        }
        return true;
    } else if (attempt > 20) {
        return false;
    } else {
        setTimeout(() => waitForWebSocket(ws, attempt + 1), 100);
        return false;
    }
}

const Connect = () => {
    let displayDelay = Date.now() - 3000;
    let messageCount = 0;
    socket = new WebSocket(url);
    waitForWebSocket(socket, 0);
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
                Debug.Log('Received login information from the server.');
                const rql = document.getElementsByClassName('RequireLogin');
                for (let i = 0; i < rql.length; i++) {
                    rql[i].classList.remove('RequireLogin');
                }
                LoggedIn = true;
                PlayerName = message.Name;
                localStorage.setItem("QuickLog", message.QuickLoginKey);
                QuickLog = message.QuickLoginKey;
                document.getElementById('WINDOW-Login').classList.add('iAmHiding');
                let accountDisplay = document.getElementById('WINDOW-Account');
                accountDisplay.innerHTML = '';

                const displayText = (message) => {
                    let par = document.createElement('p');
                    par.classList.add('TEXTBAR');
                    par.textContent = message;
                    accountDisplay.appendChild(par);
                }
                displayText(`Welcome to WNJo`);
                displayText(`Name: ${message.Name}`);
                displayText(`Coins: ${message.coins}`);
                Debug.Log('Setup account information window.');

                // par.textContent = `Name: ${message.Name}`;
                // accountDisplay.appendChild(par);

                const createButton = (text, func) => {
                    const button = document.createElement('button');
                    button.classList.add('BUTTON');
                    button.classList.add('simple');
                    button.textContent = text;
                    button.addEventListener('click', func);
                    accountDisplay.appendChild(button);
                }

                createButton('Delete Account', () => {
                    console.log('deleting account');
                })
                createButton('Logout', logout);

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
                        Debug.Log(message.message);
                    } else if (message.status === 404) {
                        _msg.style.backgroundColor = "rgba(255, 0, 0, 0.5)";
                        Debug.Error(message.message);
                    } else if (message.status === 300) {
                        _msg.style.backgroundColor = "rgba(255, 135, 0, 0.5)";
                        Debug.Log(`(WARNING) ${message.message}`);
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
            Debug.Error(e);
        }
    }
    socket.onerror = (e) => {
        Debug.Error('WebSocket connection error: ' + e.target);
    }
    socket.onclose = (e) => {
        Debug.Error('WebSocket connection closed. Attempting to reconnect...');
        Connect();
    }
}
Connect();

const JoinServer = () => {
    LoadingScreen.setCurrentlyLoading();
    setTimeout(() => {
        document.getElementById('FRAME-MainMenu').classList.add('iAmHiding');
    }, 500)
    setTimeout(() => {
        LoadingScreen.stopLoading();
    }, 600)
}

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

const figuremyshitout = () => {
    const inputName = document.getElementById("FRAME.Login.Name").value;
    const inputPassword = document.getElementById("FRAME.Login.Password").value;
    const isCreatingAccount = document.getElementById("FRAME.Login.isCreateNew").checked;
    if (isCreatingAccount) {
        createAccount(inputName, inputPassword);
        Debug.Log('Sending account information to server for: CreateAccount');
    } else {
        login(inputName, inputPassword);
        Debug.Log('Sending account information to server for: Login');
    }
}

const displayLoginWindow = () => {
    if (LoggedIn) {
        document.getElementById("WINDOW-Account").classList.toggle('iAmHiding');
    } else {
        document.getElementById("WINDOW-Login").classList.toggle('iAmHiding');
    }
}

const logout = () => {
    localStorage.removeItem('QuickLog');
    window.location.reload();
}

const openWindow = (id) => {
    const Windows = [
        'About',
        'Play',
        'ChangeLog',
        'Settings'
    ]
    document.getElementById("WINDOW-" + id).classList.toggle('iAmHiding');
    if (document.getElementById("WINDOW-" + id).classList.contains('iAmHiding')) {
        Debug.Log(`Closed ${id}`);
    } else {
        Debug.Log(`Opened ${id}`);
        if (id === 'Play') {
            setupThingi();
        }
    }
    Windows.forEach(e => {
        if (e !== id)
            document.getElementById("WINDOW-" + e).classList.add('iAmHiding');
    })
}

const Update = () => {
    let StartTime = Date.now();
    if (socket.readyState === 1) {
        socket.send(JSON.stringify({
            type: "SYNC",
            Name: PlayerName,
            position: RendererData.LocalPlayer.position,
            rotation: RendererData.LocalPlayer.rotation
        }));
        render();
    }
    let TimeDifference = Date.now() - StartTime;
    setTimeout(Update, 1000 / 30 - TimeDifference);
}
setTimeout(Update, 10);

const getMainServer = (json) => {
    const playwindow = document.getElementById('WINDOW-Play');
    playwindow.innerHTML = '';
    const newPar = (text) => {
        const par = document.createElement('p');
        par.classList.add('TEXTBAR');
        par.textContent = text;
        return playwindow.appendChild(par);
    }
    const createButton = (text, func) => {
        let b = document.createElement('button');
        b.classList.add('BUTTON');
        b.classList.add('simple');
        b.addEventListener('click', func);
        playwindow.appendChild(b);
    }
    newPar(`${json.ServerName} - ${json.OnlinePlayers} / ${json.PlayerCap}`)
    if (json.officialServer) {
        const off = newPar('[OFFICIAL SERVER]');
        off.style.backgroundColor = 'red';
        off.style.width = '163px';
        off.style.left = 'calc(50% - 82px)';
    }
    newPar(`WorldSize: ${json.WorldSize}x${json.WorldSize}`);
    newPar(json.Description);
    createButton('TEst', () => {
        Debug.Log('test');
    })
    playwindow.innerHTML += '<br>'
    newPar('Public servers will be available in the future and will be accessible here.');
    Debug.Log('Retrieved server information and setup "Play" window.');
}

const setupThingi = async() => {
    const req = await fetch('/info', { method: 'GET' });
    const json = await req.json();
    getMainServer(json);
}