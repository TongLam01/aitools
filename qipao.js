(function() {
    // 1. 唯一标识符：基于当前页面路径
    const storageKey = 'has_visited_delayed_' + window.location.pathname;

    // 2. 预先检查：如果不是首次访问，直接结束，不设置定时器
    if (localStorage.getItem(storageKey)) {
        return;
    }

    // 3. 设置 3000 毫秒（3秒）的延迟
    setTimeout(function() {
        
        // --- 开始创建并注入气泡 ---

        // 4. 动态注入 CSS 样式
        const style = document.createElement('style');
        style.innerHTML = `
            .first-visit-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.5); display: flex;
                justify-content: center; align-items: center; z-index: 10000;
                opacity: 0; transition: opacity 0.5s ease;
            }
            .first-visit-bubble {
                background: white; padding: 25px; border-radius: 12px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.2);
                max-width: 80%; width: 350px; text-align: center;
                transform: translateY(20px); transition: transform 0.5s ease;
            }
            .first-visit-bubble p {
                margin: 0 0 20px 0; color: #333; line-height: 1.6; font-size: 16px;
            }
            .first-visit-close-btn {
                background: #007AFF; color: white; border: none;
                padding: 10px 30px; border-radius: 6px; cursor: pointer;
                font-size: 14px; font-weight: bold;
            }
            /* 激活状态的样式 */
            .show-overlay { opacity: 1 !important; }
            .show-bubble { transform: translateY(0) !important; }
        `;
        document.head.appendChild(style);

        // 5. 创建 HTML 结构
        const overlay = document.createElement('div');
        overlay.className = 'first-visit-overlay';

        const bubble = document.createElement('div');
        bubble.className = 'first-visit-bubble';
        bubble.innerHTML = `
            <p>👋 本AI工具，需要在设置中输入DeepSeek的API Key。<br>访问其官方网站API平台可注册获取。<br>建议至少在该平台充值1元</p>
            <button class="first-visit-close-btn">进入页面</button>
        `;

        overlay.appendChild(bubble);
        document.body.appendChild(overlay);

        // 6. 触发入场动画 (稍微延迟一点点以确保 CSS 生效)
        setTimeout(() => {
            overlay.classList.add('show-overlay');
            bubble.classList.add('show-bubble');
        }, 50);

        // 7. 关闭逻辑
        const closeBtn = bubble.querySelector('.first-visit-close-btn');
        closeBtn.onclick = function() {
            localStorage.setItem(storageKey, 'true');
            overlay.classList.remove('show-overlay');
            // 动画结束后移除元素
            setTimeout(() => overlay.remove(), 500);
        };

    }, 3000); // 这里控制延迟时间，3000 = 3秒
})();