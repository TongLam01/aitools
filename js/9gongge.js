// ==========================================
// 1. Prompt 仓库
// ==========================================
const PROMPTS = {
    male: `一张3x3九宫格形式的男生新年祝福肖像摄影，比例1:1。

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
严禁改变人物身份，九宫格内必须是同一个人，脸型五官、服装材质与颜色、拍摄角度与距离必须保持高度一致。严禁出现页头文本或标题。禁止使用复杂背景或节日道具，禁止女性化姿态，禁止夸张表情。`,

    female: `一张3x3九宫格形式的女生新年祝福肖像摄影，比例1:1。

【整体风格与环境】
极简新年祝福风，视觉基调甜美、喜庆且温馨。背景为纯白色墙面，无任何装饰。光线采用明亮的自然柔光，肤色通透。画面整体色彩重点为中国红（体现在服装与文字上）。

【人物特征】
九宫格内为同一位亚洲年轻女性，气质甜美、活泼、爱笑。黑色长发（或自然的丸子头），发丝柔顺。穿着一件质感高级的红色针织毛衣，设计简约大方。面部妆容为清透的新年开运妆（淡淡的腮红和红唇），皮肤白皙。表情生动自然，眼神充满笑意。

【九宫格动作分布】
1. 第一格：双手抱拳作揖，做出“恭喜发财”的拜年姿势，笑容灿烂。
2. 第二格：单手在眼角处比出 V 手势（剪刀手），俏皮眨眼。
3. 第三格：单手拇指与食指比出“比心”手势，温婉微笑。
4. 第四格：双手捧脸（花朵姿势），头微微歪向一侧，可爱感。
5. 第五格：单手拿着一个红包（或假装拿着），遮住半张脸，只露出一双笑眼。
6. 第六格：双手握拳在脸颊两侧，做出“猫咪招财”的动作。
7. 第七格：单手食指戳脸颊，做出思考或发呆的萌态。
8. 第八格：双手合十许愿状，闭眼微笑，虔诚且美好。
9. 第九格：双手在头顶比出一个大大的爱心，开怀大笑。

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
严禁改变人物身份，九宫格内必须是同一个人，脸型五官、发型、服装材质与颜色、拍摄角度与距离必须保持高度一致。严禁出现页头文本或标题。禁止使用复杂背景，禁止男性化姿态，禁止恐怖或悲伤表情。`,

    couple: `一张包含 3x3 九宫格矩阵的单片摄影接触片图像，比例为 1:1。

【视觉风格与主题】
极简新年马年情侣风格。以马年新年祝福语作为背景装饰元素，每格画面仅出现一组核心祝福词，排版留白充足，文字作为辅助装饰，不遮挡人物面部或互动区域。整体氛围自然、温馨、有生活感。

【主体人物描述】
九宫格内必须始终为同一对年轻的亚洲情侣，保持高度的人物一致性（脸型、五官比例、肤色、气质完全一致，严禁风格化改脸）。
- 女性：身穿简约现代的红色针织一字领毛衣，妆容清透自然。
- 男性：身穿低饱和度的红色或米白色针织毛衣，肤感干净自然。
两人呈现自然亲密的情侣关系，表情基调为开心、放松，带有默契的微笑。

【九宫格详细动作与文字配置】
1. 第一格：并肩站立，身体微靠，手拿节日装饰棒，自然对视微笑。背景文字：「Happy Horse Year」「新年好」。
2. 第二格：两人同时做出贴脸手势，头部轻微靠近。背景文字：「马年大吉」「Ho Se 发财」。
3. 第三格：一人手举“福”字牌，另一人温柔注视对方。背景文字：「马到成功」「2026」。
4. 第四格：两人并排坐姿，肩膀轻触，手拿红包，同时看镜头微笑。背景文字：「一马当先」「一起向前」。
5. 第五格（中心位）：站立居中，背景色微调为浅红色，自然牵手，手拿红包。背景文字：「2026 马年大吉」。
6. 第六格：轻松玩闹的姿态，手拿红包，一人看镜头，一人看对方。背景文字：「Happy 2026」「NEW YEAR」。
7. 第七格：身体向同一侧微倾，手拿节日装饰棒，动作同步且默契。背景文字：「喜气」「Happy New Year」。
8. 第八格：一人做举拳拜年状，另一人微笑看向对方，佩戴节日头饰。背景文字：「马到成功」。
9. 第九格：两人站立贴近，手拿福气球，同时看镜头，充满幸福感。背景文字：「Ho Se 发财」「Happy New Year」。

【核心要求与约束】
九宫格内的人物外貌和服装必须全程保持一致，不得更换人物身份。拍摄角度与光影需和谐统一，呈现出高质量的摄影质感。避免刻意的表演感，强调情侣间真实的眼神交流与温柔笑意。`
};

// ==========================================
// 2. 状态与初始化
// ==========================================
let currentMode = 'male'; // 默认模式: male, female, couple
let base64Data1 = ""; // 第一张图 (男或女)
let base64Data2 = ""; // 第二张图 (仅情侣模式用)

function logStatus(message, isError = false) {
    const statusDiv = document.getElementById('status-log');
    if (statusDiv) {
        statusDiv.innerText = message;
        statusDiv.style.color = isError ? 'red' : '#333';
        statusDiv.style.borderLeftColor = isError ? 'red' : '#007bff';
    }
    console.log(message);
}

// 暴露给 HTML 调用
window.switchMode = function(mode) {
    currentMode = mode;
    
    // 1. UI 样式切换
    document.querySelectorAll('.mode-option').forEach(el => el.classList.remove('active'));
    document.getElementById(`mode-${mode}`).classList.add('active');

    // 2. 上传框逻辑
    const text1 = document.getElementById('text-1');
    const box2 = document.getElementById('upload-box-2');

    if (mode === 'male') {
        text1.innerText = "📸 上传男生照片";
        box2.style.display = 'none';
    } else if (mode === 'female') {
        text1.innerText = "📸 上传女生照片";
        box2.style.display = 'none';
    } else if (mode === 'couple') {
        text1.innerText = "📸 上传男生照片"; // 左边男
        document.getElementById('text-2').innerText = "📸 上传女生照片"; // 右边女
        box2.style.display = 'flex'; // 显示第二个框
    }
    
    logStatus(`🔄 已切换为：${document.getElementById(`mode-${mode}`).innerText}`);
};

window.onload = function() {
    logStatus("✅ 系统就绪：请选择模式并上传照片。");
    
    // 绑定文件输入 1
    const fileInput1 = document.getElementById('file-input-1');
    if (fileInput1) {
        fileInput1.onchange = (e) => handleFileSelect(e, 1);
    }

    // 绑定文件输入 2
    const fileInput2 = document.getElementById('file-input-2');
    if (fileInput2) {
        fileInput2.onchange = (e) => handleFileSelect(e, 2);
    }

    // 绑定生成按钮
    const generateBtn = document.getElementById('btn-generate');
    if (generateBtn) {
        generateBtn.onclick = generateImage;
    }
    
    // 初始化 UI
    switchMode('male');
};

// ==========================================
// 3. 文件处理
// ==========================================
function handleFileSelect(event, index) {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > 4 * 1024 * 1024) { logStatus("⚠️ 图片过大，建议 < 4MB。", true); }

    const reader = new FileReader();
    reader.onloadstart = function() { logStatus(`⏳ 正在读取图片 ${index}...`); };
    reader.onload = function(e) {
        // 更新预览图
        const img = document.getElementById(`preview-${index}`);
        if (img) { img.src = e.target.result; img.style.display = 'inline-block'; }
        
        // 存入对应变量
        if (index === 1) base64Data1 = e.target.result;
        if (index === 2) base64Data2 = e.target.result;

        logStatus(`✅ 图片 ${index} 读取成功！`);
    };
    reader.onerror = function() { logStatus(`❌ 图片 ${index} 读取失败`, true); };
    reader.readAsDataURL(file);
}

// ==========================================
// 4. 生成逻辑 (适配单图/双图)
// ==========================================
async function generateImage() {
    const apiKey = document.getElementById('api-key').value.trim();
    const modelId = document.getElementById('model-id').value.trim();
    const btn = document.getElementById('btn-generate');
    const isAutoSlice = document.getElementById('auto-slice').checked;

    // 基础校验
    if (!apiKey) { alert("请输入 API Key"); return; }
    
    // 图片校验
    if (!base64Data1) { alert("请上传第一张图片"); return; }
    if (currentMode === 'couple' && !base64Data2) { alert("情侣模式请同时上传男女两张照片"); return; }

    btn.disabled = true;
    btn.innerText = "⏳ 正在生成中...";
    document.getElementById('result-area').style.display = 'none';
    const gridContainer = document.getElementById('slices-grid');
    if(gridContainer) gridContainer.innerHTML = ""; 

    try {
        logStatus(`🚀 正在请求生成 (${currentMode}模式)，请稍候...`);
        const endpoint = "https://ark.cn-beijing.volces.com/api/v3/images/generations";
        
        // ★★★ 核心修改：根据模式构造 image 字段 ★★★
        let imagePayload;
        if (currentMode === 'couple') {
            // 双图模式：传数组
            imagePayload = [base64Data1, base64Data2];
        } else {
            // 单图模式：传字符串
            imagePayload = base64Data1;
        }

        const payload = {
            model: modelId,
            prompt: PROMPTS[currentMode], // 根据模式取 Prompt
            image: imagePayload,          // 动态图片参数
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
            
            if (isAutoSlice) {
                logStatus("🎉 生成成功！正在执行自动裁切...");
                setTimeout(() => { sliceImageToNine(resultUrl); }, 500);
            } else {
                logStatus("🎉 生成成功！");
                if(gridContainer) gridContainer.innerHTML = "<p style='color:#999; font-size:12px; padding:10px; text-align:center;'>自动裁切已关闭</p>";
            }

        } else {
            throw new Error("API 返回空数据");
        }

    } catch (error) {
        console.error(error);
        logStatus("❌ 失败: " + error.message, true);
    } finally {
        btn.disabled = false;
        btn.innerText = "✨ 开始生成 ✨";
    }
}

// ==========================================
// 5. 裁切功能 (保持不变，因为裁切的是结果图)
// ==========================================
async function sliceImageToNine(imageUrl) {
    const container = document.getElementById('slices-grid');
    if(!container) return;
    
    container.innerHTML = "🔄 正在处理...";
    
    try {
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(imageUrl)}`;
        const response = await fetch(proxyUrl);
        
        if (!response.ok) { throw new Error(`中转失败: ${response.status}`); }

        const blob = await response.blob();
        const localUrl = URL.createObjectURL(blob);
        const tempImg = new Image();
        tempImg.src = localUrl;

        tempImg.onload = function() {
            container.innerHTML = ""; 
            const w = tempImg.width;
            const h = tempImg.height;
            const cellW = w / 3;
            const cellH = h / 3;

            // 非对称裁切参数 (顶部保字，底部去边)
            const CUT_TOP = 0.002;
            const CUT_BOTTOM = 0.04;
            const CUT_X = 0.02;

            const drawW = cellW * (1 - CUT_X * 2);
            const drawH = cellH * (1 - CUT_TOP - CUT_BOTTOM);

            logStatus("✅ 图片已就绪，正在执行非对称裁切...");

            for (let row = 0; row < 3; row++) {
                for (let col = 0; col < 3; col++) {
                    const canvas = document.createElement('canvas');
                    canvas.width = drawW;
                    canvas.height = drawH;
                    const ctx = canvas.getContext('2d');

                    const gridX = col * cellW;
                    const gridY = row * cellH;

                    const sourceX = gridX + (cellW * CUT_X);
                    const sourceY = gridY + (cellH * CUT_TOP);

                    ctx.drawImage(tempImg, sourceX, sourceY, drawW, drawH, 0, 0, drawW, drawH);

                    const dataUrl = canvas.toDataURL("image/png");
                    const imgElem = document.createElement('img');
                    imgElem.src = dataUrl;
                    imgElem.className = "slice-item";
                    
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
