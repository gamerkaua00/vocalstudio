// 1. Importação segura da biblioteca via ESM
import { PitchShifter } from 'https://esm.sh/soundtouchjs@1.0.29';

// 2. Variáveis de Estado
let myAudioCtx = null; 
let currentAudioBuffer = null;
let shifterNode = null; 
let isPlaying = false;
let currentPitchRatio = 1.0;

// Função para iniciar o contexto de áudio SOMENTE após interação do usuário
function initAudioContext() {
    if (!myAudioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        myAudioCtx = new AudioContext();
    }
    return myAudioCtx;
}

// 3. Funções Expostas para o HTML e para o app.js
window.loadAudioForStudio = async function(item) {
    try {
        const ctx = initAudioContext();
        
        // Decodifica o áudio do IndexedDB
        const arrayBuffer = await item.blob.arrayBuffer();
        currentAudioBuffer = await ctx.decodeAudioData(arrayBuffer);
        
        document.getElementById('studioStatus').innerText = `Motor: SoundTouchJS | Duração: ${Math.round(currentAudioBuffer.duration)}s`;
        
        // Limpa estado anterior se houver
        if (isPlaying) await window.togglePlay(); 
        window.setTone(0, document.querySelector('.t-btn.orig'));
        
    } catch (error) {
        console.error("Erro na decodificação:", error);
        document.getElementById('studioStatus').innerText = "Falha ao processar o formato do arquivo.";
    }
};

window.setTone = function(semitones, btnElement) {
    if (!currentAudioBuffer) return; // Só permite se tiver música
    
    // Atualiza botões
    document.querySelectorAll('.t-btn').forEach(b => b.classList.remove('active'));
    if (btnElement) btnElement.classList.add('active');

    // Transforma o número de semitons em Ratio. Ex: +1 semiton = ~1.059 ratio
    currentPitchRatio = Math.pow(2, semitones / 12);
    
    // Atualiza o som instantaneamente se estiver tocando
    if (shifterNode && isPlaying) {
        shifterNode.pitch = currentPitchRatio;
    }
};

window.togglePlay = async function() {
    if (!currentAudioBuffer) {
        alert("Por favor, importe e selecione um playback na aba Biblioteca primeiro.");
        return;
    }

    const ctx = initAudioContext();

    // Acorda o navegador se ele suspendeu o áudio para poupar bateria
    if (ctx.state === 'suspended') {
        await ctx.resume();
    }

    const btnPlay = document.getElementById('btnPlay');

    if (isPlaying) {
        // ROTINA DE PAUSE
        if (shifterNode && shifterNode.node) {
            shifterNode.node.disconnect();
            shifterNode = null;
        }
        isPlaying = false;
        
        // UI
        btnPlay.innerHTML = '<i class="fas fa-play"></i> Reproduzir';
        btnPlay.style.background = "var(--text-main)";
        btnPlay.style.color = "var(--bg-base)";
        
    } else {
        // ROTINA DE PLAY (Cria a instância do PitchShifter)
        try {
            // Buffer size 4096 é o equilíbrio perfeito entre não travar e não ter delay
            shifterNode = new PitchShifter(ctx, currentAudioBuffer, 4096);
            shifterNode.pitch = currentPitchRatio;
            
            // O PitchShifter do SoundTouchJS expõe um ScriptProcessorNode chamado "node"
            shifterNode.node.connect(ctx.destination);
            isPlaying = true;

            // UI
            btnPlay.innerHTML = '<i class="fas fa-pause"></i> Pausar';
            btnPlay.style.background = "#ff3b30";
            btnPlay.style.color = "#fff";

        } catch (error) {
            console.error("Erro ao iniciar motor:", error);
            alert("Erro no motor de áudio. Tente recarregar a página.");
        }
    }
};

window.exportTrack = function() {
    alert("DICA KMZ: Devido à complexidade do SoundTouchJS, a gravação não ocorre offline no navegador celular. \n\nConecte a saída de fone do seu aparelho direto na mesa de som ou caixa amplificada, selecione o tom, e dê o play!");
};
