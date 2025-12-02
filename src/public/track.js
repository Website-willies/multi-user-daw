const audioCtx = new AudioContext();
let activeSources = [];
let addInstrumentBtn = document.getElementById("addInstrument");
let clearAllBtn = document.getElementById("clearAll");
let playAllBtn = document.getElementById("playAll");
let pauseAllBtn = document.getElementById("pauseAll");
let downloadMixBtn = document.getElementById("downloadMixBtn");
let modal = document.getElementById("instrument-modal");
let cancelBtn = document.getElementById("cancelBtn");
let instrumentBtns = document.getElementsByClassName("instrument-btn");
let tracksContainer = document.getElementById("tracks");
let bpm = 120;
let beatDivisions = 2;
let secondsPerBeat = (60 / bpm) / beatDivisions;
let oneshotsPath = "/oneshots/";
let uuid = new URLSearchParams(window.location.search).get("uuid") || "";
const ws = new WebSocket("wss://" + location.host);

ws.onopen = () => {
    ws.send(JSON.stringify({
        type: "join-track",
        uuid: uuid
    }))
}

function getTrackFromSound(sound){
    let trackExists = false
    for (let track of tracks){
        if (track.name == sound){
            trackExists = true
            return {trackToUpdate: track, trackExists};
        }
    }
    sound = sound.split('/')[0];
    let instrumentBtn = document.querySelector(`[data-instrument="${sound}"]`);
    return {trackToUpdate: instrumentBtn, trackExists}
}

ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.type == 'track-capacity') {
        alert(msg.message);
        window.location.replace('/');
        return;
    }
    if (msg.uuid != uuid) return;
    if (msg.type == 'note-added') {
        // A note was added update the canvas.
        let payload = msg.payload;
        let time = payload.time;
        let pitch = payload.pitch
        const {trackToUpdate, trackExists} = getTrackFromSound(payload.sound);
        if (trackExists){
            trackToUpdate.notes.push({time, pitch});
            trackToUpdate.ctx.fillStyle = trackToUpdate.color;
            trackToUpdate.ctx.fillRect(time, pitch, gridSize, gridSize);
            drawGrid(trackToUpdate.ctx, trackToUpdate.pitchCount);
        }else{
            let instrumentColor = trackToUpdate.dataset.color;
            rebuildTrack(trackToUpdate, payload.sound, instrumentColor, payload.pitch_count, [payload]);
        }
    }else if (msg.type == 'instrument-deleted'){
        // An instrument was either cleared or removed, update.
        let payload = msg.payload;
        let deleteType = msg.deleteType;
        const {trackToUpdate, trackExists} = getTrackFromSound(payload);
        if (deleteType === 'clear' && trackExists){
            initCanvas(trackToUpdate, trackToUpdate.pitchCount);
        }else if (deleteType === 'remove' && trackExists) {
            tracksContainer.removeChild(trackToUpdate.element);
            let trackIdx = tracks.indexOf(trackToUpdate);
            tracks.splice(trackIdx, 1);
        }else {
            return;
        }

    }else if (msg.type == 'sounds-deleted'){
        // A sound was deleted, turn the square white.
        let payload = msg.payload;
        const {trackToUpdate, trackExists} = getTrackFromSound(payload[0].sound);
        trackToUpdate.ctx.fillStyle = "white";
        for (let row of payload){
            trackToUpdate.ctx.fillRect(row.time, row.pitch, gridSize, gridSize);
        }
        drawGrid(trackToUpdate.ctx, trackToUpdate.pitchCount);
    }else if (msg.type == 'track-deleted'){
        // Completely clear the workspace remove all tracks.
        let payload = msg.payload;
        for (let track of tracks){
            initCanvas(track, track.pitchCount);
        }
    }else{
        return;
    }
};

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
    return freq / 440; 
};

const scaleTime = (time) => {
    return time / 20;
};

let gridSize = 20;
let canvasWidth = 1280;
let canvasHeight = 20;
let tracks = []

addInstrumentBtn.addEventListener('click', () => {
    pauseAllTracks()
    modal.classList.add('active');
});

cancelBtn.addEventListener('click', () => {
    modal.classList.remove('active');
});

function buildTrack(btn, name, color, pitchCount){
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
    clearBtn.classList.add('clear-btn');
    clearBtn.textContent = 'Clear track';
    let playTrackBtn = document.createElement('button');
    playTrackBtn.textContent = 'Play track';
    let muteTrackBtn = document.createElement('button');
    muteTrackBtn.id = "muteBtnOn";
    muteTrackBtn.textContent = 'Track: ON';
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
    sliderLabel.textContent = `Volume: ${slider.value}`;
    sliderContainer.appendChild(sliderLabel);
    sliderContainer.appendChild(slider);

    let canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight * pitchCount;

    let ctx = canvas.getContext('2d');
    let path = oneshotsPath + name + ".wav";

    trackHeader.appendChild(trackName);
    trackHeader.appendChild(playTrackBtn);
    trackHeader.appendChild(muteTrackBtn);
    trackHeader.appendChild(sliderContainer);
    trackHeader.appendChild(clearBtn);
    trackHeader.appendChild(removeBtn);
    trackDiv.appendChild(trackHeader);
    trackDiv.appendChild(canvas);
    tracksContainer.appendChild(trackDiv);

    let track = {
        name,
        path,
        pitchCount,
        color,
        canvas,
        ctx,
        removeBtn,
        clearBtn,
        notes: [],
        isDrawing: false,
        element: trackDiv,
        muted: false,
        slider
    }

    clearBtn.addEventListener('click', () => {
        pauseAllTracks();
        initCanvas(track);
        deleteSound(uuid, track.name, 'clear');
    });

    removeBtn.addEventListener('click', () => {
        pauseAllTracks();
        btn.disabled = false;
        tracksContainer.removeChild(trackDiv);
        let trackIdx = tracks.indexOf(track);
        tracks.splice(trackIdx, 1);
        deleteSound(uuid, track.name, 'remove');
    });
    
    playTrackBtn.addEventListener('click', () => {
        console.log(track.notes)
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

    muteTrackBtn.addEventListener('click', () => {
        if (!track.muted) {
            muteTrackBtn.textContent = 'Track: OFF'
            muteTrackBtn.id = "muteBtnOff";
            track.muted = true
        }else{
            muteTrackBtn.textContent = 'Track: ON'
            muteTrackBtn.id = "muteBtnOn";
            track.muted = false
        }
    })
    
    slider.addEventListener('input', () => {
        sliderLabel.textContent = `Volume: ${parseFloat(slider.value).toFixed(2)}`;
    });
    
    return track;
}

function drawGrid(ctx, pitchCount){
    let maxCanvasHeight = canvasHeight * pitchCount;

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


function initCanvas(track, pitchCount){
    let ctx = track.ctx;
    let maxCanvasHeight = canvasHeight * pitchCount;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvasWidth, maxCanvasHeight);
    drawGrid(ctx, pitchCount)
    track.notes = [];
}

function addTrack(instrumentBtn, instrumentName, instrumentColor){
    // Build track HTML
    let pitchCount = Number(document.getElementById("row-count-input").value);
    let track = buildTrack(instrumentBtn, instrumentName, instrumentColor, pitchCount);
    tracks.push(track);
    initCanvas(track, pitchCount);
    canvasEvents(track);
}

export function rebuildTrack(instrumentBtn, instrumentName, instrumentColor, pitchCount, notes){
    let track = buildTrack(instrumentBtn, instrumentName, instrumentColor, pitchCount);
    initCanvas(track, pitchCount);
    canvasEvents(track);
    track.notes = notes;
    tracks.push(track);
    track.ctx.fillStyle = track.color;
    for (let note of notes){
        track.ctx.fillRect(note.time, note.pitch, gridSize, gridSize);
    }
}

function deleteSound(uuid, sound, deleteType){
    fetch(`sounds/track/${uuid}/${encodeURIComponent(sound)}`, { 
        method: "DELETE", 
        headers: {"Content-Type": "application/json"}, 
        body: JSON.stringify({ deleteType: deleteType })
    }).then((response) => {
        response.json().then((body) => {
            console.log("Deleted: ", body)
        }).catch(error => {
            console.error(error); // parse error
        });
    }).catch(error => {
        console.log(error) // fetch error
    });
}

function deleteNote(note){
    fetch(`sounds/track/${uuid}`, { 
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(note)
    }).then((response) => {
        response.json().then((body) => {
            console.log("Created: ", body)
        }).catch(error => {
            console.error(error); // parse error
        });
    }).catch(error => {
        console.log(error) // fetch error
    });
}

function saveNote(note){
    fetch(`sounds/`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(note)
    }).then((response) => {
        response.json().then((body) => {
            console.log("Created: ", body)
        }).catch(error => {
            console.error(error); // parse error
        });
    }).catch(error => {
        console.log(error) // fetch error
    });
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
            deleteNote({"uuid": uuid, "sound": track.name, "time": time, "pitch": pitch, "pitch_count": track.pitchCount})
        } else{
            track.notes.push({time, pitch});
            track.ctx.fillStyle = track.color;
            playSequence([{
                "url": track.path,
                "time": 0,
                "pitch": scalePitch(pitch, track.canvas),
                "volume": parseFloat(track.slider.value)
            }]);
            saveNote({"uuid": uuid, "sound": track.name, "time": time, "pitch": pitch, "pitch_count": track.pitchCount})      
        }
        track.ctx.fillRect(time, pitch, gridSize, gridSize);
        drawGrid(track.ctx, track.pitchCount);
    });
}

const listDiv = document.querySelector('.instrument-list');
let instrumentData = [];
let currentView = "categories";
async function loadOneshots() {
  try {
    const res = await fetch('/list-oneshots');
    instrumentData = await res.json();
    showInstrumentCategories();
  } catch (err) {
    console.error('Error loading oneshots:', err);
  }
}

function showInstrumentCategories() {
  listDiv.innerHTML = `
    
  `;
  instrumentData.forEach(({ instrument }) => {
    const color = `rgb(${Math.floor(Math.random()*256)}, ${Math.floor(Math.random()*256)}, ${Math.floor(Math.random()*256)})`;
    const btn = document.createElement('button');
    btn.classList.add('instrument-btn', 'instrument-category-btn');
    btn.dataset.kind = 'category';
    btn.dataset.instrument = instrument;
    btn.dataset.color = color;
    btn.textContent = instrument;
    btn.addEventListener('click', () => showInstrumentFiles(instrument));
    listDiv.appendChild(btn);
  });

  const cancelBtn = document.createElement('button');
  cancelBtn.classList.add('cancel-btn');
  cancelBtn.id = 'cancelBtn';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => modal.classList.remove('active'));
  listDiv.appendChild(cancelBtn);
}

function showInstrumentFiles(instrumentName) {
  const instrument = instrumentData.find(i => i.instrument === instrumentName);
  if (!instrument) return;

  listDiv.innerHTML = `
    <h3>${instrumentName}</h3>
    <button id="backToCategories">← Back</button>
  `;

  document.getElementById('backToCategories').addEventListener('click', showInstrumentCategories);

  instrument.files.forEach(file => {
    const color = `rgb(${Math.floor(Math.random()*256)}, ${Math.floor(Math.random()*256)}, ${Math.floor(Math.random()*256)})`;
    const btn = document.createElement('button');
    btn.classList.add('instrument-btn');
    btn.dataset.kind = 'file';
    btn.dataset.instrument = `${instrumentName}/${file}`;
    btn.dataset.color = color;
    btn.textContent = file;
    for (let track of tracks) {
        if (track.name == btn.dataset.instrument){
            btn.disabled = true
            break;
        }
    }

    btn.addEventListener('click', () => {
      btn.disabled = true;
      addTrack(btn, `${instrumentName}/${file}`, color);
      modal.classList.remove('active');
    });

    listDiv.appendChild(btn);
  });
}

await loadOneshots();

clearAllBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear all tracks?\nThis action is permanent and will affect all users.')){
        for(let track of tracks){
            initCanvas(track);
        }
        pauseAllTracks();
        deleteTrack(uuid);
    }
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

export async function getTrack(uuid){
    return fetch(`sounds/track/${uuid}`)
    .then((response) => response.json())
    .then((body) => {
      return body;
    })
    .catch((error) => {
      console.error("Fetch error:", error);
      throw error;
    });
}


export async function saveTrack(uuid){
    // this is lazy but yeah let's wipe and rewrite the track from scratch EVERY SINGLE TIME WE SAVE IT
    await deleteTrack(uuid);

    let body = []
    for (let track of tracks){
        for (let oneshot of track.notes){
            body.push({
                "sound": track.name,
                "pitch": oneshot.pitch,
                "time": oneshot.time,
                "pitch_count": track.pitchCount,
            })
        }
    }

    fetch(`sounds/track/${uuid}`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    }).then((response) => {
        response.json().then((body) => {
            console.log("Created: ", body)
        }).catch(error => {
            console.error(error); // parse error
        });
    }).catch(error => {
        console.log(error) // fetch error
    });

}

export async function deleteTrack(uuid){
    fetch(`sounds/track/${uuid}`, { method: "DELETE" }).then((response) => {
        response.json().then((body) => {
            console.log("Deleted: ", body)
        }).catch(error => {
            console.error(error); // parse error
        });
    }).catch(error => {
        console.log(error) // fetch error
    });
}

let intervalId;

playAllBtn.addEventListener('click', () => {    
    let sequence = [];
    for (let track of tracks){
        if (track.muted){
            continue;
        }
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

function audioBufferToWav(buffer) {
    const numOfChan = buffer.numberOfChannels,
          length = buffer.length * numOfChan * 2 + 44,
          bufferArray = new ArrayBuffer(length),
          view = new DataView(bufferArray),
          channels = [],
          sampleRate = buffer.sampleRate;
    
    let offset = 0;

    function writeString(str) {
        for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
        }
        offset += str.length;
    }

    writeString('RIFF');
    view.setUint32(offset, 36 + buffer.length * numOfChan * 2, true);
    offset += 4;
    writeString('WAVE');
    writeString('fmt ');
    view.setUint32(offset, 16, true);
    offset += 4;
    view.setUint16(offset, 1, true);
    offset += 2;
    view.setUint16(offset, numOfChan, true);
    offset += 2;
    view.setUint32(offset, sampleRate, true);
    offset += 4;
    view.setUint32(offset, sampleRate * numOfChan * 2, true);
    offset += 4;
    view.setUint16(offset, numOfChan * 2, true);
    offset += 2;
    view.setUint16(offset, 16, true);
    offset += 2;
    writeString('data');
    view.setUint32(offset, buffer.length * numOfChan * 2, true);
    offset += 4;

    for (let i = 0; i < numOfChan; i++) {
        channels.push(buffer.getChannelData(i));
    }

    let interleaved = new Float32Array(buffer.length * numOfChan);
    for (let i = 0; i < buffer.length; i++) {
        for (let c = 0; c < numOfChan; c++) {
            interleaved[i * numOfChan + c] = channels[c][i];
        }
    }

    let index = 0;
    for (let i = 0; i < interleaved.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, interleaved[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }

    return new Blob([view], { type: 'audio/wav' });
}

downloadMixBtn.addEventListener('click', async () => {
    await updateBPMAndDivisions();

    let events = [];
    for (let track of tracks) {
        if (track.muted) continue;
        for (let oneshot of track.notes) {
            events.push({
                url: track.path,
                time: scaleTime(oneshot.time),
                pitch: scalePitch(oneshot.pitch, track.canvas),
                volume: parseFloat(track.slider.value)
            });
        }
    }

    events.sort((a, b) => a.time - b.time);
    const buffers = {};
    const urls = [...new Set(events.map(e => e.url))];
    for (const url of urls) {
        buffers[url] = await loadSound(url);
    }

    const duration = Math.max(...events.map(e => e.time)) * secondsPerBeat + 2;
    const sampleRate = audioCtx.sampleRate;
    const offlineCtx = new OfflineAudioContext(2, duration * sampleRate, sampleRate);

    for (const e of events) {
        const src = offlineCtx.createBufferSource();
        src.buffer = buffers[e.url];
        src.playbackRate.value = e.pitch;
        const gainNode = offlineCtx.createGain();
        gainNode.gain.value = e.volume ?? 1.0;
        src.connect(gainNode).connect(offlineCtx.destination);
        src.start(e.time * secondsPerBeat);
    }

    const rendered = await offlineCtx.startRendering();
    const wavBlob = audioBufferToWav(rendered);

    const a = document.createElement('a');
    a.href = URL.createObjectURL(wavBlob);
    a.download = 'mix.wav';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
});


pauseAllBtn.addEventListener('click', pauseAllTracks);
