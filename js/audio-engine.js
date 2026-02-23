// js/audio-engine.js

let player = null;
let pitchShift = null;
let currentBuffer = null;
let trackFileName = "playback_kmz";

// Inicializa e carrega a música
async function loadAudioTrack(file) {
    try {
        trackFileName = file.name.replace(/\.[^/.]+$/, ""); // Pega o nome sem a extensão
        
        // Converte o arquivo em ArrayBuffer para o Tone.js decodificar
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await Tone.context.decodeAudioData(arrayBuffer);
        currentBuffer = audioBuffer;

        // Limpa instâncias anteriores para liberar memória RAM
        if (player) player.dispose();
        if (pitchShift) pitchShift.dispose();
        Tone.Transport.stop();
        Tone.Transport.seconds = 0;

        // CRIA O NOVO MOTOR: PitchShift de alta fidelidade
        // O windowSize controla a suavidade. 0.1 é um bom padrão para músicas completas.
        pitchShift = new Tone.PitchShift({
            pitch: 0,
            windowSize: 0.1, 
            delayTime: 0,
            feedback: 0
        }).toDestination();

        // Cria o Player padrão e conecta ao PitchShift
        player = new Tone.Player(audioBuffer).connect(pitchShift);
        
        // Sincroniza com a linha do tempo principal
        player.sync().start(0);

        // Atualiza a Interface
        document.getElementById('studioName').innerText = trackFileName;
        document.getElementById('studioStatus').innerText = `Motor Base: Tone.PitchShift | Duração: ${Math.round(audioBuffer.duration)}s`;
        
        // Reseta botões
        updatePlayButtonUI(false);
        setAudioPitch(0);
        document.querySelector('.t-btn.orig').classList.add('active');

    } catch (error) {
        console.error("Erro ao processar áudio:", error);
        document.getElementById('studioStatus').innerText = "Erro ao processar o arquivo de áudio.";
    }
}

// Altera o Tom
function setAudioPitch(semitones) {
    if (!pitchShift) return;
    
    // O Tone.PitchShift recebe o valor diretamente em semitons (ex: -2, 1, 3)
    pitchShift.pitch = semitones;
    console.log(`KMZ Engine: Tom alterado para ${semitones} semitons.`);
}

// Reproduzir / Pausar
async function togglePlayback() {
    if (!player) {
        alert("Por favor, importe uma faixa primeiro.");
        return;
    }

    await Tone.start(); // Garante que o contexto de áudio do navegador está ativo

    if (Tone.Transport.state === 'started') {
        Tone.Transport.pause();
        updatePlayButtonUI(false);
    } else {
        Tone.Transport.start();
        updatePlayButtonUI(true);
    }
}

// Renderizar e Exportar a nova versão
async function exportTrack() {
    if (!currentBuffer || !pitchShift) {
        alert("Nenhuma faixa carregada para exportar.");
        return;
    }

    const currentPitch = pitchShift.pitch;
    
    // Alerta o usuário (Renderização no navegador celular pode ser pesada)
    document.getElementById('studioStatus').innerText = "Renderizando... Aguarde (Isso pode travar a tela por uns segundos).";
    
    try {
        // Pausa a reprodução atual para economizar processamento
        if (Tone.Transport.state === 'started') {
            await togglePlayback();
        }

        // Renderização Offline (Processa o áudio em velocidade máxima no background)
        const renderedBuffer = await Tone.Offline(async () => {
            const offlinePitchShift = new Tone.PitchShift({
                pitch: currentPitch,
                windowSize: 0.1
            }).toDestination();
            
            const offlinePlayer = new Tone.Player(currentBuffer).connect(offlinePitchShift);
            offlinePlayer.start(0);
        }, currentBuffer.duration);

        // Converte o buffer renderizado para um arquivo WAV
        const wavBlob = bufferToWave(renderedBuffer, renderedBuffer.length);
        
        // Força o download
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        const sign = currentPitch > 0 ? "+" : "";
        a.download = `${trackFileName}_KMZ_Tom_${sign}${currentPitch}.wav`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        
        document.getElementById('studioStatus').innerText = "Download concluído com sucesso!";

    } catch (error) {
        console.error("Erro na exportação:", error);
        document.getElementById('studioStatus').innerText = "Erro ao exportar. Arquivo muito grande para a memória do navegador.";
    }
}

// ENCODER WAV (O mesmo que você já usava, é o método mais robusto para JS puro)
function bufferToWave(abuffer, len) {
    const numOfChan = abuffer.numberOfChannels;
    const length = len * numOfChan * 2 + 44;
    const buffer = new ArrayBuffer(length);
    const view = new DataView(buffer);
    const channels = [];
    let i, sample, offset = 0, pos = 0;

    function setUint16(data) { view.setUint16(pos, data, true); pos += 2; }
    function setUint32(data) { view.setUint32(pos, data, true); pos += 4; }

    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8);
    setUint32(0x45564157); // "WAVE"
    setUint32(0x20746d66); // "fmt "
    setUint32(16);
    setUint16(1);
    setUint16(numOfChan);
    setUint32(abuffer.sampleRate);
    setUint32(abuffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2);
    setUint16(16);
    setUint32(0x61746164); // "data"
    setUint32(length - pos - 4);

    for (i = 0; i < abuffer.numberOfChannels; i++) channels.push(abuffer.getChannelData(i));

    while (offset < len) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset]));
            sample = (sample < 0 ? sample * 0x8000 : sample * 0x7FFF) | 0;
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++;
    }
    return new Blob([buffer], { type: "audio/wav" });
}
