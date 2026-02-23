let currentAudioBuffer = null;
let currentTrackName = "";
let soundTouchNode = null; 
let isPlaying = false;
let currentPitchRatio = 1.0;

// Cria um contexto de áudio totalmente independente (O Tone.js costuma causar conflitos)
const myAudioCtx = new (window.AudioContext || window.webkitAudioContext)();

async function loadAudioForStudio(item) {
    try {
        currentTrackName = item.name;
        
        // Decodifica o áudio
        const arrayBuffer = await item.blob.arrayBuffer();
        currentAudioBuffer = await myAudioCtx.decodeAudioData(arrayBuffer);
        
        document.getElementById('studioStatus').innerText = `Motor Ativo | Duração: ${Math.round(currentAudioBuffer.duration)}s`;
        
        if (isPlaying) togglePlay(); // Pausa se tiver tocando algo anterior
        setTone(0, document.querySelector('.t-btn.orig'));
        
    } catch (e) {
        console.error(e);
        document.getElementById('studioStatus').innerText = "Erro ao carregar áudio. Arquivo corrompido?";
    }
}

function setTone(semitones, btnElement) {
    if (!currentAudioBuffer) return;
    
    document.querySelectorAll('.t-btn').forEach(b => b.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    // 0 = 1.0 (Original) | Fórmula matemática avançada
    currentPitchRatio = Math.pow(2, semitones / 12);
    
    if (soundTouchNode && isPlaying) {
        soundTouchNode.pitch = currentPitchRatio;
    }
}

async function togglePlay() {
    if (!currentAudioBuffer) {
        alert("Nenhum áudio carregado. Vá na biblioteca e envie uma música para o Estúdio.");
        return;
    }

    // Se o navegador suspendeu o áudio (política de autoplay), a gente acorda ele
    if (myAudioCtx.state === 'suspended') {
        await myAudioCtx.resume();
    }

    if (isPlaying) {
        // PARAR A MÚSICA
        if (soundTouchNode) {
            soundTouchNode.disconnect();
            soundTouchNode = null;
        }
        isPlaying = false;
        
        // Atualiza UI
        const btn = document.getElementById('btnPlay');
        btn.innerHTML = '<i class="fas fa-play"></i> Reproduzir';
        btn.style.background = "var(--text-main)";
        btn.style.color = "var(--bg-base)";
        
    } else {
        // TOCAR A MÚSICA
        try {
            // Se SoundTouchJS não foi carregado pelo HTML, joga um erro
            const ShifterClass = window.PitchShifter || (window.SoundTouchJS ? window.SoundTouchJS.PitchShifter : null);
            
            if (!ShifterClass) {
                alert("Erro crítico: Motor SoundTouchJS não encontrado.");
                return;
            }

            // Inicia o motor com buffer de 2048 (seguro para mobile, 16384 era o que travava)
            soundTouchNode = new ShifterClass(myAudioCtx, currentAudioBuffer, 2048);
            soundTouchNode.pitch = currentPitchRatio;
            
            // Conecta à saída principal do celular/pc e começa
            soundTouchNode.connect(myAudioCtx.destination);
            isPlaying = true;

            // Atualiza UI
            const btn = document.getElementById('btnPlay');
            btn.innerHTML = '<i class="fas fa-pause"></i> Pausar';
            btn.style.background = "#ff3b30";
            btn.style.color = "#fff";

        } catch (error) {
            console.error("Erro ao iniciar reprodução:", error);
            alert("Ocorreu um erro ao processar o áudio. Tente recarregar a página.");
        }
    }
}

function exportTrack() {
    alert("Gravação em tempo real: Para salvar o arquivo com o timbre perfeito, por favor use um aplicativo de gravação de tela, ou conecte a saída de fone do celular diretamente na mesa de som!");
}
