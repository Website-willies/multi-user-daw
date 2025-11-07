const audioCtx = new AudioContext();
let activeSources = [];
let addInstrumentBtn = document.getElementById("addInstrument");
let clearAllBtn = document.getElementById("clearAll");
let playAllBtn = document.getElementById("playAll");
let pauseAllBtn = document.getElementById("pauseAll");
let modal = document.getElementById("instrument-modal");
let cancelBtn = document.getElementById("cancelBtn");
let instrumentBtns = document.getElementsByClassName("instrument-btn");
let tracksContainer = document.getElementById("tracks");
let bpm = 120;
let beatDivisions = 2;
let secondsPerBeat = (60 / bpm) / beatDivisions;
let oneshotsPath = "/oneshots/";

function noteToFrequency(semitoneOffsetFromA4) {
  return 440 * Math.pow(2, semitoneOffsetFromA4 / 12);
}

const scalePitch = (pitchPx, canvas) => {
    const totalRows = canvas.height / gridSize;
    const rowIndexFromTop = pitchPx / gridSize;       
    const invertedIndex = totalRows - 1 - rowIndexFromTop; 
    const semitoneOffset = invertedIndex;               

    const baseOffset = semitoneOffset - (totalRows / 2);
    const freq = 440 * Math.pow(2, baseOffset / 12);
    console.log(freq);
    return freq / 440; 
};

const scaleTime = (time) => {
    return time / 20;
};

let gridSize = 20;
let canvasWidth = 1200;
let canvasHeight = 20;
let tracks = []

addInstrumentBtn.addEventListener('click', () => {
    pauseAllTracks()
    modal.classList.add('active');
});

cancelBtn.addEventListener('click', () => {
    modal.classList.remove('active');
});

function buildTrack(btn, name, color){
    let trackDiv = document.createElement('div');
    trackDiv.className = 'track';
    let trackHeader = document.createElement('div');
    trackHeader.className = 'track-header';
    let trackName = document.createElement('span');
    trackName.className = 'track-name';
    trackName.textContent = name;
    let removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.textContent = 'Remove track';
    let clearBtn = document.createElement('button');
    clearBtn.textContent = 'Clear track';
    let playTrackBtn = document.createElement('button');
    playTrackBtn.textContent = 'Play track';
    let sliderContainer = document.createElement('div');
    sliderContainer.className = 'volume-slider';
    let slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '1';
    slider.step = '0.01';
    slider.value = '1';
    slider.className = name + '-volume';
    let sliderLabel = document.createElement('span');
    sliderLabel.className = 'volume-slider-value';
    sliderLabel.textContent = slider.value;
    sliderContainer.appendChild(slider);
    sliderContainer.appendChild(sliderLabel);

    let colCount = Number(document.getElementById("row-count-input").value);

    let canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight * colCount;

    let ctx = canvas.getContext('2d');
    let path = oneshotsPath + name + ".wav";

    trackHeader.appendChild(trackName);
    trackHeader.appendChild(clearBtn);
    trackHeader.appendChild(removeBtn);
    trackHeader.appendChild(playTrackBtn);
    trackHeader.appendChild(sliderContainer);
    trackDiv.appendChild(trackHeader);
    trackDiv.appendChild(canvas);
    tracksContainer.appendChild(trackDiv);

    let track = {
        name,
        path,
        colCount,
        color,
        canvas,
        ctx,
        removeBtn,
        clearBtn,
        notes: [],
        isDrawing: false,
        element: trackDiv,
        slider
    }

    clearBtn.addEventListener('click', () => {
        pauseAllTracks();
        initCanvas(track);
    });

    removeBtn.addEventListener('click', () => {
        pauseAllTracks();
        btn.disabled = false;
        tracksContainer.removeChild(trackDiv);
        let trackIdx = tracks.indexOf(track);
        tracks.splice(trackIdx, 1);
    });
    
    playTrackBtn.addEventListener('click', () => {
        let sequence = [];
        for (let oneshot of track.notes){
            sequence.push({
                "url": track.path,
                "time": scaleTime(oneshot.time),
                "pitch":  scalePitch(oneshot.pitch, track.canvas),
                "volume": parseFloat(track.slider.value)
            });
        }                                                                                                                      
        playSequence(sequence);
    });
    
    slider.addEventListener('input', () => {
        sliderLabel.textContent = parseFloat(slider.value).toFixed(2);
    });
    
    return track;
}

function drawGrid(ctx){
    let maxCanvasHeight = canvasHeight * Number(document.getElementById("row-count-input").max)

    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;

    for (let x = 0; x <= canvasWidth; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, maxCanvasHeight);
        ctx.stroke();
    }
    
    for (let y = 0; y <= maxCanvasHeight; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
    }
}


function initCanvas(track){
    let ctx = track.ctx;
    let maxCanvasHeight = canvasHeight * Number(document.getElementById("row-count-input").max)
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvasWidth, maxCanvasHeight);
    drawGrid(ctx)
    track.notes = [];
}

function addTrack(instrumentBtn, instrumentName, instrumentColor){
    // Build track HTML
    let track = buildTrack(instrumentBtn, instrumentName, instrumentColor);
    tracks.push(track);
    initCanvas(track);
    canvasEvents(track);
}

function canvasEvents(track){
    track.canvas.addEventListener('mousedown', (e) => {
        track.isDrawing = true;
        let boundingRect = track.canvas.getBoundingClientRect();
        let time = Math.floor((e.clientX - boundingRect.left)/gridSize) * gridSize;
        let pitch = Math.floor((e.clientY - boundingRect.top)/gridSize) * gridSize;

        let delete_note = false
        track.notes = track.notes.filter(note => {
            if (time == note.time && pitch == note.pitch){
                delete_note = true
            }
            return time !== note.time || pitch !== note.pitch;
        });
        if (delete_note){
            track.ctx.fillStyle = "white";
        } else{
            track.notes.push({time, pitch});
            track.ctx.fillStyle = track.color;
            playSequence([{
                "url": track.path,
                "time": 0,
                "pitch": scalePitch(pitch, track.canvas),
                "volume": parseFloat(track.slider.value)
            }]);      
        }
        track.ctx.fillRect(time, pitch, gridSize, gridSize);
        drawGrid(track.ctx);
    });
}

const listDiv = document.querySelector('.instrument-list');
try {
    const res = await fetch('/list-oneshots');
    const names = await res.json();

    for (const name of names) {
        const color = `rgb(${Math.floor(Math.random()*256)}, ${Math.floor(Math.random()*256)}, ${Math.floor(Math.random()*256)})`;

        const btn = document.createElement('button');
        btn.classList.add('instrument-btn');
        btn.dataset.instrument = name;
        btn.dataset.color = color;
        btn.textContent = name;

        listDiv.insertBefore(btn, cancelBtn);
    }

} catch (err) {
    console.error('Error loading oneshots:', err);
}

for(let instrumentBtn of instrumentBtns){
    instrumentBtn.addEventListener('click', () => {
        let instrumentName = instrumentBtn.dataset.instrument;
        let instrumentColor = instrumentBtn.dataset.color;
        instrumentBtn.disabled = true;
        addTrack(instrumentBtn, instrumentName, instrumentColor);
        modal.classList.remove('active');
    });
}

clearAllBtn.addEventListener('click', () => {
    for(let track of tracks){
        initCanvas(track);
    }
    pauseAllTracks();
});

async function loadSound(url) {
    const res = await fetch(url);
    const buffer = await res.arrayBuffer();
    return await audioCtx.decodeAudioData(buffer);
}

async function updateBPMAndDivisions(){
    bpm = Number(document.getElementById("bpm-input").value);
    beatDivisions = Number(document.getElementById("divisions-input").value);
    secondsPerBeat = (60 / bpm) / beatDivisions;
}

async function playSequence(events) {
    updateBPMAndDivisions();
    for (const src of activeSources) {
        try {
            src.stop();
        } catch (e) {
            // ignore if already stopped
        }
    }
    activeSources = [];

    const buffers = {};

    // oneshots should already be sorted by timestep in the sql query
    const urls = events.map(e => e.url);

    for (const url of urls) {
        buffers[url] = await loadSound(url);
    }

    const startTime = audioCtx.currentTime;

    for (const e of events) {
        const src = audioCtx.createBufferSource();
        src.buffer = buffers[e.url];
        src.playbackRate.value = e.pitch;
        const gainNode = audioCtx.createGain();
        gainNode.gain.value = e.volume ?? 1.0;
        src.connect(gainNode).connect(audioCtx.destination);
        // src.connect(audioCtx.destination);
        src.start(startTime + e.time * secondsPerBeat);
        activeSources.push(src);
    }
}

function compareByTime(a, b) 
{
    return a.time - b.time;
}

let intervalId;

playAllBtn.addEventListener('click', () => {    
    let sequence = [];
    for (let track of tracks){
        for (let oneshot of track.notes){
            sequence.push({
                "url": track.path,
                "time": scaleTime(oneshot.time),
                "pitch":  scalePitch(oneshot.pitch, track.canvas),
                "volume": parseFloat(track.slider.value)
            });
        }                                                                                                                      
    }
    if (intervalId) {
        clearInterval(intervalId);
    }
    sequence.sort(compareByTime);
    playSequence(sequence);
    intervalId = setInterval(() => {
        playSequence(sequence);
    }, 1000 * secondsPerBeat * 60);
});

function pauseAllTracks(){
    if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
    }
    for (const src of activeSources) {
        try {
            src.stop();
        } catch (e) {
            console.log(e);
        }
    }
}

pauseAllBtn.addEventListener('click', pauseAllTracks);