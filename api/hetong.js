// api/hetong.js
export default async function handler(req, res) {
    // --- 1. 安全校验 (www.aibox6.com & aibox6.com) ---
    const allowedOrigins = ["https://www.aibox6.com", "https://aibox6.com"];
    const origin = req.headers.origin;
    const referer = req.headers.referer;

    const isAllowed = allowedOrigins.includes(origin) || 
                      (referer && allowedOrigins.some(d => referer.startsWith(d)));

    if (!isAllowed) {
        return res.status(403).json({ error: "Access Denied" });
    }

    if (origin && allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    // --- 2. 获取当前日期 (北京时间) ---
    const beijingDate = new Date().toLocaleString("zh-CN", {
        timeZone: "Asia/Shanghai",
        year: 'numeric', month: 'long', day: 'numeric'
    });

    // --- 3. 核心 Prompt 隐藏 ---
    const SYSTEM_PROMPT = `你是一位拥有 20 年执业经验、以“毒辣、严谨、实战派”著称的顶尖商事律师。你审阅合同不仅关注文字的逻辑，更擅长像外科医生一样进行“穿透式诊断”——不仅看合同“说了什么（名）”，更看合同“想干什么（实）”
当前日期：${beijingDate}。

【审查方法论：三层扫描体系】
1. 第一层：宏观结构审查（核心器官：合法合规、主体资格、标的、价款、违约、解除、管辖等）。
2. 第二层：微观细节审查（显微镜排查：术语一致、时间颗粒度、被动语态陷阱、触发条件量化、黑洞条款、送达证据链等）。
3. 第三层：穿透式 X 光扫描（实质风险识别：变相融资、变相劳动、变相担保、变相排他等）。

【输出格式要求】
必须严格遵守：
## 1. 核心效力与合规诊断（表格）；同时，一些金额、日期、甲乙方名称这种空出来的地方，通常是由于脱敏要求特意空出来的，无需对此提出效力质疑。
## 2. 穿透式实质风险报告（X-Ray Report 表格，揭露“名”与“实”）
## 3. 逐条细节清单与修订方案（表格，提供修订后的直接可用文本）
## 4. 缺失条款补充建议
## 5. 律师最后总结

请直接显示诊断内容，不要包含律师落款或个人签名。`;

    const { messages, userKey, model } = req.body;

    const finalMessages = [
        { role: "system", content: SYSTEM_PROMPT },
        ...messages
    ];

    try {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.write(': heartbeat\n\n'); // 防止 Vercel 免费版超时

        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${userKey}`
            },
            body: JSON.stringify({
                model: model || "deepseek-reasoner",
                messages: finalMessages,
                stream: true,
                temperature: 0.3 // 合同诊断需要更低的随机性，保持严谨
            })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error?.message || "AI 接口调用失败");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(value);
        }
        res.end();

    } catch (error) {
        res.write(`data: {"error": "${error.message}"}\n\n`);
        res.end();
    }

}
