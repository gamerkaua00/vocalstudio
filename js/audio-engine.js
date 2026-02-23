let currentAudioBuffer = null;
let currentTrackName = "";
let soundTouchNode = null; 
let isPlaying = false;
let currentPitchRatio = 1.0;

// Utiliza o Web Audio Context nativo por baixo dos panos do Tone.js
const audioCtx = Tone.context.rawContext;

async function loadAudioForStudio(item) {
    try {
        currentTrackName = item.name;
        
        // Decodifica o áudio do banco de dados
        const arrayBuffer = await item.blob.arrayBuffer();
        currentAudioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
        
        document.getElementById('studioStatus').innerText = `Motor: SoundTouchJS | Duração: ${Math.round(currentAudioBuffer.duration)}s`;
        
        // Reseta tudo ao carregar uma nova música
        if (isPlaying) togglePlay();
        setTone(0, document.querySelector('.t-btn.orig'));
        
    } catch (e) {
        console.error(e);
        document.getElementById('studioStatus').innerText = "Erro ao carregar áudio.";
    }
}

function setTone(semitones, btnElement) {
    if (!currentAudioBuffer) return;
    
    // Atualiza botões na interface
    document.querySelectorAll('.t-btn').forEach(b => b.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    // Transforma semitons (+1, -2, etc) na proporção matemática que o motor entende
    currentPitchRatio = Math.pow(2, semitones / 12);
    
    // Se a música já estiver tocando, aplica a mudança na hora
    if (soundTouchNode && isPlaying) {
        soundTouchNode.pitch = currentPitchRatio;
    }
}

async function togglePlay() {
    if (!currentAudioBuffer) {
        alert("Carregue uma música no estúdio primeiro.");
        return;
    }

    if (isPlaying) {
        // Para a música
        if (soundTouchNode) {
            soundTouchNode.disconnect();
            soundTouchNode = null;
        }
        isPlaying = false;
        document.getElementById('btnPlay').innerHTML = '<i class="fas fa-play"></i> Reproduzir';
        document.getElementById('btnPlay').style.background = "var(--text-main)";
        document.getElementById('btnPlay').style.color = "var(--bg-base)";
    } else {
        // Toca a música ativando o contexto
        if (audioCtx.state === 'suspended') {
            await audioCtx.resume();
        }
        
        // Configura o PitchShifter do SoundTouchJS
        soundTouchNode = new SoundTouchJS.PitchShifter(audioCtx, currentAudioBuffer, 16384);
        soundTouchNode.pitch = currentPitchRatio;
        
        // Conecta nas caixas de som e começa a tocar
        soundTouchNode.connect(audioCtx.destination);
        
        isPlaying = true;
        document.getElementById('btnPlay').innerHTML = '<i class="fas fa-pause"></i> Pausar';
        document.getElementById('btnPlay').style.background = "#ff3b30";
        document.getElementById('btnPlay').style.color = "#fff";
    }
}

function exportTrack() {
    // Alerta temporário para proteger a memória do celular
    alert("Gravação direta em desenvolvimento. Para usar agora, conecte a saída de áudio do dispositivo diretamente na mesa de som, ou use um gravador de tela.");
}
