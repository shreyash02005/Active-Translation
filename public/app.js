/**
 * Real-Time Language Translator
 * Frontend Logic
 */
import { GoogleGenAI } from '@google/genai';

// DOM Elements
const fromLangSelect = document.getElementById('fromLang');
const toLangSelect = document.getElementById('toLang');
const swapBtn = document.getElementById('swapBtn');
const inputText = document.getElementById('inputText');
const outputText = document.getElementById('outputText');
const charCount = document.getElementById('charCount');
const clearBtn = document.getElementById('clearBtn');
const micBtn = document.getElementById('micBtn');
const micStatus = document.getElementById('micStatus');
const micStatusContainer = document.getElementById('micStatusContainer');
const micPulse = document.getElementById('micPulse');
const micIcon = document.getElementById('micIcon');
const stopIcon = document.getElementById('stopIcon');
const waveform = document.getElementById('waveform');
const loading = document.getElementById('loading');
const copyBtn = document.getElementById('copyBtn');
const speakBtn = document.getElementById('speakBtn');
const cursor = document.getElementById('cursor');
const placeholder = document.getElementById('placeholder');
const kannadaWarning = document.getElementById('kannadaWarning');
const errorToast = document.getElementById('errorToast');
const toastMessage = document.getElementById('toastMessage');
const modeText = document.getElementById('modeText');
const modeVoice = document.getElementById('modeVoice');
const darkModeToggle = document.getElementById('darkModeToggle');
const darkModeIcon = document.getElementById('darkModeIcon');

// State
let recognition = null;
let isListening = false;
let isSpeaking = false;
let debounceTimer = null;
let translationController = null;
let currentMode = 'text'; // 'text' or 'voice'
let audioContext = null;
let analyser = null;
let dataArray = null;
let animationId = null;
let stream = null;

// Gemini AI Setup
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    console.error('GEMINI_API_KEY is not defined. Please set it in your environment variables.');
    window.addEventListener('DOMContentLoaded', () => {
        showToast('API Key missing. Please set GEMINI_API_KEY in Vercel settings.', 'danger');
    });
}
const ai = new GoogleGenAI({ apiKey: apiKey || 'dummy-key' });

// Initialize Speech Recognition
function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        micBtn.classList.add('hidden');
        micStatus.textContent = 'Speech input not supported.';
        micStatusContainer.classList.remove('opacity-0');
        return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
        isListening = true;
        micPulse.classList.remove('hidden');
        micIcon.classList.add('hidden');
        stopIcon.classList.remove('hidden');
        micStatusContainer.classList.remove('opacity-0');
        waveform.classList.remove('opacity-0');
        startAudioAnalysis();
    };

    recognition.onresult = (event) => {
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                finalTranscript += event.results[i][0].transcript;
            }
        }

        if (finalTranscript) {
            inputText.value += finalTranscript + ' ';
            updateCharCount();
            handleTranslation();
        }
    };

    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
            showToast('Microphone access denied. Please allow permissions.', 'danger');
        } else {
            showToast('Speech recognition error: ' + event.error, 'danger');
        }
        stopListening();
    };

    recognition.onend = () => {
        if (isListening) {
            try {
                recognition.start();
            } catch (e) {
                console.warn('Recognition already started');
            }
        } else {
            stopListening();
        }
    };
}

// Audio Analysis for Visualizer
async function startAudioAnalysis() {
    try {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const source = audioContext.createMediaStreamSource(stream);
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 32;
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        updateWaveform();
    } catch (err) {
        console.error('Error accessing microphone for visualization:', err);
    }
}

function updateWaveform() {
    if (!isListening) return;

    analyser.getByteFrequencyData(dataArray);
    const bars = waveform.querySelectorAll('.bar');
    
    // Calculate average volume for color shifting
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    const volumeFactor = average / 128; // 0 to 2 range roughly

    bars.forEach((bar, index) => {
        // Use different frequency bins for each bar
        const value = dataArray[index % dataArray.length];
        const percent = (value / 255) * 100;
        const height = Math.max(20, percent * 1.5);
        
        bar.style.height = `${height}%`;
        
        // Nuanced color feedback based on volume
        // Transition from primary blue to secondary saffron/orange
        const r = Math.floor(26 + (251 - 26) * volumeFactor);
        const g = Math.floor(35 + (109 - 35) * volumeFactor);
        const b = Math.floor(126 + (0 - 126) * volumeFactor);
        
        if (average > 20) {
            bar.style.backgroundColor = `rgb(${r}, ${g}, ${b})`;
            micPulse.style.borderColor = `rgba(${r}, ${g}, ${b}, 0.2)`;
        } else {
            // Reset to defaults if quiet
            bar.style.backgroundColor = index % 2 === 0 ? '#000666' : '#fb6d00';
            micPulse.style.borderColor = 'rgba(198, 40, 40, 0.2)';
        }
    });

    animationId = requestAnimationFrame(updateWaveform);
}

function stopAudioAnalysis() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
}

// Toggle Microphone
function toggleMic() {
    if (!recognition) return;

    if (isListening) {
        stopListening();
    } else {
        startListening();
    }
}

function startListening() {
    if (!recognition) return;
    recognition.lang = fromLangSelect.value;
    try {
        recognition.start();
        setMode('voice');
    } catch (e) {
        console.warn('Recognition already started');
    }
}

function stopListening() {
    if (!recognition) return;
    isListening = false;
    try {
        recognition.stop();
    } catch (e) {
        // Ignore
    }
    micPulse.classList.add('hidden');
    micIcon.classList.remove('hidden');
    stopIcon.classList.add('hidden');
    micStatusContainer.classList.add('opacity-0');
    waveform.classList.add('opacity-0');
    stopAudioAnalysis();
}

// Mode Switching
function setMode(mode) {
    currentMode = mode;
    if (mode === 'text') {
        modeText.classList.add('bg-secondary-container', 'text-on-secondary-container');
        modeText.classList.remove('bg-surface-container-lowest', 'text-on-surface');
        modeVoice.classList.add('bg-surface-container-lowest', 'text-on-surface');
        modeVoice.classList.remove('bg-secondary-container', 'text-on-secondary-container');
        stopListening();
    } else {
        modeVoice.classList.add('bg-secondary-container', 'text-on-secondary-container');
        modeVoice.classList.remove('bg-surface-container-lowest', 'text-on-surface');
        modeText.classList.add('bg-surface-container-lowest', 'text-on-surface');
        modeText.classList.remove('bg-secondary-container', 'text-on-secondary-container');
    }
}

modeText.addEventListener('click', () => setMode('text'));
modeVoice.addEventListener('click', () => {
    setMode('voice');
    startListening();
});

// Translation Logic
async function handleTranslation() {
    const text = inputText.value.trim();
    const fromLang = fromLangSelect.value;
    const toLang = toLangSelect.value;

    if (!text) {
        outputText.classList.add('hidden');
        placeholder.classList.remove('hidden');
        cursor.classList.add('hidden');
        return;
    }

    // Cancel previous request if any
    if (translationController) {
        translationController.abort();
    }

    const controller = new AbortController();
    translationController = controller;
    
    loading.classList.remove('hidden');
    cursor.classList.remove('hidden');
    placeholder.classList.add('hidden');
    outputText.classList.remove('hidden');
    outputText.textContent = '';

    try {
        const systemInstruction = `
            You are a professional translator. 
            Translate the following text FROM ${fromLang} TO ${toLang}.
            Rules:
            - Return ONLY the translated text.
            - No explanations, no "Here is the translation:", no quotation marks.
            - Preserve the tone and meaning of the original.
            - Handle casual speech, slang, and incomplete sentences gracefully.
            - If the input is already in the target language, return it unchanged.
        `;

        const sanitizedText = text.replace(/<[^>]*>?/gm, '');

        const stream = await ai.models.generateContentStream({
            model: 'gemini-3-flash-preview',
            contents: sanitizedText,
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.3,
            }
        });

        for await (const chunk of stream) {
            if (controller.signal.aborted) break;
            
            const chunkText = chunk.text;
            if (chunkText) {
                outputText.textContent += chunkText;
                const container = document.getElementById('outputTextContainer');
                container.scrollTop = container.scrollHeight;
            }
        }

    } catch (error) {
        if (error.name === 'AbortError' || controller.signal.aborted) return;
        console.error('Translation error:', error);
        showToast('Translation failed. Please try again.', 'danger');
    } finally {
        if (translationController === controller) {
            loading.classList.add('hidden');
            cursor.classList.add('hidden');
            translationController = null;
        }
    }
}

// Debounced Input
inputText.addEventListener('input', () => {
    setMode('text');
    updateCharCount();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(handleTranslation, 400);
});

// Character Counter
function updateCharCount() {
    const length = inputText.value.length;
    charCount.textContent = `${length} / 5000`;
    if (length > 5000) {
        charCount.classList.add('text-error');
    } else {
        charCount.classList.remove('text-error');
    }
}

// Swap Languages
function swapLanguages() {
    const temp = fromLangSelect.value;
    fromLangSelect.value = toLangSelect.value;
    toLangSelect.value = temp;
    
    saveLanguages();
    if (inputText.value.trim()) {
        handleTranslation();
    }
}

// Save Languages to LocalStorage
function saveLanguages() {
    localStorage.setItem('bhashalive_from', fromLangSelect.value);
    localStorage.setItem('bhashalive_to', toLangSelect.value);
}

// Clear All
function clearAll() {
    if (inputText.value.length > 50) {
        if (!confirm('Are you sure you want to clear your current translation?')) {
            return;
        }
    }
    inputText.value = '';
    outputText.textContent = '';
    outputText.classList.add('hidden');
    placeholder.classList.remove('hidden');
    updateCharCount();
    stopListening();
}

// Text to Speech
function speakTranslation() {
    const text = outputText.textContent.trim();
    const targetLang = toLangSelect.value;

    if (!text) return;

    if (isSpeaking) {
        window.speechSynthesis.cancel();
        isSpeaking = false;
        speakBtn.textContent = 'volume_up';
        speakBtn.classList.remove('speaking');
        return;
    }

    // Cancel any ongoing speech first
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = targetLang;
    utterance.rate = 0.9;
    utterance.pitch = 1.0;

    // Get voices - handle potential empty array
    let voices = window.speechSynthesis.getVoices();
    
    // If voices are empty, try to get them again (some browsers need this)
    if (voices.length === 0) {
        voices = window.speechSynthesis.getVoices();
    }

    let voice = voices.find(v => v.lang === targetLang || v.lang === targetLang.replace('-', '_'));
    
    if (!voice) {
        const langPrefix = targetLang.split('-')[0];
        voice = voices.find(v => v.lang.startsWith(langPrefix));
    }

    if (voice) {
        utterance.voice = voice;
    }

    utterance.onstart = () => {
        isSpeaking = true;
        speakBtn.textContent = 'stop_circle';
        speakBtn.classList.add('speaking');
    };

    utterance.onend = () => {
        isSpeaking = false;
        speakBtn.textContent = 'volume_up';
        speakBtn.classList.remove('speaking');
    };

    if (targetLang === 'kn-IN') {
        const hasKannada = voices.some(v => v.lang.toLowerCase().includes('kn'));
        if (!hasKannada) {
            kannadaWarning.classList.remove('hidden');
            setTimeout(() => kannadaWarning.classList.add('hidden'), 5000);
        }
    }

    utterance.onerror = (event) => {
        console.error('SpeechSynthesisUtterance error:', event.error);
        isSpeaking = false;
        speakBtn.textContent = 'volume_up';
        speakBtn.classList.remove('speaking');
        showToast('Audio playback failed: ' + (event.error || 'Unknown error'), 'danger');
    };

    // Small delay to ensure cancel finished and voices are ready
    setTimeout(() => {
        window.speechSynthesis.speak(utterance);
    }, 50);
}

// Copy to Clipboard
function copyToClipboard() {
    const text = outputText.textContent.trim();
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
        showToast('Copied to clipboard!', 'success');
        const originalIcon = copyBtn.textContent;
        copyBtn.textContent = 'check_circle';
        copyBtn.classList.add('text-success');
        setTimeout(() => {
            copyBtn.textContent = originalIcon;
            copyBtn.classList.remove('text-success');
        }, 2000);
    }).catch(err => {
        console.error('Copy failed:', err);
    });
}

// Toast Notification
function showToast(message, type = 'danger') {
    toastMessage.textContent = message;
    const toastEl = document.getElementById('errorToast');
    
    if (type === 'success') {
        toastEl.classList.remove('bg-error');
        toastEl.classList.add('bg-success');
    } else {
        toastEl.classList.remove('bg-success');
        toastEl.classList.add('bg-error');
    }

    toastEl.classList.add('toast-visible');
    setTimeout(() => {
        toastEl.classList.remove('toast-visible');
    }, 3000);
}

// Dark Mode
function toggleDarkMode() {
    const isDark = document.documentElement.classList.toggle('dark');
    darkModeIcon.textContent = isDark ? 'light_mode' : 'dark_mode';
    localStorage.setItem('bhashalive_theme', isDark ? 'dark' : 'light');
}

// Event Listeners
swapBtn.addEventListener('click', swapLanguages);
fromLangSelect.addEventListener('change', saveLanguages);
toLangSelect.addEventListener('change', saveLanguages);
clearBtn.addEventListener('click', clearAll);
micBtn.addEventListener('click', toggleMic);
copyBtn.addEventListener('click', copyToClipboard);
speakBtn.addEventListener('click', speakTranslation);
darkModeToggle.addEventListener('click', toggleDarkMode);

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    initSpeechRecognition();
    
    // Restore Languages
    const savedFrom = localStorage.getItem('bhashalive_from');
    const savedTo = localStorage.getItem('bhashalive_to');
    if (savedFrom) fromLangSelect.value = savedFrom;
    if (savedTo) toLangSelect.value = savedTo;

    // Restore Theme
    const savedTheme = localStorage.getItem('bhashalive_theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
        darkModeIcon.textContent = 'light_mode';
    }

    if (typeof speechSynthesis !== 'undefined') {
        window.speechSynthesis.getVoices();
    }

    // Suggestions
    document.querySelectorAll('.suggestion-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            inputText.value = chip.textContent;
            updateCharCount();
            handleTranslation();
        });
    });
});

