const socket = io();
// const testBtn = document.querySelector("#test");

const newClass = document.querySelector("#newClass");
const addBtn = document.querySelector("#add");
const removeBtn = document.querySelector("#remove");
const recordBtn = document.querySelector("#record");
const recordTestBtn = document.querySelector("#recordTest");
const trainBtn = document.querySelector("#train");
const testBtn = document.querySelector("#loadTest")
const startBtn = document.querySelector("#start");
const RealTestClass = document.querySelector("#RealTestClass");
const KNNClass = document.querySelector("#KNNClass");
let CLASSES = ["Ruido", "Mano Abierta", "Mano Cerrada"]; //TODO: posibilidad de añadir mas opciones desde la interfaz
const ARRAY_LENGTH = 900 //300 = 1s; 3s = 900 => 8 ventanas, hacer MAV en cada una
const NUM_DIVS = 4
const NUM_FOLDS = 5
const INTERVAL = 200;
const OVERLAP = 100;

let dataArray = []
let recording = false
let trainData = true;
let classify = false
let predClassKNN;

/* Declaracion de modelos*/
let KNNmodel;

function updateClasses(){
  formularioClases.innerHTML ="<option value='' hidden selected>Select class</option>";
  CLASSES.forEach((e, i) => {
    formularioClases.innerHTML += "<option value='" +i+"'> "+e+ "</option>";
  })
}
updateClasses()

let datafile = []
let datafileTest = []
fetch("/datafile") //load_data initially
.then(response => {
  // console.log(response); 
  response.json().then( data => {
    datafile = data
    console.log("datafile", datafile); 
  }); 
});
fetch("/datafileTest") //load_dataTest initially
.then(response => {
  // console.log(response); 
  response.json().then( data => {
    datafileTest = data
    console.log("datafileTest", datafileTest); 
  }); 
});


socket.on("datafile", (data) => {datafile = data; console.log("Data:",datafile);});
socket.on("datafileTest", (data) => {datafileTest = data; console.log("test data:",datafileTest);});

socket.on("SENSOR_DATA", (data)=>{
  updateArray(data);
  //console.log(data, dataArray);
});


addBtn.onclick = () => {
  if (newClass.value != ""){
    CLASSES.push(newClass.value)
    newClass.value = ""
    updateClasses()
  }
}

removeBtn.onclick = () => {
  if(formularioClases.value != ""){ 
    CLASSES.splice(formularioClases.value,1)
    updateClasses()
  }
}

recordBtn.onclick = () => {
  createPlot("red") //cambia el color para indicar que lo esta grabando
  dataArray = []
  recording = true
  trainData = true
  enableAllElements(false)
}
recordTestBtn.onclick = () => {
  createPlot("green") //cambia el color para indicar que lo esta grabando
  dataArray = []
  recording = true
  trainData = false
  enableAllElements(false)
}

trainBtn.onclick = () => {trainModel()}

testBtn.onclick = () => {testModel()}

startBtn.onclick = () => {
  classify = !classify
  startBtn.innerHTML = classify? "Stop" : "Start"
  if(classify){
    RealTestClass.innerHTML = "Real Test Class: " + ex.className
  }
  KNNClass.innerHTML = "KNN:"
}

async function loadModel() { //cargar modelos
  //KNN
  KNNmodel = knnClassifier.create();

}
loadModel();

async function trainModel(){ //add features
  datafile.forEach(el =>{
    const features = el.getFeatures()
    console.log(tf.tensor(features).reshape([1,features.length]), el)
    KNNmodel.addExample(tf.tensor(features).reshape([1,features.length]), el.className);
  })

  if (!testBtn.classList.contains('element')) {
    testBtn.classList.add('element')
    testBtn.removeAttribute("disabled");
  }

  if (!startBtn.classList.contains('element')) {
    startBtn.classList.add('element')
    startBtn.removeAttribute("disabled");
  }
}

async function testModel(){ 
  const ex = datafileTest[Math.floor(Math.random() * datafileTest.length)] //random test example
  const features = getFeatures(ex.array)

  predClassKNN = await KNNmodel.predictClass(tf.tensor(features).reshape([1,features.length]), k = 3)
  
  RealTestClass.innerHTML = "Real Test Class: " + ex.className
  KNNClass.innerHTML = "KNN: " + predClassKNN.label
}

async function predictClass(){
  if (classify){
    const features = getFeatures() //Features of the actual array for prediction

    predClassKNN = await KNNmodel.predictClass(tf.tensor(features).reshape([1,features.length]), k = 3)
    // console.log("predClassKNN", predClassKNN)
    KNNClass.innerHTML = "KNN: " + predClassKNN.label
  }
}

function preprocessData(arr = dataArray){ 
  //Offset Compensation
  let offMean = getMean(arr)
  preprocessedArr = arr.map(x => x - offMean) 

  //Pre-smoothing
  // let m = Math.round(arr.length/10) // last 10% data
  // arr[arr.length-1] = getMean(arr.slice(-m))

  return preprocessedArr;
}

function getFeatures(arr = dataArray){
  ppArr = preprocessData(arr)
  let featuresArr = []
  //0-199; 100-299;
  for(let i = 0; i <= ARRAY_LENGTH - INTERVAL; i += (INTERVAL - OVERLAP)){
    let aux = ppArr.slice(i, i + INTERVAL)
    featuresArr.push(MAV(aux))
    featuresArr.push(RMS(aux))
    featuresArr.push(WL(aux))
    featuresArr.push(ZC(aux))
  }

  return featuresArr; //32 posiciones; 4 por feature
}

function saveDatafile(arr){
  let x = 0;
  for (let el of datafile) {
      if (el.classNumber == parseInt(formularioClases.value)) {
          x+=1
      }
  }
  x = x%NUM_FOLDS + 1;

  datafile.push({
    "className": CLASSES[formularioClases.value],
    "classNumber": parseInt(formularioClases.value),
    "fold": String(x),
    "array": arr
  })
  enableAllElements(true)
  socket.emit("save_datafile", datafile);
}

function saveDatafileTest(arr){
  let x = 0;
  for (let el of datafileTest) {
      if (el.classNumber == parseInt(formularioClases.value)) {
          x+=1
      }
  }
  x = x%NUM_FOLDS + 1;
  datafileTest.push({
    "className": CLASSES[formularioClases.value],
    "classNumber": parseInt(formularioClases.value),
    "fold": String(x),
    "array": arr
  })
  enableAllElements(true)
  socket.emit("save_datafileTest", datafileTest);
}

function updateArray(data){
  if (dataArray.length >= ARRAY_LENGTH){
    if (recording){
      if (trainData) saveDatafile(dataArray);
      else saveDatafileTest(dataArray);
      createPlot() //Cambia el color de vuelta al normal
      recording = false
    }
    
    dataArray.shift()
  }
  dataArray.push(parseInt(data))
  if (dataArray.length == ARRAY_LENGTH){
    predictClass()
  }

  Plotly.animate('dataPlotter', {
    data: [{y: dataArray}],
    traces: [0],
  }, {
    transition: {
      duration: 100,
      easing: 'linear'
    },
    frame: {
      duration: 0,
    }
  })
  //Plotly.relayout( 'dataPlotter', {'yaxis.autorange': true});
}

  //Features
//Mean Absolute Value
const MAV = (arr) => getMean(arr.map(Math.abs));

//Root Mean Square
const RMS = (arr) => Math.sqrt(getMean(arr.map( val => (val * val))));

//Waveform Length
const WL = (arr) => {
  let sum = 0;
  for (let i = 0; i < arr.length - 1; i++) {
    sum += Math.abs(arr[i+1] - arr[i])
  }
  return sum; 
}

//Zero Crossings
const ZC = (arr) => {
  let num = 0;
  let aux = arr.map(Math.sign).filter(el => el != 0)

  for (let i = 0; i < aux.length - 1; i++) {
    if (aux[i] + aux[i+1] == 0){
      num += 1;
    }
  }
  return num;
}



function getMean(arr){
  return arr.reduce((total, num) => total + num)/arr.length
}

function createPlot(color = "rgb(0,176,246)"){
  Plotly.newPlot('dataPlotter', [{
    mode: 'lines',
    y: dataArray,
    line: {color: color, width: 1.5 }//, shape: "spline"}
  }], {
    xaxis: {
      range: [0,ARRAY_LENGTH],
      showgrid: false,
      showticklabels: false
    },
    yaxis: {
      range: [0,1023]
    }
  });
}

function enableAllElements(enable) {
  document.querySelectorAll(".element").forEach(el => {
      if (enable) {
          el.removeAttribute("disabled");
      } else {
          el.setAttribute("disabled", "");
      }
  });
}

createPlot()