document.addEventListener('DOMContentLoaded', () => {
    // ---- 0. Onboarding & LocalStorage (초기 세팅) 로직 ----
    const onboardingView = document.getElementById('onboarding-view');
    const obNameInput = document.getElementById('ob-name');
    const obBudgetInput = document.getElementById('ob-budget');
    const obGoalInput = document.getElementById('ob-goal');
    const obStartBtn = document.getElementById('ob-start-btn');
    const obNameLabel = document.getElementById('ob-name-label');
    const modeRadios = document.querySelectorAll('input[name="usageMode"]');

    const homeGreeting = document.getElementById('home-greeting');
    const homeGoalText = document.getElementById('home-goal-text');
    const headerTitle = document.getElementById('header-title');

    // 내부 저장소에서 유저 정보 확인
    let userData = JSON.parse(localStorage.getItem('smartAccountUserData'));

    if (!userData) {
        // 첫 접속 시: 온보딩 화면 표시 유지
        onboardingView.classList.remove('hidden');
    } else {
        // 기존 재접속 시: 온보딩 화면 숨김 및 데이터 바로 바인딩
        onboardingView.classList.add('hidden');
        applyUserData(userData);
    }
    
    // 온보딩 사용 모드 변경 시 이름 입력 라벨과 힌트 변경
    modeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (e.target.value === 'shared') {
                obNameLabel.innerText = "가족/모임 이름 (별명)";
                obNameInput.placeholder = "예: 우리집, 신혼부부";
            } else {
                obNameLabel.innerText = "사용자 이름 (별명)";
                obNameInput.placeholder = "예: 최고기획자, 자산왕";
            }
        });
    });

    obStartBtn.addEventListener('click', () => {
        const usageMode = document.querySelector('input[name="usageMode"]:checked').value;
        const name = obNameInput.value.trim() || '아무개';
        const budget = Number(obBudgetInput.value) || 1000000;
        const goal = obGoalInput.value.trim() || '오늘도 계획적인 하루를 보내볼까요?';

        userData = { usageMode, name, budget, goal };
        localStorage.setItem('smartAccountUserData', JSON.stringify(userData));
        
        onboardingView.classList.add('hidden');
        applyUserData(userData);
        
        // 홈 화면 업데이트를 위해 차트 재계산 트리거
        updateBudgetChartBase(budget);
    });

    function applyUserData(data) {
        const mode = data.usageMode || 'single';
        if (mode === 'shared') {
            homeGreeting.innerHTML = `우리가족 <strong>${data.name}</strong> 가계부 👨‍👩‍👧`;
            headerTitle.innerText = `${data.name} 가계부 😌`;
        } else {
            homeGreeting.innerHTML = `안녕하세요, <strong>${data.name}</strong>님! 🌟`;
            headerTitle.innerText = `${data.name}의 가계부 😌`;
        }
        
        homeGoalText.innerText = data.goal;
        
        // 설정 탭 입력창에도 기존 예산 반영
        const budgetInput = document.getElementById('budget-setting-input');
        if(budgetInput) budgetInput.value = data.budget;
    }

    // 초기 예산 베이스 설정을 위한 함수 (홈 화면 진입 시)
    function updateBudgetChartBase(totalBudget) {
        // 더미 사용액(55만원) 기준 백분율 계산 연출
        const spent = 550000;
        const remaining = Math.max(0, totalBudget - spent);
        const percentage = ((remaining / totalBudget) * 100).toFixed(1);
        
        document.querySelector('.chart-summary').innerHTML = `이달의 남은 예산<br><strong id="spent-amount">${remaining.toLocaleString()}원</strong>`;
        if (budgetChart) {
            budgetChart.updateSeries([parseFloat(percentage)]);
        }
    }


    // ---- 1. Live Search (실시간 검색) 로직 ----
    const searchInput = document.getElementById('live-search-input');
    const clearSearchBtn = document.getElementById('clear-search-btn');

    if (searchInput && clearSearchBtn) {
        // 검색어 입력 이벤트
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim().toLowerCase();
            
            // 검색어 유무에 따른 X 버튼토글
            if (query.length > 0) clearSearchBtn.classList.remove('hidden');
            else clearSearchBtn.classList.add('hidden');

            filterListItems(query);
        });

        // X 버튼 클릭 이벤트 (초기화)
        clearSearchBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearSearchBtn.classList.add('hidden');
            filterListItems(''); // 전체 보기로 복구
            searchInput.focus();
        });
    }

    // 아이템 필터 엔진
    function filterListItems(query) {
        // 1. 홈 화면의 최근 내역(다이어리 템플릿 항목) 필터링
        const diaryItems = document.querySelectorAll('#diary-list .diary-item');
        diaryItems.forEach(item => {
            const textContent = item.innerText.toLowerCase();
            if (textContent.includes(query)) {
                item.style.display = 'flex'; // 기존 레이아웃 유지
            } else {
                item.style.display = 'none';
            }
        });

        // 2. 통계 화면의 카테고리(상세내역 아코디언) 그룹 필터링
        const analyticsListArea = document.querySelector('.analytics-list');
        if (analyticsListArea) {
            const wrappers = analyticsListArea.querySelectorAll('.analytics-item-wrapper');
            wrappers.forEach(wrapper => {
                const textContent = wrapper.innerText.toLowerCase();
                if (textContent.includes(query)) {
                    wrapper.style.display = 'block';
                    // 검색어가 2글자 이상 포함되어 있으면 아고디언 자동 확장 (UX 향상)
                    if (query.length > 1) wrapper.classList.add('expanded');
                } else {
                    wrapper.style.display = 'none';
                    wrapper.classList.remove('expanded');
                }
            });
        }
    }


    // ---- 2. Navigation Logic (탭 전환) ----
    const navItems = document.querySelectorAll('.nav-item');
    const views = document.querySelectorAll('.view');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(nav => nav.classList.remove('active'));
            views.forEach(view => view.classList.remove('active-view'));

            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active-view');
        });
    });

    // ---- 2. Chart Implementation (ApexCharts) ----
    // 뉴모피즘 디자인과 어울리는 둥근 게이지 바(Radial Bar) 형식
    const chartOptions = {
        series: [72.5], // 설정 예산(2,000,000) 대비 남은 금액(1,450,000) 퍼센트
        chart: {
            height: 280,
            type: 'radialBar',
            fontFamily: 'Inter, sans-serif',
            animations: {
                enabled: true,
                easing: 'easeinout',
                speed: 800,
                animateGradually: { enabled: true, delay: 150 },
                dynamicAnimation: { enabled: true, speed: 350 }
            }
        },
        plotOptions: {
            radialBar: {
                startAngle: -135,
                endAngle: 135,
                hollow: { margin: 15, size: '65%', background: 'transparent' },
                track: {
                    background: '#E0E5EC',
                    dropShadow: { enabled: true, top: 4, left: 4, blur: 8, opacity: 0.6, color: '#a3b1c6' }
                },
                dataLabels: {
                    show: true,
                    name: { offsetY: -10, show: true, color: '#9DA4B4', fontSize: '13px' },
                    value: {
                        offsetY: 5, color: '#4A4E69', fontSize: '24px', show: true, fontWeight: 700,
                        formatter: function (val) { return val + "%"; }
                    }
                }
            }
        },
        fill: {
            type: 'gradient',
            gradient: {
                shade: 'dark', type: 'horizontal', shadeIntensity: 0.5,
                gradientToColors: ['#FFB7B2'], inverseColors: true, opacityFrom: 1, opacityTo: 1, stops: [0, 100]
            }
        },
        stroke: { lineCap: 'round' },
        colors: ['#9BA4B5'],
        labels: ['남은 예산'],
    };

    const budgetChart = new ApexCharts(document.querySelector("#budgetChart"), chartOptions);
    budgetChart.render();

    // ---- 3. Modal & FAB & Tabs Logic (플로팅 버튼 및 모달 탭) ----
    const fabBtn = document.getElementById('fab-btn');
    const modal = document.getElementById('entry-modal');
    const closeModal = document.getElementById('close-modal');
    const saveBtn = document.getElementById('save-btn');
    const ocrBtn = document.getElementById('ocr-btn');
    const avatar = document.getElementById('pet-avatar');

    // 모달 내부 탭 전환
    const modalTabs = document.querySelectorAll('.modal-tab');
    const modalFormAreas = document.querySelectorAll('.modal-form-area');

    modalTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            modalTabs.forEach(t => t.classList.remove('active'));
            modalFormAreas.forEach(area => area.classList.remove('active-area'));
            
            tab.classList.add('active');
            const targetId = tab.getAttribute('data-tab');
            document.getElementById(targetId).classList.add('active-area');
        });
    });

    // 이모지 선택 로직
    const emojiItems = document.querySelectorAll('.emoji-item');
    let selectedEmoji = '😊';

    emojiItems.forEach(item => {
        item.addEventListener('click', () => {
            emojiItems.forEach(e => e.classList.remove('active'));
            item.classList.add('active');
            selectedEmoji = item.getAttribute('data-emoji');
        });
    });

    // 앱 로드 시 게이미피케이션 프로그레스 바 애니메이션 적용
    setTimeout(() => {
        document.querySelector('.progress-fill').style.width = '65%';
    }, 500);

    fabBtn.addEventListener('click', () => {
        modal.classList.add('open');
    });

    closeModal.addEventListener('click', () => {
        modal.classList.remove('open');
    });

    // ---- 4. 실제 영수증 AI 자동 스캔 (Tesseract.js OCR) ----
    const ocrUploadBtn = document.getElementById('ocr-upload');
    
    // 버튼 클릭 시 숨겨진 input file 트리거
    ocrBtn.addEventListener('click', () => {
        ocrUploadBtn.click();
    });

    ocrUploadBtn.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        ocrBtn.classList.add('scanning');
        ocrBtn.innerHTML = '<i class="ph ph-spinner-gap ph-spin"></i><span>영수증 AI 분석 중... (최대 10초 대기)</span>';
        
        try {
            // Tesseract.js 한국어/영어 혼합 인식 실행
            const result = await Tesseract.recognize(
                file,
                'kor+eng',
                { logger: m => console.log(m) } // 콘솔에 진행상황 표시
            );
            
            const text = result.data.text;
            console.log("OCR Result:\n", text);

            // 1. 결제 금액 파싱 (가장 큰 숫자 또는 '합계', '승인금액' 주변 원/숫자 탐색 정규식)
            // 우선 가장 간단히 ,가 포함된 숫자 뭉치 중 1000 이상인 가장 큰 값을 금액으로 추정
            const numberRegex = /[0-9]{1,3}(,[0-9]{3})+/g;
            const matches = text.match(numberRegex);
            let estimatedAmount = 0;
            if(matches) {
                const numbers = matches.map(n => Number(n.replace(/,/g, '')));
                estimatedAmount = Math.max(...numbers);
            }

            // 2. 상호명 (맨 첫 줄 또는 대표 텍스트) 추정
            const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 1);
            let estimatedTitle = "인식된 상호명 없음 (직접 입력)";
            if(lines.length > 0) {
                // 보통 영수증 최상단에 상호명이 옴
                estimatedTitle = lines[0]; 
            }

            // 뷰에 반영
            if(estimatedAmount > 0) document.getElementById('amount-input').value = estimatedAmount;
            document.getElementById('title-input').value = estimatedTitle.substring(0, 15); // 너무 길면 자름
            document.getElementById('expense-memo-input').value = 'AI 카메라 스캔 완료 📸';

            ocrBtn.innerHTML = '<i class="ph ph-check-circle" style="color:var(--success)"></i><span>스캔 성공!</span>';
        } catch (err) {
            console.error("OCR Error:", err);
            alert("영수증을 읽는 중 오류가 발생했습니다. 글씨가 잘 보이게 다시 찍어주세요.");
            ocrBtn.innerHTML = '<i class="ph ph-warning-circle" style="color:#e63946"></i><span>인식 실패</span>';
        } finally {
            ocrBtn.classList.remove('scanning');
            // 3초 뒤 기본 버튼으로 복귀
            setTimeout(() => {
                ocrBtn.innerHTML = '<i class="ph ph-camera"></i><span>영수증 촬영 자동 스캔</span>';
            }, 3000);
            
            // value 초기화 (같은 파일 다시 올릴 때 대비)
            ocrUploadBtn.value = '';
        }
    });

    // ---- 5. Save & Update UI (지출/일기 저장 및 상태 업데이트) ----
    saveBtn.addEventListener('click', () => {
        const isExpense = document.getElementById('tab-expense').classList.contains('active-area');

        if (isExpense) {
            const amount = document.getElementById('amount-input').value;
            const title = document.getElementById('title-input').value;
            const category = document.getElementById('category-input').value;
            const memo = document.getElementById('expense-memo-input').value;
            
            if(!amount || !title) {
                alert('금액과 사용처를 입력해주세요.');
                return;
            }

            // 1. 다이어리(일기) 뷰에 지출 내역 추가
            addDiaryItem(title, amount, category, memo, getCategoryIcon(category));

            // 2. 홈 대시보드 차트 퍼센트 차감
            // 임시 연출용 로직 (약 0.22% 차감)
            const currentPercentage = chartOptions.series[0];
            const newPercentage = Math.max(0, (currentPercentage - 0.22).toFixed(1)); 
            budgetChart.updateSeries([newPercentage]);
            
            // 남은 금액 텍스트 동기화
            const currentAmt = Number(document.getElementById('spent-amount').innerText.replace(/[^0-9]/g, ''));
            const remainstAmt = currentAmt - Number(amount);
            document.getElementById('spent-amount').innerText = remainstAmt.toLocaleString() + '원';

            // 3. 아바타 모션 이펙트 (게이미피케이션)
            avatar.style.transform = 'scale(1.2) rotate(10deg)';
            setTimeout(() => {
                avatar.style.transform = 'scale(1) rotate(0)';
                avatar.src = "https://api.dicebear.com/7.x/bottts/svg?seed=Spender&backgroundColor=FFB7B2";
            }, 300);

            // 폼 초기화
            document.getElementById('amount-input').value = '';
            document.getElementById('title-input').value = '';
            document.getElementById('expense-memo-input').value = '';

        } else {
            // 일기 모드 저장
            let date = document.getElementById('journal-date-input').value;
            if (!date) {
                const today = new Date();
                date = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
            }
            const memo = document.getElementById('journal-memo-input').value;
            
            if (!memo) {
                alert('일기 내용을 입력해주세요.');
                return;
            }
            
            addJournalItem(date, selectedEmoji, memo);
            
            document.getElementById('journal-memo-input').value = '';
        }

        // 모달 닫기 및 다이어리 뷰로 즉시 이동
        modal.classList.remove('open');
        navItems[2].click(); // 일기 탭 인덱스 2
    });

    // 더미 초기 다이어리 데이터
    const dummyData = [
        { title: '제주도 항공권 예약', amount: '250,000', category: '여행/여가', memo: '드디어 여름 휴가! 🏖️ 숙박만 남았다.', icon: 'ph-airplane' },
        { title: '이마트 장보기', amount: '84,500', category: '마트/장보기', memo: '주말 저녁용 삼겹살과 신선한 야채들 🥦', icon: 'ph-shopping-cart' }
    ];

    const diaryList = document.getElementById('diary-list');
    
    function addDiaryItem(title, amount, category, memo, icon='ph-receipt') {
        const div = document.createElement('div');
        div.className = 'diary-item';
        div.dataset.amount = amount; // 스토리지 삭제 시 차트 복구를 위한 데이터
        div.innerHTML = `
            <div class="diary-icon"><i class="ph ${icon}"></i></div>
            <div class="diary-content" style="display:flex; justify-content:space-between; width:100%;">
                <div style="flex:1;">
                    <div class="diary-header" style="margin-bottom:0px;">
                        <h4>${title}</h4>
                    </div>
                    <div class="diary-meta">${category} • 방금 전 <span class="diary-amount" style="margin-left:8px;">-${Number(amount).toLocaleString()}원</span></div>
                    ${memo ? `<div class="diary-memo" style="margin-top:6px;">${memo}</div>` : ''}
                </div>
                <!-- 점 3개 옵션 (수정/삭제) 메뉴 버튼 -->
                <div style="position:relative;">
                    <button class="kebab-btn"><i class="ph ph-dots-three-outline-vertical"></i></button>
                    <div class="diary-actions-menu">
                        <button class="action-btn delete-btn"><i class="ph ph-trash"></i> 삭제</button>
                    </div>
                </div>
            </div>
        `;
        
        bindKebabMenuEvents(div);
        diaryList.prepend(div);
    }

    function addJournalItem(date, emoji, memo) {
        const div = document.createElement('div');
        div.className = 'diary-item journal-type';
        div.dataset.amount = 0; // 일기는 예산 차감/복구에 영향 없음
        div.innerHTML = `
            <div class="diary-content" style="display:flex; justify-content:space-between; width:100%;">
                <div style="flex:1;">
                    <div class="journal-header" style="margin-bottom:4px;">
                        <span class="journal-emoji">${emoji}</span>
                        <div>
                            <h4>하루의 일상 기록</h4>
                            <div class="diary-meta">${date}</div>
                        </div>
                    </div>
                    <div class="diary-memo">${memo}</div>
                </div>
                <!-- 일기용 케밥 메뉴 -->
                <div style="position:relative;">
                    <button class="kebab-btn"><i class="ph ph-dots-three-outline-vertical"></i></button>
                    <div class="diary-actions-menu">
                        <button class="action-btn delete-btn"><i class="ph ph-trash"></i> 삭제</button>
                    </div>
                </div>
            </div>
        `;
        
        bindKebabMenuEvents(div);
        diaryList.prepend(div);
    }
    
    // 점 3개 누르면 메뉴 열리기 & 타겟 삭제 로직 바인딩
    function bindKebabMenuEvents(itemDiv) {
        const kebabBtn = itemDiv.querySelector('.kebab-btn');
        const actionMenu = itemDiv.querySelector('.diary-actions-menu');
        const deleteBtn = itemDiv.querySelector('.delete-btn');
        
        // 1. 메뉴 토글
        kebabBtn.addEventListener('click', (e) => {
            e.stopPropagation(); // 중복 클릭 이벤트 방지
            const isShowing = actionMenu.classList.contains('show');
            // 다른 열려있는 모든 메뉴 닫기
            document.querySelectorAll('.diary-actions-menu').forEach(m => m.classList.remove('show'));
            if (!isShowing) actionMenu.classList.add('show');
        });

        // 2. 삭제 엑션 버튼 클릭 시
        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if(!confirm("이 기록을 삭제하시겠습니까?")) return;
            
            const amountToRestore = Number(itemDiv.dataset.amount) || 0;
            
            if(amountToRestore > 0) {
                // 상단 홈 예산 숫자 복구(차감액 되돌리기)
                const currentAmtStr = document.getElementById('spent-amount').innerText.replace(/[^0-9]/g, '');
                const currentAmtNum = Number(currentAmtStr);
                const restoredAmt = currentAmtNum + amountToRestore; // 다시 예산 잔액이 늘어남
                
                document.getElementById('spent-amount').innerText = restoredAmt.toLocaleString() + '원';
                
                // 도넛 차트 퍼센티지 복구(시뮬레이션: 잔액이 늘어나므로 퍼센트 상승 효과)
                const currentPercentage = chartOptions.series[0];
                const newPercentage = Math.min(100, (currentPercentage + 0.22).toFixed(1)); 
                budgetChart.updateSeries([newPercentage]);
            }
            
            // 화면에서 요소 물리적 제거
            itemDiv.style.opacity = '0';
            setTimeout(() => { itemDiv.remove(); }, 300);
        });
    }

    // 바깥 여백 누르면 열려있는 메뉴 닫기
    document.addEventListener('click', () => {
        document.querySelectorAll('.diary-actions-menu').forEach(m => m.classList.remove('show'));
    });

    // 카테고리별 아이콘 매퍼
    function getCategoryIcon(cat) {
        if(cat.includes('식비') || cat.includes('카페')) return 'ph-coffee';
        if(cat.includes('교통')) return 'ph-car';
        if(cat.includes('여가') || cat.includes('문화')) return 'ph-film-strip';
        if(cat.includes('마트')) return 'ph-shopping-cart';
        if(cat.includes('육아') || cat.includes('가족')) return 'ph-baby';
        return 'ph-receipt';
    }

    // 초기 더미데이터 렌더링
    dummyData.forEach(item => {
        addDiaryItem(item.title, item.amount, item.category, item.memo, item.icon);
    });

    // 샘플 일기 데이터
    addJournalItem('2026-03-17', '🥰', '드디어 고대하던 제주도 비행기 표를 예매했다. 가족여행 준비로 설레는 하루!');

    // ---- 6. Analytics (통계 화면) 로직 통합 ----
    const categoryChartOptions = {
        series: [35, 25, 20, 15, 5],
        chart: {
            type: 'donut',
            height: 250,
            fontFamily: 'Inter, sans-serif',
            animations: { enabled: true, easing: 'easeinout', speed: 800 }
        },
        labels: ['식비/카페', '마트/장보기', '교통/차량', '문화/여가', '육아/가족'],
        colors: ['#FFB7B2', '#B5EAD7', '#9BA4B5', '#E2F0CB', '#C7CEEA'],
        plotOptions: {
            pie: {
                donut: {
                    size: '70%',
                    labels: {
                        show: true,
                        name: { show: true, fontSize: '12px', color: '#9DA4B4' },
                        value: { show: true, fontSize: '20px', fontWeight: 700, color: '#4A4E69', formatter: val => val + "%" }
                    }
                }
            }
        },
        dataLabels: { enabled: false },
        stroke: { show: true, colors: '#E0E5EC', width: 3 },
        legend: { show: false }
    };

    const categoryChart = new ApexCharts(document.querySelector("#categoryChart"), categoryChartOptions);
    categoryChart.render();

    // 6.1 날짜 নে비게이터 및 5단계 필터 스위칭 로직
    const periodLabel = document.getElementById('current-period-label');
    const periodRadios = document.querySelectorAll('input[name="period"]');
    
    // 모의 기준 데이터 (현재)
    let currentPeriodType = 'month'; // day, week, month, quarter, year
    
    // 선택된 탭에 따라 상단 텍스트를 모의 변경하는 함수
    function updatePeriodLabelText(type) {
        if(type === 'day') periodLabel.innerText = '2026년 3월 18일';
        else if(type === 'week') periodLabel.innerText = '2026년 3월 3주차';
        else if(type === 'month') periodLabel.innerText = '2026년 3월';
        else if(type === 'quarter') periodLabel.innerText = '2026년 1분기';
        else if(type === 'year') periodLabel.innerText = '2026년';
    }

    periodRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentPeriodType = e.target.value;
            updatePeriodLabelText(currentPeriodType);
            
            // 모의 데이터 차트 갱신
            let newSeries;
            if (currentPeriodType === 'day') newSeries = [60, 0, 40, 0, 0];
            else if (currentPeriodType === 'week') newSeries = [40, 20, 15, 15, 10];
            else if (currentPeriodType === 'month') newSeries = [35, 25, 20, 15, 5];
            else if (currentPeriodType === 'quarter') newSeries = [30, 30, 20, 10, 10];
            else newSeries = [25, 30, 20, 15, 10]; // year
            
            categoryChart.updateSeries(newSeries);
            renderAnalyticsList(newSeries, currentPeriodType);
        });
    });
    
    // 화살표 클릭 시 모션 효과 (실제 날짜 증감 로직은 모의로 텍스트 깜빡임만 구현)
    document.getElementById('prev-period-btn').addEventListener('click', () => { animPeriodLabel(); });
    document.getElementById('next-period-btn').addEventListener('click', () => { animPeriodLabel(); });
    
    function animPeriodLabel() {
        periodLabel.style.opacity = 0;
        setTimeout(() => { periodLabel.style.opacity = 1; }, 200);
    }

    // 6.2 카테고리 상세 내역 렌더링 (아코디언 UI)
    const analyticsListArea = document.getElementById('analytics-list');
    
    // 카테고리별 상세 더미 데이터 생성기
    function getDummyDetailsForCategory(catName, ratio, baseMultiplier) {
        const details = [];
        const itemsCount = Math.max(1, Math.floor(ratio / 10)); // 비율에 따라 1~5개 생성
        
        let shops = [];
        if(catName.includes('식비')) shops = ['스타벅스', '김밥천국', '배달의민족', '맥도날드', '동네카페'];
        else if(catName.includes('마트')) shops = ['이마트', '홈플러스', '마켓컬리', 'GS25', 'CU'];
        else if(catName.includes('교통')) shops = ['카카오T', '주유소', '지하철', '고속버스', '쏘카'];
        else if(catName.includes('문화')) shops = ['CGV', '넷플릭스', '교보문고', '올리브영', '멜론'];
        else shops = ['아기용품점', '키즈카페', '소아과', '장난감가게', '쿠팡'];
        
        for(let i=0; i<itemsCount; i++){
            const day = Math.floor(Math.random() * 28) + 1;
            const amt = Math.floor(Math.random() * (baseMultiplier/itemsCount) * 1.5) + 3000;
            const shop = shops[Math.floor(Math.random() * shops.length)];
            details.push({ date: `3월 ${day}일`, shop: shop, amount: amt });
        }
        return details.sort((a,b) => parseInt(b.date.replace(/[^0-9]/g,'')) - parseInt(a.date.replace(/[^0-9]/g,''))); // 최신순 정렬
    }

    function renderAnalyticsList(series, periodType) {
        const labels = categoryChartOptions.labels;
        const icons = ['ph-coffee', 'ph-shopping-cart', 'ph-car', 'ph-film-strip', 'ph-baby'];
        const colors = categoryChartOptions.colors;
        
        let baseMultiplier = 16000;
        if(periodType === 'quarter') baseMultiplier = 55000;
        if(periodType === 'year') baseMultiplier = 200000;
        
        analyticsListArea.innerHTML = '';
        
        series.forEach((val, idx) => {
            if(val === 0) return;
            const mockAmount = Math.floor((val * baseMultiplier)/1000)*1000; 
            const catName = labels[idx];
            
            // 상세 내역 배열 생성
            const details = getDummyDetailsForCategory(catName, val, mockAmount);
            let detailsHTML = '';
            details.forEach(d => {
                detailsHTML += `
                <div class="detail-item">
                    <div class="detail-shop"><i class="ph ${icons[idx]}" style="color:${colors[idx]}"></i><span>${d.shop}</span></div>
                    <div>
                        <span class="detail-date" style="margin-right:8px;">${d.date}</span>
                        <span class="detail-amt">${d.amount.toLocaleString()}원</span>
                    </div>
                </div>`;
            });

            // 아코디언 래퍼 구성
            const wrapper = document.createElement('div');
            wrapper.className = 'analytics-item-wrapper';
            wrapper.innerHTML = `
                <div class="analytics-item">
                    <div class="al-cat"><i class="ph ${icons[idx]}" style="color:${colors[idx]}"></i><span>${catName}</span></div>
                    <div class="al-amt">${mockAmount.toLocaleString()}원 <span style="font-size:11px; color:var(--text-light); margin-left: 4px;">(${val}%)</span> <i class="ph ph-caret-down al-chevron" style="margin-left:4px;"></i></div>
                </div>
                <div class="analytics-detail-container">
                    <div class="analytics-details neu-inset">
                        ${detailsHTML}
                    </div>
                </div>
            `;
            
            // 토글 이벤트 바인딩
            const header = wrapper.querySelector('.analytics-item');
            header.addEventListener('click', () => {
                const isExpanded = wrapper.classList.contains('expanded');
                // 기존 열린 것 닫기(선택)
                // document.querySelectorAll('.analytics-item-wrapper').forEach(w => w.classList.remove('expanded'));
                
                if(!isExpanded) wrapper.classList.add('expanded');
                else wrapper.classList.remove('expanded');
            });
            
            analyticsListArea.appendChild(wrapper);
        });
    }

    // 초기 렌더링 (월별 기준)
    renderAnalyticsList(categoryChartOptions.series, currentPeriodType);

    // ---- 7. Settings (예산 설정) 로직 ----
    const saveBudgetBtn = document.getElementById('save-budget-btn');
    const budgetInput = document.getElementById('budget-setting-input');

    saveBudgetBtn.addEventListener('click', () => {
        const newBudget = Number(budgetInput.value);
        if (!newBudget || newBudget <= 0) {
            alert('올바른 예산 금액을 입력하세요.');
            return;
        }
        
        // 임시 사용 금액(55만원) 기준으로 차트 재계산 연출
        const spentAmount = 550000;
        const remaining = Math.max(0, newBudget - spentAmount);
        const percentage = ((remaining / newBudget) * 100).toFixed(1);
        
        budgetChart.updateSeries([parseFloat(percentage)]);
        document.querySelector('.chart-summary').innerHTML = `설정된 예산 ${newBudget.toLocaleString()}원 중<br><strong id="spent-amount">${remaining.toLocaleString()}원</strong> 남았습니다.`;
        
        alert(`예산이 ${newBudget.toLocaleString()}원으로 성공적으로 저장되었습니다! 홈 탭에서 확인해보세요.`);
        navItems[0].click(); // 홈으로 이동
    });

    // ---- 8. 모든 데이터 물리적 초기화 및 앱 리셋 ----
    const resetAllBtn = document.getElementById('reset-all-btn');
    if(resetAllBtn) {
        resetAllBtn.addEventListener('click', () => {
            const isConfirm = confirm("경고: 기기에 저장된 모든 예산, 이름, 가계부 및 일기 내역이 영구적으로 파기됩니다. 정말 초기화하시겠습니까?");
            if (isConfirm) {
                // LocalStorage 핵심값 파기
                localStorage.removeItem('smartAccountUserData');
                // 만약 추후 내역 배열을 로컬스토리지에 저장하는 코드가 있다면 아래에서 지우면 됩니다.
                // localStorage.removeItem('smartAccountRecords');

                alert("데이터가 깨끗하게 초기화되었습니다. 처음(온보딩) 페이지로 돌아갑니다.");
                
                // 강제 새로고침(F5)하여 처음부터 다시 접속한 것과 같은 상태 유발
                window.location.reload();
            }
        });
    }
});
