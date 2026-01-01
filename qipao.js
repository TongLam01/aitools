(function() {
    // 1. 唯一标识符：基于当前页面路径
    const storageKey = 'has_visited_delayed_' + window.location.pathname;

    // 2. 预先检查：如果不是首次访问，直接结束
    if (localStorage.getItem(storageKey)) {
        return;
    }

    // 3. 设置 3000 毫秒（3秒）的延迟
    setTimeout(function() {
        
        // 4. 动态注入 CSS 样式
        const style = document.createElement('style');
        style.innerHTML = `
            .first-visit-overlay {
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                width: 100%; height: 100%;
                background: rgba(0,0,0,0.6); 
                display: flex; justify-content: center; align-items: center; 
                z-index: 2147483647; /* 确保在最顶层 */
                opacity: 0; transition: opacity 0.5s ease;
                padding: 20px; box-sizing: border-box;
            }
            .first-visit-bubble {
                background: white; padding: 28px 24px; border-radius: 16px;
                box-shadow: 0 15px 35px rgba(0,0,0,0.3);
                width: 100%; max-width: 340px; /* 适配手机端宽度 */
                text-align: center;
                transform: translateY(30px); transition: transform 0.5s ease;
                box-sizing: border-box;
            }
            .first-visit-bubble p {
                margin: 0 0 24px 0; color: #444; 
                line-height: 1.8; /* 调高行距，更优美 */
                font-size: 15px; text-align: center; /* 左对齐方便阅读多行文本 */
            }
            /* 按钮组布局 */
            .first-visit-btn-group {
                display: flex; gap: 12px; justify-content: center;
            }
            .first-visit-btn {
                flex: 1; padding: 12px 0; border-radius: 8px; cursor: pointer;
                font-size: 14px; font-weight: 600; border: none; transition: all 0.2s;
                text-decoration: none; display: inline-block;
            }
            /* 去看看按钮 - 次要颜色 */
            .btn-link {
                background: #f0f0f0; color: #333;
            }
            /* 进入页面按钮 - 主题色 */
            .btn-close {
                background: #007AFF; color: white;
            }
            .first-visit-btn:active { transform: scale(0.95); }

            /* 激活状态 */
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
            <p>👋 本工具需在设置中输入API Key<br>访问DeepSeek官网API平台可注册获取<br>建议至少充值1元</p>
            <div class="first-visit-btn-group">
                <a href="https://platform.deepseek.com/" target="_blank" class="first-visit-btn btn-link">去看看</a>
                <button class="first-visit-btn btn-close">我知道了</button>
            </div>
        `;

        overlay.appendChild(bubble);
        document.body.appendChild(overlay);

        // 6. 触发入场动画
        setTimeout(() => {
            overlay.classList.add('show-overlay');
            bubble.classList.add('show-bubble');
        }, 50);

        // 7. 关闭逻辑
        const closeBtn = bubble.querySelector('.btn-close');
        closeBtn.onclick = function() {
            localStorage.setItem(storageKey, 'true');
            overlay.classList.remove('show-overlay');
            setTimeout(() => overlay.remove(), 500);
        };

        // 点击“去看看”不关闭气泡，让用户跳转回来后还能看到提示
    }, 3000);
})();
