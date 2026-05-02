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
const stopBtn = document.getElementById('stop-btn');
const backBtn = document.getElementById('back-btn');

// --- 드래그 앤 드롭 초기화 (SortableJS) ---
const phaseList = document.getElementById('phase-list');
new Sortable(phaseList, {
    handle: '.drag-handle', // ≡ 손잡이를 잡았을 때만 드래그
    animation: 150, // 부드럽게 위치가 바뀌는 애니메이션 시간
    ghostClass: 'sortable-ghost'
});
// ----------------------------------------

// 변수 설정
let timer;
let countdownTimerInterval;
let timeLeft = 0;

let currentRep = 1;
let currentSet = 1;
let isRunning = false;

// 순서를 담을 배열
let currentOrder = []; 
let currentPhaseIndex = 0; 

// 🔊 알림음 생성 함수
function playBeep(frequency, type = 'sine', duration = 0.3) {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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

// 화면 텍스트 업데이트
function updateUI() {
    timeLeftDisplay.textContent = timeLeft;
    currentRepDisplay.textContent = currentRep;
    currentSetDisplay.textContent = currentSet;
    totalRepsDisplay.textContent = repsInput.value;
    totalSetsDisplay.textContent = setsInput.value;
}

// 다음 호흡 단계로 전환
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

// 사용자가 설정한 순서대로 진행하는 로직
function nextStep() {
    currentPhaseIndex++; // 다음 순서로 이동
    
    // 1. 현재 순서 배열 안에 다음 호흡이 남아있는지 확인
    if (currentPhaseIndex < currentOrder.length) {
        switchPhase(currentOrder[currentPhaseIndex]);
    } else {
        // 배열을 다 돌았다면 = 호흡 1회 완료
        if (currentRep < parseInt(repsInput.value)) {
            currentRep++;
            currentPhaseIndex = 0; // 다시 첫 번째 호흡으로
            switchPhase(currentOrder[currentPhaseIndex]);
        } else {
            // 1세트 완료
            if (currentSet < parseInt(setsInput.value)) {
                currentSet++;
                currentRep = 1;
                currentPhaseIndex = 0;
                playBeep(880, 'triangle', 0.5); 
                switchPhase(currentOrder[currentPhaseIndex]); 
            } else {
                // 모든 세트 완료
                stopTimer();
                phaseText.textContent = '완료!';
                timerCircle.className = 'timer-display'; 
                playBeep(1046.5, 'square', 0.6); 
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

// --- 사용자가 드래그한 현재 순서를 읽어오는 함수 ---
function fetchCurrentOrder() {
    const items = document.querySelectorAll('#phase-list .draggable-item');
    currentOrder = Array.from(items).map(item => item.dataset.phase);
}

function startCountdown() {
    if (isRunning) return;
    isRunning = true; 
    
    // 시작하기 직전에 현재 HTML에 배치된 순서를 저장합니다.
    fetchCurrentOrder();
    
    let count = 3;
    
    phaseText.textContent = '준비';
    timeLeftDisplay.textContent = count;
    currentRepDisplay.textContent = '1';
    currentSetDisplay.textContent = '1';
    totalRepsDisplay.textContent = repsInput.value;
    totalSetsDisplay.textContent = setsInput.value;
    timerCircle.className = 'timer-display'; 
    
    playBeep(600, 'sine', 0.15);

    countdownTimerInterval = setInterval(() => {
        count--;
        if (count > 0) {
            timeLeftDisplay.textContent = count;
            playBeep(600, 'sine', 0.15); 
        } else {
            clearInterval(countdownTimerInterval);
            isRunning = false; 
            startTimer(); 
        }
    }, 1000);
}

function startTimer() {
    if (isRunning) return;
    currentRep = 1;
    currentSet = 1;
    currentPhaseIndex = 0; // 시작 시 배열의 첫 번째 인덱스부터
    isRunning = true;
    
    updateUI();
    // 사용자가 정한 첫 번째 순서의 호흡을 실행합니다.
    switchPhase(currentOrder[currentPhaseIndex]); 
    timer = setInterval(tick, 1000);
}

function stopTimer() {
    clearInterval(timer);
    clearInterval(countdownTimerInterval); 
    isRunning = false;
    
    phaseText.textContent = '대기';
    timeLeftDisplay.textContent = '0';
    timerCircle.className = 'timer-display';
}

goToTimerBtn.addEventListener('click', () => {
    switchScreen(setupScreen, timerScreen);
    setTimeout(() => {
        startCountdown();
    }, 500);
});

stopBtn.addEventListener('click', () => {
    stopTimer();
    phaseText.textContent = '정지됨';
});

backBtn.addEventListener('click', () => {
    stopTimer();
    switchScreen(timerScreen, setupScreen);
});