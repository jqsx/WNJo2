
const ClientInput = {
    KeysDown: [],
    ButtonsDown: [],
    MousePosition: { x: 0, y: 0 },
    isKeyDown: (key) => {
        return ClientInput.KeysDown.includes(key);
    },
    isButtonDown: (button) => {
        return ClientInput.ButtonsDown.includes(button);
    }
}
window.addEventListener('keydown', (e) => {
    if (e.key === undefined) return;
    let has = ClientInput.KeysDown.find(key => key === e.key);
    if (has === undefined) {
        ClientInput.KeysDown.push(e.key);
    }

    if (e.key === 'Escape') {
        let escapeMenu = document.getElementById('Menu-ESCAPE');
        if (escapeMenu !== null) {
            escapeMenu.classList.toggle('iAmHiding');
        }
    }
})
window.addEventListener('keyup', (e) => {
    let has = ClientInput.KeysDown.find(key => key === e.key);
    if (has !== undefined) {
        ClientInput.KeysDown.splice(ClientInput.KeysDown.indexOf(has), 1);
    }
})
window.addEventListener('mousedown', (e) => {
    let has = ClientInput.ButtonsDown.find(button => button === e.button);
    if (has === undefined) {
        ClientInput.KeysDown.push(e.button);
    }
})
window.addEventListener('mouseup', (e) => {
    let has = ClientInput.KeysDown.find(button => button === e.button);
    if (has !== undefined) {
        ClientInput.KeysDown.splice(ClientInput.KeysDown.indexOf(has), 1);
    }
})
window.addEventListener('mousemove', (e) => {
    ClientInput.MousePosition = {
        x: e.pageX,
        y: e.pageY
    }
})


const UserInputProcess = {
    GetInput: () => {
        let x = (ClientInput.isKeyDown("a") ? 1 : 0) + (ClientInput.isKeyDown("d") ? -1 : 0);
        let y = (ClientInput.isKeyDown("w") ? 1 : 0) + (ClientInput.isKeyDown("s") ? -1 : 0);
        RendererData.LocalPlayer.position.x += x;
        RendererData.LocalPlayer.position.y += y;
    },
    SyncPlayerWithNetwork: () => {
        try {
            for (let i = 0; i < Players.length; i++) {
                if (Players[i].Name === PlayerName) {
                    Players[i].position = RendererData.LocalPlayer.position;
                    Players[i].rotation = RendererData.LocalPlayer.rotation;
                    return;
                }
            }
        } catch (e) {
            
        }
    }   
}