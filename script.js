// 입력 값 요소
const repsInput = document.getElementById('reps-per-set');
const setsInput = document.getElementById('total-sets');

// 화면 표시 요소
const phaseText = document.getElementById('phase-text');
const timeLeftDisplay = document.getElementById('time-left');
const currentRepDisplay = document.getElementById('current-rep');
const totalRepsDisplay = document.getElementById('total-reps-display');
const currentSetDisplay = document.getElementById('current-set');
const totalSetsDisplay = document.getElementById('total-sets-display');
const timerCircle = document.querySelector('.timer-display');

// 화면 전환 요소
const setupScreen = document.getElementById('setup-screen');
const timerScreen = document.getElementById('timer-screen');

// 버튼
const goToTimerBtn = document.getElementById('go-to-timer-btn');
const toggleBtn = document.getElementById('stop-btn'); 
const backBtn = document.getElementById('back-btn');

// --- 드래그 앤 드롭 초기화 ---
const phaseList = document.getElementById('phase-list');
new Sortable(phaseList, {
    handle: '.drag-handle', 
    animation: 150, 
    ghostClass: 'sortable-ghost'
});

// --- 프리셋 데이터 및 로직 ---
const presetData = {
    '478': {
        name: '4-7-8 호흡법',
        order: ['inhale', 'hold', 'exhale'], 
        times: {
            inhale: 4,
            hold: 7,
            exhale: 8
        }
    },
    '1025': {
        name: '10-2-5 호흡법',
        order: ['exhale', 'hold', 'inhale'], 
        times: {
            exhale: 10,
            hold: 2,
            inhale: 5
        }
    }
};

const presetBtn = document.getElementById('preset-btn');
const presetModal = document.getElementById('preset-modal');

presetBtn.addEventListener('click', () => {
    presetModal.classList.add('active');
});

presetModal.addEventListener('click', (e) => {
    const btn = e.target.closest('.preset-item');
    if (btn) {
        const presetId = btn.dataset.preset;
        const preset = presetData[presetId];
        
        if (preset && confirm(`'${preset.name}' 프리셋을 적용하시겠습니까?`)) {
            document.getElementById('inhale-time').value = preset.times.inhale;
            document.getElementById('hold-time').value = preset.times.hold;
            document.getElementById('exhale-time').value = preset.times.exhale;

            preset.order.forEach(phaseKey => {
                const targetItem = phaseList.querySelector(`[data-phase="${phaseKey}"]`);
                if (targetItem) {
                    phaseList.appendChild(targetItem);
                }
            });

            presetModal.classList.remove('active');
        }
        return; 
    }

    if (e.target.id === 'close-modal-btn' || e.target === presetModal) {
        presetModal.classList.remove('active');
    }
});

// --- 상태 관리 변수 ---
let timer;
let countdownTimerInterval;
let timeLeft = 0;

let currentRep = 1;
let currentSet = 1;

let isRunning = false;        
let isPaused = false;         
let isCountdownPhase = false; 
let countdownValue = 3;

let currentOrder = []; 
let currentPhaseIndex = 0; 

// 🚀 iOS 사운드 버그 해결: 전역 오디오 컨텍스트 하나만 생성
let audioCtx;

function initAudio() {
    // 오디오 컨텍스트가 없으면 만들고
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    // iOS 정책에 의해 일시정지(suspended) 상태라면, 사용자 터치 시점에 깨워줌(resume)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
}

// 🔊 알림음 생성 함수 (매번 생성하지 않고 만들어진 오디오 엔진 사용)
function playBeep(frequency, type = 'sine', duration = 0.3) {
    if (!audioCtx) return; // 오디오 엔진이 아직 켜지지 않았다면 무시

    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    
    gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + duration);
}

function updateUI() {
    timeLeftDisplay.textContent = timeLeft;
    currentRepDisplay.textContent = currentRep;
    currentSetDisplay.textContent = currentSet;
    totalRepsDisplay.textContent = repsInput.value;
    totalSetsDisplay.textContent = setsInput.value;
}

function switchPhase(phaseName) {
    timerCircle.className = 'timer-display ' + phaseName + '-phase';

    if (phaseName === 'exhale') {
        phaseText.textContent = '내쉬기 (입)';
        timeLeft = parseInt(document.getElementById('exhale-time').value);
        playBeep(440); 
    } else if (phaseName === 'hold') {
        phaseText.textContent = '숨 참기';
        timeLeft = parseInt(document.getElementById('hold-time').value);
        playBeep(330); 
    } else if (phaseName === 'inhale') {
        phaseText.textContent = '들이마시기 (코)';
        timeLeft = parseInt(document.getElementById('inhale-time').value);
        playBeep(523.25); 
    }
    updateUI();
}

function nextStep() {
    currentPhaseIndex++; 
    
    if (currentPhaseIndex < currentOrder.length) {
        switchPhase(currentOrder[currentPhaseIndex]);
    } else {
        if (currentRep < parseInt(repsInput.value)) {
            currentRep++;
            currentPhaseIndex = 0; 
            switchPhase(currentOrder[currentPhaseIndex]);
        } else {
            if (currentSet < parseInt(setsInput.value)) {
                currentSet++;
                currentRep = 1;
                currentPhaseIndex = 0;
                playBeep(880, 'triangle', 0.5); 
                switchPhase(currentOrder[currentPhaseIndex]); 
            } else {
                finishTimer(); 
            }
        }
    }
}

function tick() {
    if (timeLeft > 1) {
        timeLeft--;
        updateUI();
    } else {
        nextStep(); 
    }
}

function switchScreen(hideScreen, showScreen) {
    hideScreen.classList.remove('active');
    setTimeout(() => {
        hideScreen.style.display = 'none';
        showScreen.style.display = 'block';
        setTimeout(() => {
            showScreen.classList.add('active');
        }, 30);
    }, 400);
}

function fetchCurrentOrder() {
    const items = document.querySelectorAll('#phase-list .draggable-item');
    currentOrder = Array.from(items).map(item => item.dataset.phase);
}

function startCountdown() {
    if (isRunning || isPaused) return; 
    isRunning = true; 
    isPaused = false;
    isCountdownPhase = true;
    countdownValue = 3;
    
    fetchCurrentOrder();
    
    toggleBtn.textContent = '정지';
    toggleBtn.style.pointerEvents = 'auto';
    toggleBtn.style.opacity = '1';
    
    phaseText.textContent = '준비';
    timeLeftDisplay.textContent = countdownValue;
    currentRepDisplay.textContent = '1';
    currentSetDisplay.textContent = '1';
    totalRepsDisplay.textContent = repsInput.value;
    totalSetsDisplay.textContent = setsInput.value;
    timerCircle.className = 'timer-display'; 
    
    playBeep(600, 'sine', 0.15);
    resumeCountdown();
}

function resumeCountdown() {
    phaseText.textContent = '준비';
    countdownTimerInterval = setInterval(() => {
        countdownValue--;
        if (countdownValue > 0) {
            timeLeftDisplay.textContent = countdownValue;
            playBeep(600, 'sine', 0.15); 
        } else {
            clearInterval(countdownTimerInterval);
            isCountdownPhase = false;
            isRunning = false; 
            startTimer(); 
        }
    }, 1000);
}

function startTimer() {
    if (isRunning) return;
    currentRep = 1;
    currentSet = 1;
    currentPhaseIndex = 0; 
    isRunning = true;
    
    updateUI();
    switchPhase(currentOrder[currentPhaseIndex]); 
    timer = setInterval(tick, 1000);
}

function resetTimerState() {
    clearInterval(timer);
    clearInterval(countdownTimerInterval); 
    isRunning = false;
    isPaused = false;
    isCountdownPhase = false;
    toggleBtn.textContent = '정지';
}

function finishTimer() {
    resetTimerState();
    toggleBtn.style.pointerEvents = 'none'; 
    toggleBtn.style.opacity = '0.5';
    phaseText.textContent = '완료!';
    timerCircle.className = 'timer-display'; 
    playBeep(1046.5, 'square', 0.6); 
}


// --- 이벤트 리스너 (버튼 클릭 시 오디오 엔진 깨우기 추가) ---

goToTimerBtn.addEventListener('click', () => {
    initAudio(); // 🚀 버튼을 누르는 순간 iOS 오디오 잠금 해제
    switchScreen(setupScreen, timerScreen);
    setTimeout(() => {
        startCountdown();
    }, 500);
});

toggleBtn.addEventListener('click', () => {
    initAudio(); // 🚀 정지/시작 조작 시에도 엔진 상태 확인
    if (isRunning) {
        clearInterval(timer);
        clearInterval(countdownTimerInterval);
        isRunning = false;
        isPaused = true;
        
        toggleBtn.textContent = '시작';
        phaseText.textContent = '일시정지';
    } 
    else if (isPaused) {
        isRunning = true;
        isPaused = false;
        
        toggleBtn.textContent = '정지';
        
        if (isCountdownPhase) {
            resumeCountdown(); 
        } else {
            if (currentOrder[currentPhaseIndex] === 'exhale') phaseText.textContent = '내쉬기 (입)';
            else if (currentOrder[currentPhaseIndex] === 'hold') phaseText.textContent = '숨 참기';
            else if (currentOrder[currentPhaseIndex] === 'inhale') phaseText.textContent = '들이마시기 (코)';
            
            timer = setInterval(tick, 1000);
        }
    }
});

backBtn.addEventListener('click', () => {
    resetTimerState();
    phaseText.textContent = '대기';
    timeLeftDisplay.textContent = '0';
    timerCircle.className = 'timer-display';
    switchScreen(timerScreen, setupScreen);
});