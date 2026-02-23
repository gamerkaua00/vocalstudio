// js/app.js
document.addEventListener('DOMContentLoaded', () => {
    // 1. Splash Screen Logic
    setTimeout(() => {
        const splash = document.getElementById('splashScreen');
        splash.style.opacity = '0';
        setTimeout(() => splash.style.display = 'none', 500);
        document.getElementById('dbStatus').innerText = "Sistema Pronto";
        document.getElementById('dbStatus').style.color = "var(--kmz-blue)";
    }, 1500);

    // 2. Tab Navigation
    const tabs = document.querySelectorAll('.tab-btn');
    const screens = document.querySelectorAll('.screen');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            screens.forEach(s => s.classList.remove('active'));
            
            tab.classList.add('active');
            document.getElementById(`screen-${tab.dataset.target}`).classList.add('active');
        });
    });

    // 3. Importação de Arquivo
    const btnImport = document.getElementById('btnImport');
    const fileInput = document.getElementById('fileInput');

    btnImport.addEventListener('click', async () => {
        // Obrigatório iniciar o contexto de áudio do Tone.js num clique de usuário
        await Tone.start(); 
        fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        document.getElementById('studioName').innerText = "Carregando faixa...";
        document.getElementById('studioStatus').innerText = "Processando áudio original...";
        
        // Simula uma lista de biblioteca simples
        document.getElementById('libList').innerHTML = `
            <div style="padding: 15px; background: var(--bg-panel); border: 1px solid var(--kmz-blue); border-radius: 6px; margin-top: 15px;">
                <strong>${file.name}</strong> <br>
                <span style="font-size: 0.8rem; color: var(--text-muted)">Pronto para edição</span>
            </div>
        `;

        // Navega para o estúdio automaticamente
        tabs[1].click();
        
        // Passa o arquivo para o Motor de Áudio
        await loadAudioTrack(file);
    });

    // 4. Controles de Tom
    const pitchButtons = document.querySelectorAll('.t-btn');
    pitchButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            pitchButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            const semitones = parseInt(e.target.dataset.pitch);
            setAudioPitch(semitones);
        });
    });

    // 5. Controles de Playback
    const btnPlay = document.getElementById('btnPlay');
    btnPlay.addEventListener('click', togglePlayback);

    // 6. Exportar
    const btnExport = document.getElementById('btnExport');
    btnExport.addEventListener('click', exportTrack);
});

// Função chamada pelo audio-engine.js para atualizar o botão de Play/Pause na UI
function updatePlayButtonUI(isPlaying) {
    const btnPlay = document.getElementById('btnPlay');
    if (isPlaying) {
        btnPlay.innerHTML = '<i class="fas fa-pause"></i> Pausar';
        btnPlay.style.background = "#ff3b30"; // Vermelho suave para pause
        btnPlay.style.color = "#fff";
    } else {
        btnPlay.innerHTML = '<i class="fas fa-play"></i> Reproduzir';
        btnPlay.style.background = "var(--text-main)";
        btnPlay.style.color = "var(--bg-base)";
    }
}
