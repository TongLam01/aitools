// ==========================================
// 核心配置区：在这里修改你的 Prompt
// ==========================================
const PROMPT_TEMPLATE = `一张包含 3x3 九宫格矩阵的单片摄影接触片图像，比例为 1:1。

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
九宫格内的人物外貌和服装必须全程保持一致，不得更换人物身份。拍摄角度与光影需和谐统一，呈现出高质量的摄影质感。避免刻意的表演感，强调情侣间真实的眼神交流与温柔笑意。`;


// ==========================================
// 逻辑功能区：以下代码负责图片处理与API调用
// ==========================================

let base64Data = "";

// 图片上传处理
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
        alert("图片过大，建议上传 2MB 以内的图片");
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = document.getElementById('preview-img');
        img.src = e.target.result;
        img.style.display = 'inline-block';
        base64Data = e.target.result; 
    };
    reader.readAsDataURL(file);
}

// API 调用核心逻辑
async function generateImage() {
    const apiKey = document.getElementById('api-key').value.trim();
    const modelId = document.getElementById('model-id').value.trim();
    const errorDiv = document.getElementById('error-msg');
    
    errorDiv.style.display = 'none';
    errorDiv.innerText = '';

    if (!apiKey) { alert("请输入 API Key"); return; }
    if (!base64Data) { alert("请先上传一张图片"); return; }

    const btn = document.getElementById('generate-btn');
    const loading = document.getElementById('loading-text');
    const resultArea = document.getElementById('result-area');
    
    btn.disabled = true;
    loading.style.display = 'block';
    resultArea.style.display = 'none';

    try {
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

        if (!response.ok) {
            throw new Error(data.error?.message || "请求失败，请检查 API Key 和 Model ID");
        }

        if (data.data && data.data.length > 0) {
            const resultUrl = data.data[0].url;
            document.getElementById('result-img').src = resultUrl;
            resultArea.style.display = 'block';
        } else {
            throw new Error("API 返回的数据格式不符合预期");
        }

    } catch (error) {
        console.error(error);
        errorDiv.innerText = "错误: " + error.message;
        errorDiv.style.display = 'block';
        if(error.message.includes("Failed to fetch")) {
            errorDiv.innerText += " (很可能是跨域问题，请安装并开启 'Allow CORS' 浏览器插件)";
        }
    } finally {
        btn.disabled = false;
        loading.style.display = 'none';
    }
}
