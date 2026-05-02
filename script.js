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

// 버튼
const startBtn = document.getElementById('start-btn');
const stopBtn = document.getElementById('stop-btn');

// 변수 설정
let timer;
let timeLeft = 0;
let currentPhase = ''; // 'exhale', 'hold', 'inhale'
let currentRep = 1;
let currentSet = 1;
let isRunning = false;

// 🔊 알림음 생성 함수 (Web Audio API)
function playBeep(frequency, type = 'sine') {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    
    // 소리가 부드럽게 끝나도록 설정
    gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.3);
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
    
    // 이전 배경색 클래스 제거 후 새 클래스 추가
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
        // 날숨 -> 정지 -> 들숨 1회 완료
        if (currentRep < parseInt(repsInput.value)) {
            currentRep++;
            switchPhase('exhale');
        } else {
            // 1세트 완료
            if (currentSet < parseInt(setsInput.value)) {
                currentSet++;
                currentRep = 1;
                playBeep(880, 'triangle'); // 세트 완료 특수음
                switchPhase('exhale'); 
            } else {
                // 모든 세트 완료
                stopTimer();
                phaseText.textContent = '완료!';
                timerCircle.className = 'timer-display'; // 색상 초기화
                playBeep(1046.5, 'square'); // 종료 알림
            }
        }
    }
}

// 1초마다 실행되는 함수
function tick() {
    if (timeLeft > 1) {
        timeLeft--;
        updateUI();
    } else {
        nextStep(); // 0초가 되면 다음 단계로
    }
}

// 시작 버튼
function startTimer() {
    if (isRunning) return;
    
    currentRep = 1;
    currentSet = 1;
    isRunning = true;
    
    startBtn.disabled = true;
    stopBtn.disabled = false;
    
    updateUI();
    switchPhase('exhale'); // 무조건 날숨부터 시작
    
    timer = setInterval(tick, 1000);
}

// 정지 버튼
function stopTimer() {
    clearInterval(timer);
    isRunning = false;
    startBtn.disabled = false;
    stopBtn.disabled = true;
    
    phaseText.textContent = '준비';
    timeLeftDisplay.textContent = '0';
    timerCircle.className = 'timer-display';
}

startBtn.addEventListener('click', startTimer);
stopBtn.addEventListener('click', stopTimer);