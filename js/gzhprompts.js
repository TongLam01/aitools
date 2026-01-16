const GZH_PROMPTS = {
    // 1. 核心人格：去AI味、公众号调性
    system: `你是一位公众号资深主编。
【文风要求】
1. 严禁使用'总之'、'综上所述'、'不仅...而且'等典型AI转折词。
2. 采用短句，口语化，像真人一样思考。
3. 拒绝说教，风格要自然、有穿透力。
4. 生成质量必须超越用户提供的任何素材文本。
5. 排版友好，适当使用换行。但除非是特殊文体，否则尽量避免单独一句话成为一个段落。
6. 【关键规则】：**每个自然段的结尾必须使用标点符号，严禁省略标点**。`,

    // 2. 全文生成逻辑
    generate: (data) => {
        let styleInstruction = "";
        // 优先级：参考文风 > 选择风格
        if (data.referenceStyle && data.referenceStyle.trim() !== "") {
            styleInstruction = `【核心要求】请深度模仿以下参考文风（语气、节奏、用词）：\n"${data.referenceStyle}"`;
        } else {
            const styleMap = {
                'emotional': '文风：情感共鸣型（走心、温暖、老友交心）。',
                'dry_goods': '文风：干货分享型（专业、逻辑清晰、实操性强）。',
                'sharp': '文风：犀利文风型（有态度、不平庸、一针见血、引起反思）。',
                'none': '文风：自然流畅、克制。'
            };
            styleInstruction = styleMap[data.style] || "";
        }

        return `
主题：${data.topic}
${styleInstruction}
写作素材：
${data.material}
补充要求（禁忌）：${data.taboos || "无"}
篇幅要求：${data.lengthRange}

请直接输出正文，不要任何开场白。除非必要，否则尽量避免一句话就是一段`;
    },

    // 3. 原子化块编辑逻辑 (含上下文感知)
    blockAction: (action, originalContent, prevContext, nextContext) => {
        const actions = {
            'rewrite': '基于原意，不改变原意，换一种说法重写这段话。',
            'polish': '润色这段话，优化遣词造句，使其更有质感和感染力。',
            'compress': '精简这段话，删掉冗余表达，保留最核心的信息。',
            'expand': '识别这段话的主旨，基于主旨进行扩写，使其更充实，注意不要为了扩写而扩写。'
        };

        return `你正在修改一篇文章的中间段落。为了保证连贯性，我提供了上下文供参考。

【前文参考】：...${prevContext}
【后文参考】：${nextContext}...

【当前需要修改的段落】：
"${originalContent}"

【你的任务】：${actions[action]}

注意：
1. 必须根据上下文调整语气，确保与前后文衔接自然。
2. **修改后的段落结尾必须有标点符号（句号）。**
3. 只返回修改后的【当前段落】，不要包含前后文，不要解释。`;
    }
};
