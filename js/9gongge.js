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
严禁改变人物身份，九宫格内必须是同一个人，脸型五官、服装材质与颜色、拍摄角度与距离必须保持高度一致。禁止出现页头信息。禁止使用复杂背景或节日道具，禁止女性化姿态，禁止夸张表情。`;

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
            
            // 显示大图
            const resImg = document.getElementById('result-img');
            resImg.src = resultUrl;
            document.getElementById('result-area').style.display = 'block';
            
            logStatus("🎉 生成成功！正在执行智能裁切...");

            // 延迟一点点，确保 UI 渲染完毕
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
// 4. 九宫格自动裁切 (Blob流下载版)
// ==========================================
async function sliceImageToNine(imageUrl) {
    const container = document.getElementById('slices-grid');
    if(!container) return;
    
    container.innerHTML = "🔄 正在下载原图数据以进行无损裁切...";
    
    try {
        // ★★★ 核心修复：使用 fetch 获取图片数据流 (Blob) ★★★
        // 这一步不会破坏签名，并且能正确处理跨域
        const response = await fetch(imageUrl);
        
        if (!response.ok) {
            throw new Error("图片下载失败，服务器拒绝访问");
        }

        const blob = await response.blob();
        // 创建一个本地的临时 URL，这样浏览器就认为图片是“本地”的了，随便切！
        const localUrl = URL.createObjectURL(blob);
        
        const tempImg = new Image();
        tempImg.src = localUrl;

        tempImg.onload = function() {
            container.innerHTML = ""; // 清空提示
            
            const w = tempImg.width;
            const h = tempImg.height;
            const sliceW = Math.floor(w / 3);
            const sliceH = Math.floor(h / 3);

            logStatus("✅ 图片数据已就绪，正在切片...");

            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 3; col++) {
                    const canvas = document.createElement('canvas');
                    canvas.width = sliceW;
                    canvas.height = sliceH;
                    const ctx = canvas.getContext('2d');

                    // 绘图
                    ctx.drawImage(tempImg, col * sliceW, row * sliceH, sliceW, sliceH, 0, 0, sliceW, sliceH);

                    // 导出小图
                    const dataUrl = canvas.toDataURL("image/png");
                    
                    const imgElem = document.createElement('img');
                    imgElem.src = dataUrl;
                    imgElem.className = "slice-item";
                    imgElem.title = "点击下载这张图";
                    
                    // 绑定下载事件
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
            // 释放内存
            URL.revokeObjectURL(localUrl);
            logStatus("🎉 完美！9张高清小图已生成，点击小图即可下载。");
        };

        tempImg.onerror = function() {
            container.innerHTML = "裁切失败";
            logStatus("⚠️ 裁切失败：本地 Blob 图片加载异常。", true);
        };

    } catch (e) {
        console.error("切图错误:", e);
        // 如果 fetch 报错，说明浏览器真的完全禁止了跨域访问
        if (e.message.includes("Failed to fetch") || e.name === 'TypeError') {
            container.innerHTML = "<p style='color:red; font-size:12px; padding:10px;'>⚠️ 无法自动裁切：火山引擎服务器未返回 CORS 许可头。</p>";
            logStatus("⚠️ 大图生成成功，但自动裁切被浏览器拦截。请长按上方大图保存后手动裁切。", true);
        } else {
            container.innerHTML = "出错";
            logStatus("⚠️ 裁切出错: " + e.message, true);
        }
    }
}
