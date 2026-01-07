// ==========================================
// 调试检查：如果你没看到这个弹窗，说明路径错了！
// ==========================================
// alert("JS文件加载成功！如果看到这句话，说明路径是对的。"); 
// (确认成功后，你可以把上面这行代码删掉或者注释掉)

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
// 2. 初始化与事件绑定
// ==========================================

let base64Data = "";

// 页面加载完成后执行
window.onload = function() {
    console.log("9gongge.js 已成功加载！");

    const fileInput = document.getElementById('file-input');
    const generateBtn = document.getElementById('btn-generate');

    // 我们不再需要绑定 click 事件，因为 HTML label 会自动触发 input
    // 我们只需要监听“文件选好了没” (change)
    if (fileInput) {
        fileInput.onchange = function(e) {
            console.log("检测到文件变化");
            handleFileSelect(e);
        };
    } else {
        console.error("严重错误：找不到 ID 为 file-input 的元素");
    }

    // 绑定生成按钮
    if (generateBtn) {
        generateBtn.onclick = generateImage;
    }
};

// ==========================================
// 3. 核心功能函数
// ==========================================

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    if (file.size > 4 * 1024 * 1024) {
        alert("图片过大，建议上传 4MB 以内的图片");
    }

    const reader = new FileReader();
    reader.onload = function(e) {
        const img = document.getElementById('preview-img');
        if (img) {
            img.src = e.target.result;
            img.style.display = 'inline-block';
        }
        base64Data = e.target.result; 
    };
    reader.readAsDataURL(file);
}

async function generateImage() {
    const apiKey = document.getElementById('api-key').value.trim();
    const modelId = document.getElementById('model-id').value.trim();
    const errorDiv = document.getElementById('error-msg');
    
    errorDiv.style.display = 'none';
    errorDiv.innerText = '';

    if (!apiKey) { alert("请输入 API Key"); return; }
    if (!base64Data) { alert("请先上传一张图片"); return; }

    const btn = document.getElementById('btn-generate');
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
            errorDiv.innerText += " (检测到跨域错误，请确认已开启 Allow CORS 插件)";
        }
    } finally {
        btn.disabled = false;
        loading.style.display = 'none';
    }
}
