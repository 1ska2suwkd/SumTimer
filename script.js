// 입력 값 요소
const exhaleInput = document.getElementById('exhale-time');
const holdInput = document.getElementById('hold-time');
const inhaleInput = document.getElementById('inhale-time');
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

// 변수 설정
let timer;
let countdownTimerInterval; // 3,2,1 카운트다운용 변수
let timeLeft = 0;
let currentPhase = ''; // 'exhale', 'hold', 'inhale'
let currentRep = 1;
let currentSet = 1;
let isRunning = false;

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
function switchPhase(newPhase) {
    currentPhase = newPhase;
    timerCircle.className = 'timer-display ' + newPhase + '-phase';

    if (newPhase === 'exhale') {
        phaseText.textContent = '내쉬기 (입)';
        timeLeft = parseInt(exhaleInput.value);
        playBeep(440); // 기본 음
    } else if (newPhase === 'hold') {
        phaseText.textContent = '숨 참기';
        timeLeft = parseInt(holdInput.value);
        playBeep(330); // 낮은 음
    } else if (newPhase === 'inhale') {
        phaseText.textContent = '들이마시기 (코)';
        timeLeft = parseInt(inhaleInput.value);
        playBeep(523.25); // 높은 음
    }
    updateUI();
}

// 호흡 사이클 및 세트 계산 로직
function nextStep() {
    if (currentPhase === 'exhale') {
        switchPhase('hold');
    } else if (currentPhase === 'hold') {
        switchPhase('inhale');
    } else if (currentPhase === 'inhale') {
        if (currentRep < parseInt(repsInput.value)) {
            currentRep++;
            switchPhase('exhale');
        } else {
            if (currentSet < parseInt(setsInput.value)) {
                currentSet++;
                currentRep = 1;
                playBeep(880, 'triangle', 0.5); // 세트 완료 특수음 길게
                switchPhase('exhale'); 
            } else {
                stopTimer();
                phaseText.textContent = '완료!';
                timerCircle.className = 'timer-display'; 
                playBeep(1046.5, 'square', 0.6); // 종료 알림
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

// --- 화면 전환 로직 ---
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

// --- 3, 2, 1 카운트다운 시작 함수 ---
function startCountdown() {
    if (isRunning) return;
    isRunning = true; // 중복 실행 방지
    
    let count = 3;
    
    // 준비 화면 세팅
    phaseText.textContent = '준비';
    timeLeftDisplay.textContent = count;
    currentRepDisplay.textContent = '1';
    currentSetDisplay.textContent = '1';
    totalRepsDisplay.textContent = repsInput.value;
    totalSetsDisplay.textContent = setsInput.value;
    timerCircle.className = 'timer-display'; // 색상 없는 기본 상태
    
    // 첫 3초 알림음 (조금 짧고 경쾌한 소리)
    playBeep(600, 'sine', 0.15);

    countdownTimerInterval = setInterval(() => {
        count--;
        if (count > 0) {
            timeLeftDisplay.textContent = count;
            playBeep(600, 'sine', 0.15); // 2초, 1초 알림음
        } else {
            // 카운트다운 끝나면 본 타이머 시작
            clearInterval(countdownTimerInterval);
            isRunning = false; // startTimer에서 다시 true로 만들기 위해 초기화
            startTimer(); 
        }
    }, 1000);
}

// --- 본 타이머 시작 함수 ---
function startTimer() {
    if (isRunning) return;
    currentRep = 1;
    currentSet = 1;
    isRunning = true;
    
    updateUI();
    switchPhase('exhale'); 
    timer = setInterval(tick, 1000);
}

// --- 정지 및 초기화 함수 ---
function stopTimer() {
    clearInterval(timer);
    clearInterval(countdownTimerInterval); // 카운트다운 도중 정지할 경우 대비
    isRunning = false;
    
    phaseText.textContent = '대기';
    timeLeftDisplay.textContent = '0';
    timerCircle.className = 'timer-display';
}

// --- 버튼 이벤트 리스너 ---
goToTimerBtn.addEventListener('click', () => {
    switchScreen(setupScreen, timerScreen);
    // 화면 전환 후 0.5초 뒤에 3,2,1 카운트다운 시작
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