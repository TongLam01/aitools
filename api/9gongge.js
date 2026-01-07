// ==========================================
// 1. Prompt 配置
// ==========================================
const PROMPT_TEMPLATE = `一张3x3九宫格形式的男生新年祝福肖像摄影，比例1:1。

【整体风格与环境】
极简新年祝福风，视觉基调干净、温和且克制。背景为纯白色墙面，无任何装饰。光线采用均匀的自然柔光，无强阴影。画面整体色彩重点为中国红（体现在服装与文字上）。

【人物特征】
九宫格内为同一位亚洲男性，气质干净、阳光、自然，不油腻。黑色短发，自然蓬松且利落。穿着一件纯红色的简约针织毛衣或卫衣，无图案。面部保持真实自然的肤质，无明显妆感。表情为克制的微笑，透出开心的氛围。

【九宫格动作分布】
1. 第一格：食指竖于嘴前，做轻松安静的“嘘”手势。
2. 第二格：单手在脸部附近比出 V 手势。
3. 第三格：单手做出 OK 手势或三指手势。
4. 第四格：双手举起，做轻松俏皮的手势（避免过度卖萌）。
5. 第五格：单手张开，轻轻遮住半边脸。
6. 第六格：单手在脸侧做出电话手势。
7. 第七格：单手手指轻点脸颊或下巴。
8. 第八格：单手托住下巴，呈现轻微思考的姿态。
9. 第九格：双手指向脸部，或克制的比心变体动作。

【文字排版】
每一格图片的顶部居中位置均有文字覆盖。使用传统中文新年书法字体，主文字颜色为中国红，年份颜色为深蓝色。文字结构为“四字祝福语 + 2026”。
具体对应内容为：
- 格1：一帆风顺 2026
- 格2：双喜临门 2026
- 格3：三阳开泰 2026
- 格4：四季发财 2026
- 格5：五福临门 2026
- 格6：六六大顺 2026
- 格7：七星高照 2026
- 格8：八方来财 2026
- 格9：九九同心 2026

【核心限制】
严禁改变人物身份，九宫格内必须是同一个人，脸型五官、服装材质与颜色、拍摄角度与距离必须保持高度一致。禁止使用复杂背景或节日道具，禁止女性化姿态，禁止夸张表情。`;

// ==========================================
// 2. 初始化与辅助函数
// ==========================================

let base64Data = "";

// 辅助函数：更新屏幕上的状态文字
function logStatus(message, isError = false) {
    const statusDiv = document.getElementById('status-log');
    if (statusDiv) {
        statusDiv.innerText = message;
        statusDiv.style.color = isError ? 'red' : '#333';
        statusDiv.style.borderLeftColor = isError ? 'red' : '#007bff';
    }
    console.log(message);
}

// 页面加载完成后执行
window.onload = function() {
    logStatus("系统就绪：JS文件加载成功，请上传图片。");

    const fileInput = document.getElementById('file-input');
    const generateBtn = document.getElementById('btn-generate');

    // 监听文件变化
    if (fileInput) {
        fileInput.onchange = function(e) {
            logStatus("检测到文件选择，开始读取...");
            handleFileSelect(e);
        };
    } else {
        logStatus("严重错误：找不到文件输入框 ID", true);
    }

    // 监听按钮点击
    if (generateBtn) {
        generateBtn.onclick = generateImage;
    } else {
        logStatus("严重错误：找不到生成按钮 ID", true);
    }
};

// ==========================================
// 3. 核心功能
// ==========================================

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) {
        logStatus("未选择文件", true);
        return;
    }

    // 检查文件大小 (2MB)
    if (file.size > 2 * 1024 * 1024) {
        logStatus("警告：图片过大 (" + (file.size/1024/1024).toFixed(2) + "MB)，建议使用小于 2MB 的图片，否则可能失败。", true);
    }

    const reader = new FileReader();
    
    // 读取开始
    reader.onloadstart = function() {
        logStatus("正在将图片转换为 Base64 格式...");
    };

    // 读取成功
    reader.onload = function(e) {
        const img = document.getElementById('preview-img');
        if (img) {
            img.src = e.target.result;
            img.style.display = 'inline-block';
        }
        base64Data = e.target.result; 
        logStatus("✅ 图片读取成功！现在请点击“生成新年九宫格”按钮。");
    };

    // 读取出错
    reader.onerror = function() {
        logStatus("图片读取失败，请重试。", true);
    };

    reader.readAsDataURL(file);
}

async function generateImage() {
    // 1. 获取输入值
    const apiKey = document.getElementById('api-key').value.trim();
    const modelId = document.getElementById('model-id').value.trim();
    
    // 2. 基础校验
    if (!apiKey) {
        logStatus("❌ 错误：请输入 API Key", true);
        alert("请输入 API Key");
        return;
    }
    if (!base64Data) {
        logStatus("❌ 错误：图片数据为空，请重新上传图片", true);
        alert("请先上传图片");
        return;
    }

    // 3. 更新 UI 状态
    const btn = document.getElementById('btn-generate');
    btn.disabled = true;
    btn.innerText = "生成中...";
    document.getElementById('result-area').style.display = 'none';

    try {
        logStatus("🚀 正在向火山引擎发送请求，请耐心等待 (约15-30秒)...");

        const endpoint = "https://ark.cn-beijing.volces.com/api/v3/images/generations";
        const payload = {
            model: modelId,
            prompt: PROMPT_TEMPLATE,
            image: base64Data, 
            sequential_image_generation: "disabled",
            response_format: "url",
            size: "2K",
            stream: false,
            watermark: true
        };

        // 发起请求
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        // 4. 处理响应
        if (!response.ok) {
            throw new Error("API 报错: " + (data.error?.message || JSON.stringify(data)));
        }

        if (data.data && data.data.length > 0) {
            const resultUrl = data.data[0].url;
            document.getElementById('result-img').src = resultUrl;
            document.getElementById('result-area').style.display = 'block';
            logStatus("🎉 生成成功！结果已显示在下方。");
        } else {
            throw new Error("API 返回了空数据");
        }

    } catch (error) {
        console.error(error);
        // 将错误信息显示在屏幕上
        let errorMsg = error.message;
        if(errorMsg.includes("Failed to fetch")) {
            errorMsg += " (这通常是跨域问题，请检查浏览器插件 'Allow CORS' 是否已开启)";
        }
        logStatus("❌ 生成失败: " + errorMsg, true);
    } finally {
        // 恢复按钮状态
        btn.disabled = false;
        btn.innerText = "✨ 生成新年九宫格 ✨";
    }
}
