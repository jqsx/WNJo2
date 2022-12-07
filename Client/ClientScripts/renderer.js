const screen = document.createElement('div');
const lightRenderer = document.createElement('canvas');
const LightCTX = lightRenderer.getContext('2d');
const world = document.createElement('div');
world.classList.add('world');
document.body.appendChild(screen).appendChild(world);
screen.classList.add('FRAME');
screen.classList.add('Screen');
lightRenderer.classList.add('FRAME');
lightRenderer.classList.add('LightRenderer');
screen.appendChild(lightRenderer);
const setupEscapeMenu = () => {
    let pauseMenu = document.createElement('div');
    pauseMenu.style.top = 'calc(50% - 200px)';
    pauseMenu.style.left = 'calc(50% - 200px)';
    pauseMenu.classList.add('WINDOW');
    pauseMenu.classList.add('iAmHiding');
    pauseMenu.id = 'Menu-ESCAPE';
    const newPar = (text) => {
        const par = document.createElement('p');
        par.classList.add('TEXTBAR');
        par.textContent = text;
        return pauseMenu.appendChild(par);
    }
    const createButton = (text, func) => {
        let b = document.createElement('button');
        b.classList.add('BUTTON');
        b.classList.add('simple');
        b.textContent = text;
        b.addEventListener('click', func);
        pauseMenu.appendChild(b);
    }

    newPar('PauseMenu')
    createButton('Resume', () => {
        pauseMenu.classList.toggle('iAmHiding');
    })
    createButton('Main menu', () => {
        LeaveServer();
    })
    createButton('Settings', () => {
        
    })
    screen.appendChild(pauseMenu);
}

setupEscapeMenu();

const windowSize = {
    width: window.innerWidth,
    height: window.innerHeight
}

lightRenderer.width = windowSize.width; lightRenderer.height = windowSize.height;

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
    SyncPlayerWithServer: () => {
        try {
            let player = Players.find(player => player.Name === PlayerName);
            if (player !== undefined) {
                if (Math.abs(player.position.x - RendererData.LocalPlayer.position.x) > 2 && Math.abs(player.position.y - RendererData.LocalPlayer.position.y) > 2) {
                    RendererData.LocalPlayer.position = player.position;
                    RendererData.LocalPlayer.rotation = player.rotation;
                }
            }
            
        } catch (e) {
            Debug.Error('Error while syncing local player position with server position: ' + e.message);
        }
    },
    CameraPositioning: () => {
        try {
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
                        const newJoint = (joint) => {
                            let test = document.createElement('div');
                            test.classList.add('Player');
                            test.classList.add(joint);
                            test.classList.add('move');
                            return _player.appendChild(test);
                        }

                        RendererData.PlayerElements.set(player.Name, { 
                            MainParent: screen.appendChild(_player),
                            body: newJoint('body'),
                            leftArm: newJoint('leftArm'),
                            rightArm: newJoint('rightArm'),
                            leftLeg: newJoint('leftLeg'),
                            rightLeg: newJoint('rightLeg'),
                            head: newJoint('head'),
                            removeMove: (p) => {
                                p.body.classList.remove('move');
                                p.leftArm.classList.remove('move');
                                p.rightArm.classList.remove('move');
                                p.leftLeg.classList.remove('move');
                                p.rightLeg.classList.remove('move');
                                p.head.classList.remove('move');
                            },
                            addMove: (p) => {
                                p.body.classList.add('move');
                                p.leftArm.classList.add('move');
                                p.rightArm.classList.add('move');
                                p.leftLeg.classList.add('move');
                                p.rightLeg.classList.add('move');
                                p.head.classList.add('move');
                            }
                        });
                    }
                })
            }
            RendererData.PlayerElements.forEach((value, key, map) => {
                let player = Players.find(obj => obj.Name === key)
                if (player !== undefined) {
                    let x = Math.abs(Camera.position.x - player.position.x) < window.innerWidth;
                    let y = Math.abs(Camera.position.y - player.position.y) < window.innerHeight;

                    if (x && y) {
                        value.MainParent.style.transform = getStylePosition({ x: (Camera.position.x - player.position.x) * Camera.scale, y: (Camera.position.y - player.position.y) * Camera.scale }, player.rotation, false);
                        if (ClientInput.isKeyDown("e")) {
                            value.addMove(value);
                        }
                        else {
                            value.removeMove(value);
                        }
                    }
                } else {
                    RendererData.PlayerElements.get(key).MainParent.remove();
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