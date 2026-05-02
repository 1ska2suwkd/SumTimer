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

// --- 드래그 앤 드롭 초기화 (SortableJS) ---
const phaseList = document.getElementById('phase-list');
new Sortable(phaseList, {
    handle: '.drag-handle', 
    animation: 150, 
    ghostClass: 'sortable-ghost'
});

// --- 🚀 프리셋 데이터 및 로직 완벽 수정 ---
const presetData = {
    '478': {
        name: '4-7-8 호흡법',
        order: ['inhale', 'hold', 'exhale'], // 들숨 -> 정지 -> 날숨 순서
        times: {
            inhale: 4,
            hold: 7,
            exhale: 8
        }
    }
};

const presetBtn = document.getElementById('preset-btn');
const presetModal = document.getElementById('preset-modal');

// 모달창 열기
presetBtn.addEventListener('click', () => {
    presetModal.classList.add('active');
});

// 💡 이벤트 위임: 모달창 전체에 클릭 이벤트를 걸어서 오류 방지
presetModal.addEventListener('click', (e) => {
    
    // 1. 만약 클릭한 것이 프리셋 버튼이라면
    const btn = e.target.closest('.preset-item');
    if (btn) {
        const presetId = btn.dataset.preset;
        const preset = presetData[presetId];
        
        if (preset && confirm(`'${preset.name}' 프리셋을 적용하시겠습니까?`)) {
            // 시간 변경
            document.getElementById('inhale-time').value = preset.times.inhale;
            document.getElementById('hold-time').value = preset.times.hold;
            document.getElementById('exhale-time').value = preset.times.exhale;

            // 순서 강제 재배치 (DOM)
            preset.order.forEach(phaseKey => {
                const targetItem = phaseList.querySelector(`[data-phase="${phaseKey}"]`);
                if (targetItem) {
                    phaseList.appendChild(targetItem);
                }
            });

            // 모달창 닫기
            presetModal.classList.remove('active');
        }
        return; // 프리셋 적용 후 함수 종료
    }

    // 2. 만약 클릭한 것이 '닫기' 버튼이거나 검은 배경화면이라면 모달 닫기
    if (e.target.id === 'close-modal-btn' || e.target === presetModal) {
        presetModal.classList.remove('active');
    }
});
// ---------------------------------

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

// 설정으로 돌아가기 버튼
backBtn.addEventListener('click', () => {
    resetTimerState();
    phaseText.textContent = '대기';
    timeLeftDisplay.textContent = '0';
    timerCircle.className = 'timer-display';
    switchScreen(timerScreen, setupScreen);
});