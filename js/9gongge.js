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
每一格图片的顶部居中位置均有文字覆盖。使用传统中文新年书法字体，主文字颜色为中国红，年份颜色为深蓝色。文字结构为“红色四字祝福语  2026”。
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
严禁改变人物身份，九宫格内必须是同一个人，脸型五官、服装材质与颜色、拍摄角度与距离必须保持高度一致。禁止出现页头文本信息。禁止使用复杂背景或节日道具，禁止女性化姿态，禁止夸张表情。`;

// ==========================================
// 2. 初始化逻辑
// ==========================================
let base64Data = "";

function logStatus(message, isError = false) {
    const statusDiv = document.getElementById('status-log');
    if (statusDiv) {
        statusDiv.innerText = message;
        statusDiv.style.color = isError ? 'red' : '#333';
        statusDiv.style.borderLeftColor = isError ? 'red' : '#007bff';
    }
    console.log(message);
}

window.onload = function() {
    logStatus("✅ 系统就绪：文件加载成功，请点击上传图片。");
    const fileInput = document.getElementById('file-input');
    const generateBtn = document.getElementById('btn-generate');

    if (fileInput) {
        fileInput.onchange = function(e) {
            logStatus("📷 检测到文件选择，开始读取...");
            handleFileSelect(e);
        };
    }
    if (generateBtn) {
        generateBtn.onclick = generateImage;
    }
};

// ==========================================
// 3. 核心功能函数
// ==========================================
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) { logStatus("未选择文件", true); return; }
    if (file.size > 4 * 1024 * 1024) { logStatus("⚠️ 图片过大，建议 < 4MB。", true); }

    const reader = new FileReader();
    reader.onloadstart = function() { logStatus("⏳ 正在读取图片并转换为 Base64..."); };
    reader.onload = function(e) {
        const img = document.getElementById('preview-img');
        if (img) { img.src = e.target.result; img.style.display = 'inline-block'; }
        base64Data = e.target.result; 
        logStatus("✅ 图片读取成功！请填写 API Key 并点击生成按钮。");
    };
    reader.onerror = function() { logStatus("❌ 图片读取失败", true); };
    reader.readAsDataURL(file);
}

async function generateImage() {
    const apiKey = document.getElementById('api-key').value.trim();
    const modelId = document.getElementById('model-id').value.trim();
    const btn = document.getElementById('btn-generate');
    
    if (!apiKey) { alert("请输入 API Key"); return; }
    if (!base64Data) { alert("请先上传图片"); return; }

    btn.disabled = true;
    btn.innerText = "⏳ 正在生成中...";
    document.getElementById('result-area').style.display = 'none';
    const gridContainer = document.getElementById('slices-grid');
    if(gridContainer) gridContainer.innerHTML = ""; 

    try {
        logStatus("🚀 正在请求生成，请稍候...");
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

        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`
            },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok) { throw new Error(data.error?.message || "API请求失败"); }

        if (data.data && data.data.length > 0) {
            const resultUrl = data.data[0].url;
            
            const resImg = document.getElementById('result-img');
            resImg.src = resultUrl;
            document.getElementById('result-area').style.display = 'block';
            
            logStatus("🎉 生成成功！正在执行无损精修裁切...");

            setTimeout(() => {
                sliceImageToNine(resultUrl);
            }, 500);

        } else {
            throw new Error("API 返回空数据");
        }

    } catch (error) {
        console.error(error);
        logStatus("❌ 失败: " + error.message, true);
    } finally {
        btn.disabled = false;
        btn.innerText = "✨ 生成新年九宫格 ✨";
    }
}

// ==========================================
// 4. 九宫格自动裁切 (非对称精修版)
// ==========================================
async function sliceImageToNine(imageUrl) {
    const container = document.getElementById('slices-grid');
    if(!container) return;
    
    container.innerHTML = "🔄 正在处理...";
    
    try {
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(imageUrl)}`;
        const response = await fetch(proxyUrl);
        
        if (!response.ok) {
            throw new Error(`中转失败: ${response.status}`);
        }

        const blob = await response.blob();
        const localUrl = URL.createObjectURL(blob);
        
        const tempImg = new Image();
        tempImg.src = localUrl;

        tempImg.onload = function() {
            container.innerHTML = ""; 
            
            const w = tempImg.width;
            const h = tempImg.height;

            // 基础格子大小
            const cellW = w / 3;
            const cellH = h / 3;

            // ★★★ 核心修改：非对称裁切参数 ★★★
            // 目标：顶部少切（保文字），底部多切（去白边）
            
            const CUT_TOP = 0.002;    // 顶部切掉 0.2% (几乎不切，防黑线即可)
            const CUT_BOTTOM = 0.04;  // 底部切掉 4%   (大力切，去除底部白条)
            const CUT_X = 0.02;       // 左右切掉 2%   (正常去边)

            // 计算实际绘图区域的宽高
            // 宽度 = 基础宽 * (1 - 左切 - 右切)
            const drawW = cellW * (1 - CUT_X * 2);
            // 高度 = 基础高 * (1 - 顶切 - 底切)
            const drawH = cellH * (1 - CUT_TOP - CUT_BOTTOM);

            logStatus("✅ 图片已就绪，正在执行非对称裁切...");

            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 3; col++) {
                    const canvas = document.createElement('canvas');
                    canvas.width = drawW;
                    canvas.height = drawH;
                    const ctx = canvas.getContext('2d');

                    // 1. 基础坐标
                    const gridX = col * cellW;
                    const gridY = row * cellH;

                    // 2. 应用非对称偏移
                    // X轴：往右移 2%
                    const sourceX = gridX + (cellW * CUT_X);
                    // Y轴：往下移 0.2% (让出顶部空间，裁切框整体上移，从而切掉更多底部)
                    const sourceY = gridY + (cellH * CUT_TOP);

                    // 3. 裁切
                    ctx.drawImage(tempImg, sourceX, sourceY, drawW, drawH, 0, 0, drawW, drawH);

                    const dataUrl = canvas.toDataURL("image/png");
                    
                    const imgElem = document.createElement('img');
                    imgElem.src = dataUrl;
                    imgElem.className = "slice-item";
                    imgElem.title = "点击下载";
                    
                    (function(r, c, url) {
                        imgElem.onclick = function() {
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = `马年头像_${r+1}_${c+1}.png`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                        };
                    })(row, col, dataUrl);

                    container.appendChild(imgElem);
                }
            }
            URL.revokeObjectURL(localUrl);
            logStatus("🎉 完美！底部白边已去除，文字已完整保留。");
        };

        tempImg.onerror = function() {
            container.innerHTML = "裁切失败";
            logStatus("⚠️ 裁切失败：图片加载异常。", true);
        };

    } catch (e) {
        console.error("切图错误:", e);
        container.innerHTML = "<p style='color:red; font-size:12px; padding:10px;'>⚠️ 裁切服务异常</p>";
        logStatus("⚠️ 裁切失败: " + e.message, true);
    }
}
