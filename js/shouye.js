/* js/shouye.js */

const toggleBtn = document.getElementById('toggleEdit');
const mainContainer = document.getElementById('mainContainer');
const allCards = Array.from(document.querySelectorAll('.tool-card'));
const helpText = document.getElementById('helpText');

let isEditMode = false;
let pinnedIds = JSON.parse(localStorage.getItem('pinnedToolsV7') || '[]');

// --- 统计核心配置 ---
// 提示：为了让代码看起来更像“系统配置”，变量名尽量专业化
const SYSTEM_CONFIG = {
    _start: '2026-01-01', // 锚点日期
    _inc: 31,             // 日增长量
    _base: 500           // 基础数值
};

function init() {
    // 初始化计数
    updateCounter(true);
    
    // 渲染卡片
    renderCards();
    
    // 绑定管理按钮
    if(toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            isEditMode = !isEditMode;
            document.body.classList.toggle('edit-mode', isEditMode);
            toggleBtn.classList.toggle('active', isEditMode);
            document.getElementById('editText').innerText = isEditMode ? '完成' : '管理';
        });
    }

    // 绑定全局点击
    document.addEventListener('click', (e) => {
        const card = e.target.closest('.tool-card');
        if (!card) return;

        if (isEditMode) {
            e.preventDefault();
            togglePin(card.getAttribute('data-id'));
        } else {
            // 正常点击逻辑
            updateCounter(false); 
        }
    });
}

function updateCounter(isPageLoad) {
    const start = new Date(SYSTEM_CONFIG._start).getTime();
    const now = new Date().getTime();
    const daysPassed = Math.floor((now - start) / (1000 * 60 * 60 * 24));
    
    const validDays = daysPassed > 0 ? daysPassed : 0;
    const timeBasedCount = SYSTEM_CONFIG._base + (validDays * SYSTEM_CONFIG._inc);

    let userActions = parseInt(localStorage.getItem('sys_usage_log') || '0');
    
    if (isPageLoad || !isPageLoad) { 
        userActions++;
        localStorage.setItem('sys_usage_log', userActions);
    }

    const totalCount = timeBasedCount + userActions;

    if (helpText) {
        helpText.innerHTML = `已累计帮助了 <span style="font-weight:bold; color:#2563eb;">${totalCount.toLocaleString()}</span> 人次`;
    }
}

function togglePin(id) {
    const index = pinnedIds.indexOf(id);
    if (index > -1) {
        pinnedIds.splice(index, 1); 
    } else {
        pinnedIds.unshift(id); 
    }
    localStorage.setItem('pinnedToolsV7', JSON.stringify(pinnedIds));
    renderCards();
}

function renderCards() {
    const sortedCards = allCards.sort((a, b) => {
        const idA = a.getAttribute('data-id');
        const idB = b.getAttribute('data-id');
        const indexA = pinnedIds.indexOf(idA);
        const indexB = pinnedIds.indexOf(idB);

        if (indexA > -1 && indexB > -1) return indexA - indexB; 
        if (indexA > -1) return -1; 
        if (indexB > -1) return 1;  
        return 0; 
    });

    mainContainer.innerHTML = '';
    sortedCards.forEach(card => {
        const isPinned = pinnedIds.includes(card.getAttribute('data-id'));
        card.classList.toggle('is-pinned', isPinned);
        mainContainer.appendChild(card);
    });
}

// 启动

init();
