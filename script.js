// --- "Мозг" v2.0: Адаптация под Мобильные Устройства ---

const fileInput = document.getElementById('audioFiles');
const stitchButton = document.getElementById('stitchButton');
const statusDiv = document.getElementById('status');
const resultDiv = document.getElementById('result');

// Создаем "корзину", куда будем складывать выбранные файлы
let filesToStitch = [];

// --- НОВАЯ ЛОГИКА ДОБАВЛЕНИЯ ФАЙЛОВ ---
fileInput.addEventListener('change', () => {
    // Если пользователь выбрал хотя бы один файл...
    if (fileInput.files.length > 0) {
        // Добавляем этот файл в нашу "корзину"
        filesToStitch.push(fileInput.files[0]);
        
        // Показываем пользователю, что мы добавили
        statusDiv.innerHTML += `Добавлен файл: ${fileInput.files[0].name}<br>`;
        
        // Если в "корзине" уже 2 или больше файлов, активируем кнопку
        if (filesToStitch.length >= 2) {
            stitchButton.disabled = false;
        }
    }
    // Сбрасываем input, чтобы можно было выбрать тот же файл снова
    fileInput.value = ''; 
});

// --- ГЛАВНАЯ МАГИЯ (остается почти без изменений) ---
stitchButton.addEventListener('click', async () => {
    stitchButton.disabled = true;
    statusDiv.textContent = 'Обработка... Пожалуйста, подождите...';
    resultDiv.innerHTML = '';

    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const buffers = [];

        // Теперь мы проходимся по файлам из НАШЕЙ "КОРЗИНЫ"
        for (const file of filesToStitch) {
            statusDiv.textContent = `Читаем файл: ${file.name}...`;
            const arrayBuffer = await file.arrayBuffer();
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            buffers.push(audioBuffer);
        }
        
        // ... (вся остальная часть "сшивки" остается ТОЧНО ТАКОЙ ЖЕ, как в прошлом коде) ...
        statusDiv.textContent = 'Склеиваем дорожки...';
        let totalLength = 0;
        for (const buffer of buffers) {
            totalLength += buffer.length;
        }
        const outputBuffer = audioContext.createBuffer(
            buffers[0].numberOfChannels, 
            totalLength,
            buffers[0].sampleRate
        );
        let offset = 0;
        for (const buffer of buffers) {
            for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
                outputBuffer.getChannelData(channel).set(buffer.getChannelData(channel), offset);
            }
            offset += buffer.length;
        }

        statusDiv.textContent = 'Создаем финальный файл...';
        const wavBlob = bufferToWave(outputBuffer);
        const audioUrl = URL.createObjectURL(wavBlob);

        const audio = new Audio(audioUrl);
        audio.controls = true;
        
        const downloadLink = document.createElement('a');
        downloadLink.href = audioUrl;
        downloadLink.download = 'stitched_audio.wav';
        downloadLink.textContent = 'Скачать результат (.wav)';
        
        resultDiv.appendChild(audio);
        resultDiv.appendChild(document.createElement('br'));
        resultDiv.appendChild(downloadLink);

        statusDiv.textContent = 'Готово! ✅';
        filesToStitch = []; // Очищаем "корзину" после успешной склейки

    } catch (error) {
        statusDiv.textContent = `Ошибка: ${error.message}`;
        console.error(error);
    } finally {
        stitchButton.disabled = true; // Деактивируем кнопку после использования
    }
});

// --- МАГИЧЕСКАЯ ФУНКЦИЯ-ПОМОЩНИК (остается БЕЗ ИЗМЕНЕНИЙ) ---
function bufferToWave(abuffer) {
    let numOfChan = abuffer.numberOfChannels,
        length = abuffer.length * numOfChan * 2 + 44,
        buffer = new ArrayBuffer(length),
        view = new DataView(buffer),
        channels = [],
        i, sample,
        offset = 0,
        pos = 0;
    setUint32(0x46464952); setUint32(length - 8); setUint32(0x45564157);
    setUint32(0x20746d66); setUint32(16); setUint16(1); setUint16(numOfChan);
    setUint32(abuffer.sampleRate); setUint32(abuffer.sampleRate * 2 * numOfChan);
    setUint16(numOfChan * 2); setUint16(16); setUint32(0x61746164);
    setUint32(length - pos - 4);
    for (i = 0; i < abuffer.numberOfChannels; i++) channels.push(abuffer.getChannelData(i));
    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset]));
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
            view.setInt16(pos, sample, true); pos += 2;
        }
        offset++;
    }
    return new Blob([view], { type: 'audio/wav' });
    function setUint16(data) { view.setUint16(pos, data, true); pos += 2; }
    function setUint32(data) { view.setUint32(pos, data, true); pos += 4; }
}