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
    let appRecords = JSON.parse(localStorage.getItem('smartAccountRecords')) || [];

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
        
        // 홈 화면 업데이트를 위해 차트 재계산 트리거 (전역 동기화 엔진)
        syncAppRenders();
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

    // UTC 시차 문제를 해결하는 한국 시간 기준 ISO 날짜 구하기
    function getLocalISODate() {
        const tzoffset = (new Date()).getTimezoneOffset() * 60000;
        return (new Date(Date.now() - tzoffset)).toISOString().split('T')[0];
    }

    // 앱 내의 모든 데이터(다이어리 리스트, 상단 차트, 통계)를 로컬스토리지 기반으로 100% 실시간 렌더링하는 핵심 동기화 엔진
    function syncAppRenders() {
        const totalBudget = userData ? userData.budget : 1000000;
        
        // 1. 다이어리 리스트 렌더링 (홈 탭)
        const diaryList = document.getElementById('diary-list');
        if (diaryList) diaryList.innerHTML = '';
        const sortedRecords = [...appRecords].sort((a,b) => b.id - a.id);
        sortedRecords.forEach(r => {
            if(r.type === 'expense' || r.type === 'income') addDiaryItem(r.id, r.title, r.amount, r.category, r.memo, getCategoryIcon(r.category), r.date, r.type);
            else addJournalItem(r.id, r.date, r.emoji, r.memo);
        });

        // 2. 남은 예산 차트 렌더링을 위한 기간 필터 (UTC 버그 해결 KST 문자열 파싱 버전)
        let expenseRecords = appRecords.filter(r => r.type === 'expense');
        let incomeRecords = appRecords.filter(r => r.type === 'income');
        
        // 하단 통계의 기간 설정(월별, 일별 등)에 맞게 목록 필터링
        if (typeof currentPeriodType !== 'undefined' && currentPeriodType) {
            const todayStr = getLocalISODate();
            const currentYear = todayStr.substring(0,4);
            const currentMonth = todayStr.substring(5,7);
            
            const filterByPeriod = (r) => {
                if(!r.date) return true;
                const rYear = r.date.substring(0,4);
                const rMonth = r.date.substring(5,7);
                if (currentPeriodType === 'day') return r.date === todayStr;
                if (currentPeriodType === 'month') return rYear === currentYear && rMonth === currentMonth;
                if (currentPeriodType === 'quarter') return rYear === currentYear && Math.floor((parseInt(rMonth)-1)/3) === Math.floor((parseInt(currentMonth)-1)/3);
                if (currentPeriodType === 'year') return rYear === currentYear;
                return true; 
            };
            
            expenseRecords = expenseRecords.filter(filterByPeriod);
            incomeRecords = incomeRecords.filter(filterByPeriod);
        }

        const spent = expenseRecords.reduce((sum, r) => sum + r.amount, 0);
        const earned = incomeRecords.reduce((sum, r) => sum + r.amount, 0);
        
        // 수입만큼 전체 한도 증액
        const currentTotalBudget = totalBudget + earned; 
        const remaining = Math.max(0, currentTotalBudget - spent);
        const percentage = currentTotalBudget > 0 ? ((remaining / currentTotalBudget) * 100).toFixed(1) : 0;
        
        const chartSummary = document.querySelector('.chart-summary');
        if (chartSummary) chartSummary.innerHTML = `이달의 남은 예산<br><strong id="spent-amount">${remaining.toLocaleString()}원</strong>`;
        if (typeof budgetChart !== 'undefined' && budgetChart) budgetChart.updateSeries([parseFloat(percentage)]);

        // 3. 통계 대시보드 (듀얼 모드) 렌더링
        const catTotals = { '식비/카페':0, '마트/장보기':0, '교통/차량':0, '문화/여가':0, '육아/가족':0 };
        expenseRecords.forEach(r => {
            if(catTotals[r.category] !== undefined) catTotals[r.category] += r.amount;
        });
        const series = Object.values(catTotals);
        
        const hasAnyAmount = series.some(v => v > 0);
        if (typeof categoryChart !== 'undefined' && categoryChart) {
            categoryChart.updateSeries(hasAnyAmount ? series : [0,0,0,0,0]);
        }
        
        // 듀얼 모드 관점에 따른 통계 상단 요약 문구 분기 처리
        const analyticsSummary = document.getElementById('analytics-summary');
        let analyticsDenominator = totalBudget; // 기본 분모: 초기 설정 예산
        
        if (typeof currentAnalyticsMode !== 'undefined' && currentAnalyticsMode === 'income') {
             analyticsDenominator = earned; // 수입 모드 시 분모: 월 수입 총액
        }

        if (analyticsSummary) {
            if (currentAnalyticsMode === 'budget') {
                const usedPercent = totalBudget > 0 ? Math.round((spent/totalBudget)*100) : 0;
                analyticsSummary.innerHTML = `설정 예산 ${totalBudget.toLocaleString()}원 대비<br><strong>${spent.toLocaleString()}원 (${usedPercent}%)</strong> 사용`;
            } else {
                const surplus = earned - spent;
                const surplusHtml = surplus >= 0 ? `<span style="color:#4361ee">잔여 ${surplus.toLocaleString()}원</span>` : `<span style="color:#e63946">초과 ${Math.abs(surplus).toLocaleString()}원</span>`;
                analyticsSummary.innerHTML = `번 돈 ${earned.toLocaleString()}원 중<br><strong>${spent.toLocaleString()}원 사용 (${surplusHtml})</strong>`;
            }
        }
        
        if (typeof renderAnalyticsListReal === 'function') {
            renderAnalyticsListReal(catTotals, expenseRecords, analyticsDenominator);
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

    // ---- 5. Save & Update UI (지출/수입/일기 저장 및 상태 업데이트) ----
    saveBtn.addEventListener('click', () => {
        const isExpense = document.getElementById('tab-expense').classList.contains('active-area');
        const isIncome = document.getElementById('tab-income').classList.contains('active-area');

        if (isExpense || isIncome) {
            const type = isExpense ? 'expense' : 'income';
            const amountId = isExpense ? 'amount-input' : 'income-amount-input';
            const titleId = isExpense ? 'title-input' : 'income-title-input';
            const catId = isExpense ? 'category-input' : 'income-category-input';
            const memoId = isExpense ? 'expense-memo-input' : 'income-memo-input';
            
            const amount = Number(document.getElementById(amountId).value);
            const title = document.getElementById(titleId).value;
            const category = document.getElementById(catId).value;
            const memo = document.getElementById(memoId).value;
            
            if(!amount || !title) {
                alert('금액과 내역명을 입력해주세요.');
                return;
            }

            appRecords.push({
                id: Date.now(),
                type: type,
                amount: amount,
                title: title,
                category: category,
                memo: memo,
                date: getLocalISODate()
            });

            // 아바타 모션 이펙트 (게이미피케이션)
            avatar.style.transform = 'scale(1.2) rotate(10deg)';
            setTimeout(() => {
                avatar.style.transform = 'scale(1) rotate(0)';
                avatar.src = `https://api.dicebear.com/7.x/bottts/svg?seed=Spender&backgroundColor=${isIncome ? 'e8f7ec' : 'FFB7B2'}`;
            }, 300);

            // 폼 초기화
            document.getElementById(amountId).value = '';
            document.getElementById(titleId).value = '';
            document.getElementById(memoId).value = '';

        } else {
            // 일기 모드 저장
            let date = document.getElementById('journal-date-input').value;
            if (!date) {
                date = getLocalISODate();
            }
            const memo = document.getElementById('journal-memo-input').value;
            
            if (!memo) {
                alert('일기 내용을 입력해주세요.');
                return;
            }
            
            appRecords.push({
                id: Date.now(),
                type: 'journal',
                amount: 0,
                title: '하루의 일상 기록',
                emoji: selectedEmoji,
                memo: memo,
                date: date
            });
            
            document.getElementById('journal-memo-input').value = '';
        }

        // 통합 로컬스토리지 갱신 및 UI(차트/목록) 동기화
        localStorage.setItem('smartAccountRecords', JSON.stringify(appRecords));
        syncAppRenders();

        // 모달 닫기 및 다이어리 뷰로 즉시 이동
        modal.classList.remove('open');
        navItems[2].click(); // 일기 탭 인덱스 2
    });

    const diaryList = document.getElementById('diary-list');
    
    function addDiaryItem(id, title, amount, category, memo, icon='ph-receipt', date='', type='expense') {
        const div = document.createElement('div');
        div.className = 'diary-item';
        div.dataset.recordId = id; // 스토리지 삭제 시 식별 키
        
        const typeClass = type === 'expense' ? 'expense' : 'income';
        const sign = type === 'expense' ? '-' : '+';
        
        div.innerHTML = `
            <div class="diary-icon"><i class="ph ${icon}"></i></div>
            <div class="diary-content" style="display:flex; justify-content:space-between; width:100%;">
                <div style="flex:1;">
                    <div class="diary-header" style="margin-bottom:0px;">
                        <h4>${title}</h4>
                    </div>
                    <div class="diary-meta">${category} • ${date} <span class="diary-amount ${typeClass}" style="margin-left:8px;">${sign}${Number(amount).toLocaleString()}원</span></div>
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
        diaryList.appendChild(div);
    }

    function addJournalItem(id, date, emoji, memo) {
        const div = document.createElement('div');
        div.className = 'diary-item journal-type';
        div.dataset.recordId = id; 
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
        diaryList.appendChild(div);
    }
    
    // 점 3개 누르면 메뉴 열리기 & 타겟 삭제 실제 로컬스토리지 삭제
    function bindKebabMenuEvents(itemDiv) {
        const kebabBtn = itemDiv.querySelector('.kebab-btn');
        const actionMenu = itemDiv.querySelector('.diary-actions-menu');
        const deleteBtn = itemDiv.querySelector('.delete-btn');
        
        kebabBtn.addEventListener('click', (e) => {
            e.stopPropagation(); 
            const isShowing = actionMenu.classList.contains('show');
            document.querySelectorAll('.diary-actions-menu').forEach(m => m.classList.remove('show'));
            if (!isShowing) actionMenu.classList.add('show');
        });

        deleteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if(!confirm("이 기록을 완전히 삭제하시겠습니까? (예산 차트도 복구됩니다)")) return;
            
            const recordId = Number(itemDiv.dataset.recordId);
            
            // 핵심: LocalStorage에서 파기 후 동기화
            appRecords = appRecords.filter(r => r.id !== recordId);
            localStorage.setItem('smartAccountRecords', JSON.stringify(appRecords));
            
            // 삭제 애니메이션 후 엔진 재가동
            itemDiv.style.opacity = '0';
            setTimeout(() => { 
                itemDiv.remove();
                syncAppRenders();
            }, 300);
        });
    }

    // 바깥 여백 누르면 열려있는 메뉴 닫기
    document.addEventListener('click', () => {
        document.querySelectorAll('.diary-actions-menu').forEach(m => m.classList.remove('show'));
    });

    // 카테고리별 아이콘 매퍼
    function getCategoryIcon(cat) {
        if(cat.includes('식비') || cat.includes('카페') || cat.includes('마트')) return 'ph-coffee';
        if(cat.includes('교통')) return 'ph-car';
        if(cat.includes('여가') || cat.includes('문화')) return 'ph-film-strip';
        if(cat.includes('급여') || cat.includes('수입') || cat.includes('수익') || cat.includes('용돈')) return 'ph-piggy-bank';
        if(cat.includes('육아') || cat.includes('가족')) return 'ph-baby';
        return 'ph-receipt';
    }



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

    // 6.1 날짜 নে비게이터 및 통계 관점 스위칭 로직
    const periodLabel = document.getElementById('current-period-label');
    const periodRadios = document.querySelectorAll('input[name="period"]');
    const modeRadiosAnalytics = document.querySelectorAll('input[name="analyticsMode"]');
    
    // 모의 기준 데이터 (현재)
    let currentPeriodType = 'month'; // day, week, month, quarter, year
    let currentAnalyticsMode = 'budget'; // budget, income
    
    // 선택된 탭에 따라 상단 텍스트를 모의 변경하는 함수
    function updatePeriodLabelText(type) {
        if(type === 'day') periodLabel.innerText = '오늘 하루';
        else if(type === 'week') periodLabel.innerText = '이번 주간';
        else if(type === 'month') periodLabel.innerText = '이번 달';
        else if(type === 'quarter') periodLabel.innerText = '이번 분기';
        else if(type === 'year') periodLabel.innerText = '올 한 해';
    }

    periodRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentPeriodType = e.target.value;
            updatePeriodLabelText(currentPeriodType);
            syncAppRenders();
        });
    });

    modeRadiosAnalytics.forEach(radio => {
        radio.addEventListener('change', (e) => {
            currentAnalyticsMode = e.target.value;
            syncAppRenders(); // 관점 전환 시 즉시 재렌더링
        });
    });
    
    // 화살표 클릭 시 모션 효과 (실제 날짜 증감 로직은 모의로 텍스트 깜빡임만 구현)
    document.getElementById('prev-period-btn').addEventListener('click', () => { animPeriodLabel(); });
    document.getElementById('next-period-btn').addEventListener('click', () => { animPeriodLabel(); });
    
    function animPeriodLabel() {
        periodLabel.style.opacity = 0;
        setTimeout(() => { periodLabel.style.opacity = 1; }, 200);
    }

    // 6.2 실제 로컬 데이터 기반 통계(아코디언) 렌더링
    const analyticsListArea = document.getElementById('analytics-list');
    
    function renderAnalyticsListReal(catTotals, expenseRecords, denominator = 1000000) {
        if (!analyticsListArea) return;
        analyticsListArea.innerHTML = '';
        const labels = Object.keys(catTotals);
        const icons = ['ph-coffee', 'ph-shopping-cart', 'ph-car', 'ph-film-strip', 'ph-baby'];
        const colors = ['#FFB7B2', '#B5EAD7', '#9BA4B5', '#E2F0CB', '#C7CEEA'];
        
        // 분모(Denominator)가 0인 경우 방어 로직
        const safeDenominator = denominator > 0 ? denominator : 1;

        labels.forEach((catName, idx) => {
            const catAmount = catTotals[catName];
            if(catAmount === 0) return;
            
            // 선택된 기준(예산 vs 수입)에 따라 퍼센테이지 달라짐
            const catPercentage = Math.round((catAmount/safeDenominator)*100);

            // 해당 카테고리에 속하는 실제 결제 내역 뽑기
            const catItems = expenseRecords.filter(r => r.category === catName).sort((a,b)=>b.id-a.id);
            let detailsHTML = '';
            catItems.forEach(d => {
                detailsHTML += `
                <div class="detail-item">
                    <div class="detail-shop"><i class="ph ${icons[idx]}" style="color:${colors[idx]}"></i><span>${d.title}</span></div>
                    <div>
                        <span class="detail-date" style="margin-right:8px;">${d.date}</span>
                        <span class="detail-amt">${d.amount.toLocaleString()}원</span>
                    </div>
                </div>`;
            });

            const wrapper = document.createElement('div');
            wrapper.className = 'analytics-item-wrapper';
            wrapper.innerHTML = `
                <div class="analytics-item">
                    <div class="al-cat"><i class="ph ${icons[idx]}" style="color:${colors[idx]}"></i><span>${catName}</span></div>
                    <div class="al-amt">${catAmount.toLocaleString()}원 <span style="font-size:11px; color:var(--text-light); margin-left: 4px;">(${catPercentage}%)</span> <i class="ph ph-caret-down al-chevron" style="margin-left:4px;"></i></div>
                </div>
                <div class="analytics-detail-container">
                    <div class="analytics-details neu-inset">
                        ${detailsHTML}
                    </div>
                </div>
            `;
            
            const header = wrapper.querySelector('.analytics-item');
            header.addEventListener('click', () => {
                wrapper.classList.toggle('expanded');
            });
            analyticsListArea.appendChild(wrapper);
        });
    }

    // ---- 7. Settings (예산 설정 자동저장으로 개편) ----
    const budgetInput = document.getElementById('budget-setting-input');

    if (budgetInput) {
        // change 이벤트로 값이 입력되고 포커스를 잃으면 즉시 자동저장 (저장버튼 삭제 크래시 수정)
        budgetInput.addEventListener('change', () => {
            const newBudget = Number(budgetInput.value);
            if (!newBudget || newBudget <= 0) {
                alert('올바른 예산 금액을 입력하세요.');
                return;
            }
            
            if(userData) {
                userData.budget = newBudget;
                localStorage.setItem('smartAccountUserData', JSON.stringify(userData));
                syncAppRenders(); // 차트 데이터 즉각 동기화
                alert(`한 달 목표 예산이 ${newBudget.toLocaleString()}원으로 자동 저장되었습니다!`);
            }
        });
    }

    // ---- 8. 파스텔 테마(색상 스킨) 커스텀 로직 ----
    const themeBtns = document.querySelectorAll('.theme-btn');
    const savedTheme = localStorage.getItem('smartAccountTheme') || 'default';

    // 초기 테마 로드 및 적용
    applyTheme(savedTheme);

    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const themeName = btn.getAttribute('data-theme');
            applyTheme(themeName);
            localStorage.setItem('smartAccountTheme', themeName);
        });
    });

    function applyTheme(themeName) {
        // 기존 테마 클래스 모두 제거
        document.body.className = '';
        if (themeName !== 'default') {
            document.body.classList.add(`theme-${themeName}`);
        }
        
        // 버튼 활성화 상태 표시 변경
        themeBtns.forEach(b => b.classList.remove('active'));
        const activeBtn = document.querySelector(`.theme-btn[data-theme="${themeName}"]`);
        if (activeBtn) activeBtn.classList.add('active');
    }

    // ---- 9. 모든 데이터 물리적 초기화 및 앱 리셋 ----
    const resetAllBtn = document.getElementById('reset-all-btn');
    if(resetAllBtn) {
        resetAllBtn.addEventListener('click', () => {
            const isConfirm = confirm("경고: 기기에 저장된 모든 예산, 이름, 가계부 및 일기 내역이 영구적으로 파기됩니다. 정말 초기화하시겠습니까?");
            if (isConfirm) {
                // LocalStorage 완전 리셋
                localStorage.removeItem('smartAccountUserData');
                localStorage.removeItem('smartAccountRecords');
                localStorage.removeItem('smartAccountTheme'); // 스킨 설정도 초기화

                alert("데이터가 깨끗하게 초기화되었습니다. 처음(온보딩) 페이지로 돌아갑니다.");
                
                // 엔진 재시동
                window.location.reload();
            }
        });
    }

    // 파일 최하단에서, 앱 초기 구동 시 로컬 데이터를 기반으로 한 번 싹 그려줌 (초기 렌더러 가동)
    if (userData) {
        syncAppRenders();
    }
});
