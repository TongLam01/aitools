/**
 * 自动为小工具注入“返回首页”悬浮按钮
 * 建议在所有单 HTML 工具的 body 末尾引用
 */
(function() {
    // 1. 注入样式
    const style = document.createElement('style');
    style.innerHTML = `
        .home-fab {
            position: fixed;
            bottom: 30px;
            right: 30px;
            width: 50px;
            height: 50px;
            background: rgba(79, 70, 229, 0.85); /* 延续首页的紫色调 */
            color: white !important;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            z-index: 99999;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            text-decoration: none;
            border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .home-fab:hover {
            transform: scale(1.1) rotate(-8deg);
            background: #4f46e5;
            box-shadow: 0 12px 20px rgba(79, 70, 229, 0.3);
        }
        .home-fab svg { width: 22px; height: 22px; }
        
        /* 移动端稍微缩小一点，避免挡住内容 */
        @media (max-width: 640px) {
            .home-fab { bottom: 20px; right: 20px; width: 44px; height: 44px; }
        }
    `;
    document.head.appendChild(style);

    // 2. 创建并注入按钮 HTML
    const fab = document.createElement('a');
    fab.href = 'index.html';
    fab.className = 'home-fab';
    fab.title = '返回首页';
    fab.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
    `;

    // 3. 确保在 body 加载后再插入
    if (document.body) {
        document.body.appendChild(fab);
    } else {
        window.addEventListener('DOMContentLoaded', () => {
            document.body.appendChild(fab);
        });
    }
})();
