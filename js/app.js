let db;
let library = [];
let editingId = null;

// Inicializa Banco de Dados
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
req.onerror = () => {
    document.getElementById('dbStatus').innerText = "Erro DB";
    document.getElementById('dbStatus').style.color = "#ff1744";
};

// Controle das Abas
document.querySelectorAll('.tab-btn').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(`screen-${tab.dataset.target}`).classList.add('active');
    });
});

// Importação (Exposta globalmente)
window.handleImport = async function(files) {
    if (!files.length) return;
    const file = files[0];
    const name = file.name.replace(/\.[^/.]+$/, "");
    
    document.getElementById('dbStatus').innerText = "Salvando...";
    
    const tx = db.transaction(['tracks'], 'readwrite');
    tx.objectStore('tracks').add({ name: name, blob: file, date: Date.now() });
    
    tx.oncomplete = () => {
        document.getElementById('dbStatus').innerText = "DB OK";
        loadTracks();
        document.getElementById('fileInput').value = ''; 
    };
};

function loadTracks() {
    if(!db) return;
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
                    <button class="btn-icon" onclick="window.previewLibTrack(${item.id}, this)"><i class="fas fa-play"></i></button>
                    <button class="btn-icon blue" onclick="window.sendToStudio(${item.id})"><i class="fas fa-sliders-h"></i> Estúdio</button>
                </div>
                <div class="action-group">
                    <button class="btn-icon yellow" onclick="window.openRename(${item.id})"><i class="fas fa-pen"></i></button>
                    <button class="btn-icon red" onclick="window.deleteTrack(${item.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `;
        list.appendChild(div);
    });
}

// Funções da Biblioteca (Expostas globalmente)
let previewPlayer = null;

window.previewLibTrack = async function(id, btn) {
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
    try {
        const buffer = await Tone.context.decodeAudioData(await item.blob.arrayBuffer());
        previewPlayer = new Tone.Player(buffer).toDestination();
        previewPlayer.onstop = () => { 
            if(btn.querySelector('i')) btn.querySelector('i').className = 'fas fa-play'; 
        };
        previewPlayer.start();
        btn.querySelector('i').className = 'fas fa-stop';
    } catch (e) {
        alert("Erro ao reproduzir preview.");
        btn.querySelector('i').className = 'fas fa-play';
    }
};

window.openRename = function(id) {
    editingId = id;
    const item = library.find(t => t.id === id);
    document.getElementById('renameInput').value = item.name;
    document.getElementById('renameModal').style.display = 'flex';
};

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

window.deleteTrack = function(id) {
    if (confirm("Excluir definitivamente este playback?")) {
        const tx = db.transaction(['tracks'], 'readwrite');
        tx.objectStore('tracks').delete(id).onsuccess = () => loadTracks();
    }
};

window.sendToStudio = async function(id) {
    const item = library.find(t => t.id === id);
    if (!item) return;
    
    // Para o preview se estiver tocando
    if (previewPlayer && previewPlayer.state === 'started') {
        previewPlayer.stop();
    }

    document.querySelector('[data-target="studio"]').click();
    document.getElementById('studioName').innerText = item.name;
    document.getElementById('studioStatus').innerText = "Carregando no motor de tons...";
    
    if(typeof window.loadAudioForStudio === "function") {
        await window.loadAudioForStudio(item);
    } else {
        alert("O motor de áudio ainda está carregando, tente novamente em alguns segundos.");
    }
};
