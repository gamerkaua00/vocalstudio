let db;
let library = [];
let editingId = null;

// 1. Splash Screen Logic (Agora visível por 3 segundos)
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const splash = document.getElementById('splashScreen');
        if(splash) {
            splash.style.opacity = '0';
            setTimeout(() => splash.style.display = 'none', 500);
        }
    }, 3000); // 3000 milissegundos = 3 segundos
});

// Inicializa o Banco de Dados
const req = indexedDB.open("KMZ_VocalStudio_Pro", 1);
req.onupgradeneeded = e => {
    db = e.target.result;
    if (!db.objectStoreNames.contains('tracks')) {
        db.createObjectStore('tracks', { keyPath: 'id', autoIncrement: true });
    }
};
req.onsuccess = e => {
    db = e.target.result;
    document.getElementById('dbStatus').innerText = "DB OK";
    document.getElementById('dbStatus').style.color = "var(--kmz-blue)";
    loadTracks();
};

// Navegação de Abas
document.querySelectorAll('.tab-btn').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(`screen-${tab.dataset.target}`).classList.add('active');
    });
});

// Importação e Banco de Dados
async function handleImport(files) {
    if (!files.length) return;
    const file = files[0];
    const name = file.name.replace(/\.[^/.]+$/, "");
    
    const tx = db.transaction(['tracks'], 'readwrite');
    tx.objectStore('tracks').add({ name: name, blob: file, date: Date.now() });
    
    tx.oncomplete = () => {
        loadTracks();
        document.getElementById('fileInput').value = ''; 
    };
}

function loadTracks() {
    const tx = db.transaction(['tracks'], 'readonly');
    tx.objectStore('tracks').getAll().onsuccess = e => {
        library = e.target.result.reverse();
        renderLib();
    };
}

function renderLib() {
    const list = document.getElementById('libList');
    list.innerHTML = "";
    if (!library.length) {
        list.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted)">Nenhum playback na biblioteca</div>`;
        return;
    }
    
    library.forEach(item => {
        const div = document.createElement('div');
        div.className = 'media-item';
        
        div.innerHTML = `
            <div class="media-title">${item.name}</div>
            <div class="media-date">${new Date(item.date).toLocaleDateString()}</div>
            
            <div class="media-actions">
                <div class="action-group">
                    <button class="btn-icon" onclick="previewLibTrack(${item.id}, this)"><i class="fas fa-play"></i></button>
                    <button class="btn-icon blue" onclick="sendToStudio(${item.id})"><i class="fas fa-sliders-h"></i> Estúdio</button>
                </div>
                <div class="action-group">
                    <button class="btn-icon yellow" onclick="openRename(${item.id})"><i class="fas fa-pen"></i></button>
                    <button class="btn-icon red" onclick="deleteTrack(${item.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
        list.appendChild(div);
    });
}

let previewPlayer = null;

async function previewLibTrack(id, btn) {
    await Tone.start();
    const item = library.find(t => t.id === id);
    if (!item) return;

    if (previewPlayer && previewPlayer.state === 'started') {
        previewPlayer.stop();
        previewPlayer.dispose();
        previewPlayer = null;
        document.querySelectorAll('.fa-stop').forEach(i => i.className = 'fas fa-play');
        return;
    }

    btn.querySelector('i').className = 'fas fa-spinner fa-spin';
    const buffer = await Tone.context.decodeAudioData(await item.blob.arrayBuffer());
    
    previewPlayer = new Tone.Player(buffer).toDestination();
    previewPlayer.onstop = () => { btn.querySelector('i').className = 'fas fa-play'; };
    previewPlayer.start();
    btn.querySelector('i').className = 'fas fa-stop';
}

function openRename(id) {
    editingId = id;
    const item = library.find(t => t.id === id);
    document.getElementById('renameInput').value = item.name;
    document.getElementById('renameModal').style.display = 'flex';
}

document.getElementById('btnConfirmRename').onclick = () => {
    const newName = document.getElementById('renameInput').value;
    if (newName && editingId) {
        const tx = db.transaction(['tracks'], 'readwrite');
        tx.objectStore('tracks').get(editingId).onsuccess = e => {
            const data = e.target.result;
            data.name = newName;
            tx.objectStore('tracks').put(data).onsuccess = () => {
                loadTracks();
                document.getElementById('renameModal').style.display = 'none';
            };
        };
    }
};

function deleteTrack(id) {
    if (confirm("Tem certeza que deseja excluir este playback?")) {
        const tx = db.transaction(['tracks'], 'readwrite');
        tx.objectStore('tracks').delete(id).onsuccess = () => loadTracks();
    }
}

async function sendToStudio(id) {
    const item = library.find(t => t.id === id);
    if (!item) return;
    
    document.querySelector('[data-target="studio"]').click();
    document.getElementById('studioName').innerText = item.name;
    document.getElementById('studioStatus').innerText = "Preparando motor SoundTouchJS...";
    
    if(typeof loadAudioForStudio === "function") {
        await loadAudioForStudio(item);
    }
}
