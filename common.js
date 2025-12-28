/**
 * 自动为小工具注入“侧边吸附”返回首页按钮
 * 方案二：半圆标签模式，减少空间占用，防止遮挡
 */
(function() {
    // 1. 注入样式
    const style = document.createElement('style');
    style.innerHTML = `
        .home-side-tab {
            position: fixed;
            /* 垂直位置：距离底部 20%，避开大多数工具的底部工具栏 */
            bottom: 20%; 
            right: 0;
            width: 42px;
            height: 42px;
            background: rgba(79, 70, 229, 0.5); /* 平时半透明 */
            color: white !important;
            /* 左圆右方，使其吸附在右侧边缘 */
            border-radius: 24px 0 0 24px; 
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: -2px 4px 12px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
            z-index: 99999;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            text-decoration: none;
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-right: none;
            padding-left: 4px;
        }

        /* 鼠标悬停或激活状态：不透明并向左伸出 */
        .home-side-tab:hover, .home-side-tab:active {
            width: 52px;
            background: rgba(79, 70, 229, 1);
            box-shadow: -4px 6px 16px rgba(79, 70, 229, 0.4);
            padding-left: 0;
        }

        .home-side-tab svg {
            width: 20px;
            height: 20px;
            transition: transform 0.3s;
        }

        .home-side-tab:hover svg {
            transform: scale(1.1);
        }

        /* 针对手机端的小调整 */
        @media (max-width: 640px) {
            .home-side-tab {
                bottom: 25%; /* 手机端稍微调高一点，避开全面屏手势 */
                width: 38px;
                height: 38px;
            }
            .home-side-tab:active {
                width: 48px;
            }
        }
    `;
    document.head.appendChild(style);

    // 2. 创建并注入按钮 HTML
    const tab = document.createElement('a');
    tab.href = 'index.html';
    tab.className = 'home-side-tab';
    tab.title = '返回首页';
    tab.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
    `;

    // 3. 确保在 body 加载后再插入
    if (document.body) {
        document.body.appendChild(tab);
    } else {
        window.addEventListener('DOMContentLoaded', () => {
            document.body.appendChild(tab);
        });
    }
})();
