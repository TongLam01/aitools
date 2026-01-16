// 1. 权限锁定：只允许在你的域名下运行
const ALLOWED_DOMAINS = ['aibox6.com', 'www.aibox6.com', 'localhost'];
if (!ALLOWED_DOMAINS.includes(window.location.hostname)) {
    console.error("Domain unauthorized. Please visit aibox6.com");
}

const GZH_PROMPTS = {
    // 2. 核心人格：去AI味、公众号调性
    system: `你是一位公众号资深主编。要求：
1. 严禁使用'总之'、'综上所述'、'不仅...而且'等典型AI转折词。
2. 采用短句，口语化，像真人一样思考。
3. 拒绝说教，风格要自然、有穿透力。`,

    // 3. 全文生成逻辑
    generate: (data) => {
        let styleInstruction = "";
        // 优先级：参考风格 > 选择风格
        if (data.referenceStyle && data.referenceStyle.trim() !== "") {
            styleInstruction = `【核心要求】请深度模仿以下参考风格进行创作：\n${data.referenceStyle}`;
        } else {
            const styleMap = {
                'emotional': '文风：情感共鸣型（走心、温暖、老友交心）。',
                'dry_goods': '文风：干货分享型（专业、逻辑清晰、实操性强）。',
                'sharp': '文风：犀利文风型（有态度、不平庸、引起反思）。',
                'none': '文风：自然风格。'
            };
            styleInstruction = styleMap[data.style] || "";
        }

        return `
主题：${data.topic}
${styleInstruction}
写作素材（字数不少于150字）：
${data.material}
写作禁忌：${data.taboos || "无"}
生成篇幅：${data.lengthRange}

请直接输出正文，不要任何开场白。`;
    },

    // 4. 原子化块编辑逻辑 (核心交互)
    blockAction: (action, context, originalContent) => {
        const actions = {
            'rewrite': '在不改变原意的前提下，换一种更生动、更自然的说法重写这段话。',
            'polish': '润色这段话，优化遣词造句，使其更有质感和感染力。',
            'compress': '精简这段话，删掉废话，保留最核心的干货信息。',
            'expand': '扩写这段话，增加细节描述或情感铺垫，使其更充实。'
        };
        return `上下文背景：${context}\n\n当前这段话：${originalContent}\n\n你的任务：${actions[action]}\n注意：只返回修改后的文字，严禁废话。`;
    }
};
