const screen = document.createElement('div');
const world = document.createElement('div');
world.classList.add('world');
document.body.appendChild(screen).appendChild(world);
screen.classList.add('FRAME');
screen.classList.add('Screen');

const windowSize = {
    width: window.innerWidth,
    height: window.innerHeight
}

var Players = [];
var Chunks = new Map();

const RendererData = {
    LocalPlayer: {
        position: {
            x: 0,
            y: 0
        },
        rotation: 0
    },
    renderedPlayers: [],
    renderedSolids: [],
    PlayerElements: new Map(),
    lastFPSUpdate: Date.now(),
    Frames: 0,
    FPS: 0
}

const Camera = {
    scale: 4,
    position: { x: 0, y: 0 },
    scroll: { x: 0, y: 0 },
    Distance: (position) => {
        return Math.sqrt(Math.pow(Camera.position.x - position.x, 2) + Math.pow(Camera.position.y - position.y, 2));
    }
}

const getStylePosition = (position, rotation, ignoreScale) => {
    let Position = `translate(${position.x + window.innerWidth / 2}px, ${position.y + window.innerHeight / 2}px) `;
    let Rotation = `rotateZ(${rotation}deg) `;
    let Scale = `scale(${Camera.scale},${Camera.scale}) `;
    return Position + Rotation + (ignoreScale ? '' : Scale);
}

const RenderProcess = {
    CameraPositioning: () => {
        try {
            let player = Players.filter(player => player.Name === PlayerName);
            if (player.length > 0) {
                RendererData.LocalPlayer.position = player[0].position;
                RendererData.LocalPlayer.rotation = player[0].rotation;
            }
            Camera.position = RendererData.LocalPlayer.position;
            Camera.scroll = { x: -Camera.position.x, y: -Camera.position.y };
            world.style.transform = getStylePosition(Camera.scroll, 0, false);
        } catch (e) {
            Debug.Error('Error while positioning camera: ' + e.message);
        }
    },
    PlayerRender: () => {
        try {
            if (RendererData.PlayerElements.size < Players.length) {
                Players.forEach(player => {
                    if (RendererData.PlayerElements.get(player.Name) === undefined) {
                        let _player = document.createElement('div');
                        _player.id = "PLAYER." + player.Name;
                        _player.classList.add('GameObject');
                        _player.classList.add('Player');
                        RendererData.PlayerElements.set(player.Name, screen.appendChild(_player));
                    }
                })
            }
            RendererData.PlayerElements.forEach((value, key, map) => {
                let player = Players.find(obj => obj.Name === key)
                if (player !== undefined) {
                    let x = Math.abs(Camera.position.x - player.position.x) < window.innerWidth;
                    let y = Math.abs(Camera.position.y - player.position.y) < window.innerHeight;

                    if (x && y) {
                        value.style.transform = getStylePosition({ x: (Camera.position.x - player.position.x) * Camera.scale, y: (Camera.position.y - player.position.y) * Camera.scale }, player.rotation, false);
                    }
                } else {
                    setTimeout(() => {
                        RendererData.PlayerElements.delete(key);
                    }, 10)
                }
            })
        } catch (e) {
            Debug.Error('Error while rendering players: ' + e.message);
        }
    },
    BackgroundScroll: () => {
        screen.style.backgroundSize = `calc(100% / ${20 / Camera.scale * 2})`;
        screen.style.backgroundPosition = `${Camera.position.x * Camera.scale}px ${Camera.position.y * Camera.scale}px`;
    },
    CalculateFPS: () => {
        if (RendererData.lastFPSUpdate + 1000 < Date.now()) {
            RendererData.lastFPSUpdate = Date.now();
            RendererData.FPS = RendererData.Frames;
            RendererData.Frames = 0;
        }
    }
}

const render = () => {
    RenderProcess.CameraPositioning();
    RenderProcess.PlayerRender();
    RenderProcess.BackgroundScroll();
    RenderProcess.CalculateFPS();
    RendererData.Frames += 1;
}