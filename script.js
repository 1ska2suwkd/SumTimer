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
const toggleBtn = document.getElementById('stop-btn'); // 정지/시작 토글 버튼으로 사용
const backBtn = document.getElementById('back-btn');

// --- 드래그 앤 드롭 초기화 (SortableJS) ---
const phaseList = document.getElementById('phase-list');
new Sortable(phaseList, {
    handle: '.drag-handle', 
    animation: 150, 
    ghostClass: 'sortable-ghost'
});

// --- 상태 관리 변수 ---
let timer;
let countdownTimerInterval;
let timeLeft = 0;

let currentRep = 1;
let currentSet = 1;

let isRunning = false;        // 타이머가 흘러가고 있는지 여부
let isPaused = false;         // 일시정지 상태인지 여부
let isCountdownPhase = false; // 3,2,1 준비 카운트다운 중인지 여부
let countdownValue = 3;

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

// 호흡 단계별 UI 변경
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

// 다음 단계로 넘어가기 (세트 및 반복 횟수 계산)
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
                finishTimer(); // 모든 세트 완료
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

// 화면 전환 함수
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

// 사용자가 설정한 호흡 순서 읽어오기
function fetchCurrentOrder() {
    const items = document.querySelectorAll('#phase-list .draggable-item');
    currentOrder = Array.from(items).map(item => item.dataset.phase);
}

// --- 타이머 제어 함수 ---

function startCountdown() {
    if (isRunning || isPaused) return; // 중복 실행 방지
    isRunning = true; 
    isPaused = false;
    isCountdownPhase = true;
    countdownValue = 3;
    
    fetchCurrentOrder();
    
    // 버튼 상태 초기화
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

// 카운트다운 진행
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

// 본 호흡 타이머 시작
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

// 상태 초기화 (내부용)
function resetTimerState() {
    clearInterval(timer);
    clearInterval(countdownTimerInterval); 
    isRunning = false;
    isPaused = false;
    isCountdownPhase = false;
    toggleBtn.textContent = '정지';
}

// 모든 세트가 완전히 끝났을 때
function finishTimer() {
    resetTimerState();
    toggleBtn.style.pointerEvents = 'none'; // 완료 후에는 버튼 비활성화
    toggleBtn.style.opacity = '0.5';
    phaseText.textContent = '완료!';
    timerCircle.className = 'timer-display'; 
    playBeep(1046.5, 'square', 0.6); 
}


// --- 이벤트 리스너 (버튼 클릭) ---

goToTimerBtn.addEventListener('click', () => {
    switchScreen(setupScreen, timerScreen);
    setTimeout(() => {
        startCountdown();
    }, 500);
});

// 정지 <-> 시작 토글 버튼 로직
toggleBtn.addEventListener('click', () => {
    if (isRunning) {
        // 1. 현재 실행 중일 때 -> 일시정지 처리
        clearInterval(timer);
        clearInterval(countdownTimerInterval);
        isRunning = false;
        isPaused = true;
        
        toggleBtn.textContent = '시작';
        phaseText.textContent = '일시정지';
    } 
    else if (isPaused) {
        // 2. 일시정지 상태일 때 -> 이어서 시작 처리
        isRunning = true;
        isPaused = false;
        
        toggleBtn.textContent = '정지';
        
        if (isCountdownPhase) {
            resumeCountdown(); // 3,2,1 카운트다운 도중에 멈췄었다면 카운트다운 이어서
        } else {
            // 본 호흡 도중에 멈췄었다면 텍스트 복구 후 타이머 이어서
            if (currentOrder[currentPhaseIndex] === 'exhale') phaseText.textContent = '내쉬기 (입)';
            else if (currentOrder[currentPhaseIndex] === 'hold') phaseText.textContent = '숨 참기';
            else if (currentOrder[currentPhaseIndex] === 'inhale') phaseText.textContent = '들이마시기 (코)';
            
            timer = setInterval(tick, 1000);
        }
    }
});

// 설정으로 돌아가기 버튼
backBtn.addEventListener('click', () => {
    resetTimerState();
    phaseText.textContent = '대기';
    timeLeftDisplay.textContent = '0';
    timerCircle.className = 'timer-display';
    switchScreen(timerScreen, setupScreen);
});