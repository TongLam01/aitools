// 限制域名访问
if (!['aibox6.com', 'www.aibox6.com', 'localhost'].includes(window.location.hostname)) {
    console.error("Domain unauthorized.");
}

const GZH_PROMPTS = {
    system: `你是一位深谙中文互联网传播规律的公众号主编。你的文字风格：自然、有穿透力、拒绝空洞。
【核心禁令】
严禁使用：'总之'、'综上所述'、'在当今时代'、'不仅...而且'、'值得注意的是'等陈旧的AI转折词。
【写作要求】
1. 使用短句，增加阅读节奏感。
2. 情感要真诚，干货要扎实，犀利要到位。
3. 模仿人类的思维跳跃，适当使用比喻和口语化表达。`,

    generate: (data) => {
        let styleSection = "";
        if (data.referenceStyle && data.referenceStyle.trim() !== "") {
            styleSection = `【第一优先级：参考风格】请深度模仿以下文本的语气、节奏和用词风格：\n"${data.referenceStyle}"`;
        } else {
            const styleMap = {
                'emotional': '【风格：情感共鸣型】多用第二人称“你”，注重情绪渲染，像老友交心。',
                'dry_goods': '【风格：干货分享型】逻辑极其严密，多用数据或具体案例，排版多用1.2.3.序号。',
                'sharp': '【风格：犀利文风型】观点鲜明，敢于挑战常规，语言有力量感，带一点幽默。',
                'none': '【风格：无要求型】自然输出，不做过多修饰。'
            };
            styleSection = styleMap[data.style] || "";
        }

        return `
【主题】：${data.topic}
${styleSection}
【必须包含的写作素材】：
${data.material}
【写作禁忌】：${data.taboos || "无"}
【目标篇幅】：${data.lengthRange}

请开始撰写正文。直接输出内容，不要任何开场白。每段话之后请换行。`;
    },

    blockAction: (action, context, originalContent) => {
        const actions = {
            'rewrite': '请用更具文学性或更自然的口吻重写这段话，保持意思不变。',
            'polish': '请润色这段话，优化动词和形容词，使其读起来更有质感。',
            'compress': '请极简缩减这段话，只保留核心观点，去除水分。',
            'expand': '请在现有基础上扩写，增加细节、比喻或例证，使其更丰满。'
        };
        return `上下文背景：${context}\n\n当前目标段落：${originalContent}\n\n操作：${actions[action]}\n注意：仅返回修改后的段落内容，严禁废话。`;
    }
};
