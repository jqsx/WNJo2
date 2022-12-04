const config = require('./config');

const WebSocket = require('ws');
const MainServerSettings = {
    webSocketPort: 7777,

}
const wss = new WebSocket.Server({ port: config.port });
const uuid = require('uuid');
// add simplex noise soon

const ForwardNewServer = () => {
    fetch('https://pastebin.com/raw/yYRXZt45').then(req => req.json()).then(data => {
        const jsonData = JSON.parse(data);
        fetch(jsonData.MainServerAddress + ":" + jsonData.PORT, { method: 'POST', body: JSON.stringify({
            address: wss.address,
            port: MainServerSettings.webSocketPort

        })}).then(req => req.json()).then(data => {

        })
    })
}