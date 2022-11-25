const screen = document.createElement('div');
document.body.appendChild(screen);
screen.classList.add('FRAME');
screen.classList.add('Screen');

const windowSize = {
    width: window.innerWidth,
    height: window.innerHeight
}

var Players = [];
var Chunks = new Map();

const RendererData = {
    renderedPlayers: [],
    renderedSolids: []
}

const Camera = {
    scale: 4,
    position: { x: 0, y: 0 },
    scoll: { x: 0, y: 0 },
    Distance: (position) => {
        return Math.sqrt(Math.pow(Camera.position.x - position.x, 2) + Math.pow(Camera.position.y - position.y, 2));
    }
}

const render = () => {
    if (!LoggedIn) {
        setTimeout(() => {
            render();
        }, 500);
        return;
    }
    Camera.position = Players.filter(player => player.Name === PlayerName)[0].position;
    Camera.scoll = { x: -Camera.position.x, y: -Camera.position.y };
    Players.forEach(player => {
        let _playerNode = document.getElementById("PLAYER." + player.Name);
        if (_playerNode !== null && Camera.Distance(player.position) < windowSize.width * 3 / 2) {
            _playerNode.style.transform = `translate(${player.position.x + Camera.scoll.x}px , ${player.position.y + Camera.scoll.y}px)`;
        } else if (_playerNode === null && Camera.Distance(player.position) < windowSize.width * 3 / 2) {
            let _newplayernode = document.createElement('div');
            _newplayernode.classList.add('Player');
            _newplayernode.id = "PLAYER." + player.Name;
            _playerNode = screen.appendChild(_newplayernode);
            renderedPlayers.push(_playerNode);
            _playerNode.style.transform = `translate(${player.position.x + Camera.scoll.x}px , ${player.position.y + Camera.scoll.y}px)`;
        } else {
            RendererData.renderedPlayers.filter(obj => !Players.includes(obj)).forEach(_a => {
                _a.remove();
            })
        }
    })
}