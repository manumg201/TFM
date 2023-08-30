const express = require('express');
const app = express();
const path = require('path');
const server = require('http').Server(app);
const io = require('socket.io')(server);
const fs = require("fs")
app.use('/', express.static(path.join(__dirname, 'www')));

const ARDUINO = false; // testing or sensor
let parser;
let port;
//Arduino things - Esto si
if(ARDUINO){
  const SerialPort = require("serialport");
  const ReadLine = require("@serialport/parser-readline");
  
  port = new SerialPort("COM3",{
      baudRate:9600,
  })
  
  parser = new ReadLine();
  port.pipe(parser);
  
  //parser.on("data", (line) => console.log(line.toString()));
  
  
  // myPort.on('open', onOpen);
  // myPort.on('data', onData);
  
  
  // function onOpen(){
  //     console.log("Open connection")
  // }
  // function onData(data){
  //     console.log("on Data"+data)
  // }
}



// let mySocket;
let sendData = false
let datafile = []
let datafileTest = []
fs.readFile("data.json", function(err, data){
  if(err) throw err;
  datafile = JSON.parse(data);
  // console.log(datafile);
});

fs.readFile("test.json", function(err, data){
  if(err) throw err;
  datafileTest = JSON.parse(data);
  // console.log(datafileTest);
});

app.get("/datafile", (req, res) =>{
  console.log("fetch datafile");
  res.json(datafile);
  res.end();
});

app.get("/datafileTest", (req, res) =>{
  console.log("fetch datafileTest");
  res.json(datafileTest);
  res.end();
});

io.on('connection', (socket) => {
    console.log(`socket connected ${socket.id}`);

    //read json file 
    /*fs.readFile("data.json", function(err, data){ 
      if(err) throw err;
      datafile = JSON.parse(data);
      console.log(datafile);
    });*/

    // Send arduino data
    if(ARDUINO){
      parser.on('data', (data)=>{ 
          console.log("SENSOR_DATA", data.toString())
          socket.emit("SENSOR_DATA", data.toString());
    })}
    //Just for testing
    else {
      setInterval(() => {socket.emit("SENSOR_DATA", parseInt(Math.random()*100 + 350).toString());}, 3)
    }
      
    
    socket.on("SEND_DATA", () => {
        sendData = true
        console.log("SEND_DATA")
      });
      
    socket.on("save_datafile", function(data){
      console.log("save:", data);
      datafile = data;
      fs.writeFile("data.json", JSON.stringify(data), function(err){if(err) throw err;});
      /*fs.writeFile("tasks.json", JSON.stringify(tasks), function(err){
        if(err) throw err;
      });*/
      socket.emit("datafile", data);
    });

    socket.on("save_datafileTest", function(data){
      console.log("save:", data);
      datafileTest = data;
      fs.writeFile("test.json", JSON.stringify(data), function(err){if(err) throw err;});
      /*fs.writeFile("tasks.json", JSON.stringify(tasks), function(err){
        if(err) throw err;
      });*/
      socket.emit("datafileTest", data);
    });
    
});

// console.log(mySocket.id)
// setInterval(await sendData, 1000, 1)

server.listen(3000, () => console.log('Server is running on http://localhost:3000'));
