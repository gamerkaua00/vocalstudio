let currentAudioBuffer = null;
let currentTrackName = "";
let soundTouchNode = null; 
let isPlaying = false;
let currentPitchRatio = 1.0;
let myAudioCtx = null; // Inicia vazio para o navegador não travar a tela!

// Função para ligar o motor APENAS quando necessário
function getAudioContext() {
    if (!myAudioCtx) {
        myAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return myAudioCtx;
}

async function loadAudioForStudio(item) {
    try {
        currentTrackName = item.name;
        const ctx = getAudioContext(); // Acorda o motor aqui
        
        // Decodifica o áudio
        const arrayBuffer = await item.blob.arrayBuffer();
        currentAudioBuffer = await ctx.decodeAudioData(arrayBuffer);
        
        document.getElementById('studioStatus').innerText = `Motor Ativo | Duração: ${Math.round(currentAudioBuffer.duration)}s`;
        
        if (isPlaying) togglePlay(); 
        setTone(0, document.querySelector('.t-btn.orig'));
        
    } catch (e) {
        console.error(e);
        document.getElementById('studioStatus').innerText = "Erro ao carregar áudio. Arquivo incompatível?";
    }
}

function setTone(semitones, btnElement) {
    if (!currentAudioBuffer) return;
    
    document.querySelectorAll('.t-btn').forEach(b => b.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    // Transforma semitons na proporção matemática
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

    const ctx = getAudioContext(); // Garante que o motor está rodando

    if (ctx.state === 'suspended') {
        await ctx.resume();
    }

    if (isPlaying) {
        // PAUSAR
        if (soundTouchNode) {
            soundTouchNode.disconnect();
            soundTouchNode = null;
        }
        isPlaying = false;
        
        const btn = document.getElementById('btnPlay');
        btn.innerHTML = '<i class="fas fa-play"></i> Reproduzir';
        btn.style.background = "var(--text-main)";
        btn.style.color = "var(--bg-base)";
        
    } else {
        // TOCAR
        try {
            const ShifterClass = window.PitchShifter || (window.SoundTouchJS ? window.SoundTouchJS.PitchShifter : null);
            
            if (!ShifterClass) {
                alert("Motor SoundTouchJS bloqueado. Verifique sua conexão ou desative o AdBlock.");
                return;
            }

            soundTouchNode = new ShifterClass(ctx, currentAudioBuffer, 2048);
            soundTouchNode.pitch = currentPitchRatio;
            
            soundTouchNode.connect(ctx.destination);
            isPlaying = true;

            const btn = document.getElementById('btnPlay');
            btn.innerHTML = '<i class="fas fa-pause"></i> Pausar';
            btn.style.background = "#ff3b30";
            btn.style.color = "#fff";

        } catch (error) {
            console.error("Erro ao iniciar reprodução:", error);
            alert("Ocorreu um erro ao processar o áudio.");
        }
    }
}

function exportTrack() {
    alert("Gravação direta em desenvolvimento. Conecte o cabo auxiliar direto na mesa de som ou grave a tela para capturar a qualidade máxima!");
}
