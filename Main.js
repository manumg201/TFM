const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require("socket.io")(server);
const fs = require("fs");

app.use(express.static(__dirname + "/www"));

//Arduino things - Esto si
/*
const SerialPort = require("serialport");
const ReadLine = require("@serialport/parser-readline");

const port = new SerialPort("COM5",{
    baudRate:9600,
})

const parser = new ReadLine();
port.pipe(parser);

parser.on("data", (line) => console.log(line.toString()));
*/

// myPort.on('open', onOpen);
// myPort.on('data', onData);

// function onOpen(){
//     console.log("Open connection")
// }
// function onData(data){
//     console.log("on Data"+data)
// }

app.get("/", function (req, res) {
    res.sendFile(__dirname + "/www/index.html");
});

// app.listen(3000, function () {
//     console.log("Server is running on http://localhost:3000");
// });

server.listen(3000, () => console.log('Server is running on http://localhost:3000'));
