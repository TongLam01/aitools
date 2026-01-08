/**
 * api/zonghexiezuo.js - 针对 DeepSeek R1 优化版本
 */
export const config = { 
    runtime: 'edge',
    maxDuration: 60
};

// 工具配置 - 针对 R1 特性优化
const TOOL_CONFIGS = {
    'style': { 
        role: '资深文字工作者', 
        prompt: `你的任务是【文风转换】，提供两个版本的改写。

请严格按以下格式输出：

---

## 📜 版本一：公文体

（在此输出公文风格的改写，要求：语言庄重、用词考究、结构清晰、使用公文用语）

---

## ✨ 版本二：普通版

（在此输出润色后的版本，要求：保持原文语气、优化表达流畅度、修正语病）

---

【重要约束】
- 必须充分理解原文的意图
- 必须输出两个版本，用分隔线区分
- 两个版本都要完整，不要省略
- 直接输出结果，不要解释你在做什么` 
    },
    'extract': { 
        role: '信息提炼专家', 
        prompt: `你的任务是【提炼要点】，不是改写或润色。

请严格按以下格式输出：

---

**📌 一句话概括**
（用1句话概括全文核心，不超过80字）

**🎯 核心要点**（需要列出序号）
1. （要点1，不超过30字）
2. （要点2，不超过30字）
3. （要点3，如有，不超过30字）
4. （要点4，如有，不超过30字）
5. （要点5，如有，不超过30字）
6. （要点6，如有，不超过30字）
依次类推…
**🏷️ 关键词**
关键词1 | 关键词2 | 关键词3| 关键词4（如有）

---

【重要约束】
- 你只提炼，绝对不改写原文
- 要点必须来自原文，不能自己编造
- 每条要点必须精简到30字以内
- 要点数量根据实际文本输出，一般不要超过6条
- 直接输出结果，不要解释你在做什么` 
    },
    'check': { 
        role: '资深校对编辑', 
        prompt: `你的任务是【校对纠错】，找出问题并给出修改建议。

请严格按以下格式输出：

---

## 🔍 发现的问题

### 1️⃣ 问题类型：（逻辑/用词/敏感/标点）
- **原文**："（引用原文问题处）"
- **问题**：（说明问题）
- **建议**：（给出修改建议）

### 2️⃣ 问题类型：（逻辑/用词/敏感/标点）
- **原文**："（引用原文问题处）"
- **问题**：（说明问题）
- **建议**：（给出修改建议）

（继续列出其他问题...）

---

## ✅ 总体评价
（1-2句话总结文本质量）

---

【检查维度】
1. 逻辑表达：前后矛盾、表述模糊
2. 用词规范：错别字、搭配不当、口语化
3. 政治敏感：敏感表述、不当类比
4. 标点符号：漏用、误用

【重要约束】
- 必须引用原文问题处
- 每个问题必须给出具体修改建议
- 如果没有发现问题，明确说明"未发现明显问题"
- 直接输出结果，不要解释你在做什么` 
    },
    'continue': { 
        role: '资深写手', 
        prompt: `你的任务是【续写】，根据原文风格自然延续。

【续写前分析】（内部思考，不要输出）
1. 这是什么类型的文本？
2. 使用什么人称和时态？
3. 语气是正式还是轻松？
4. 接下来应该写什么内容？

【输出要求】
- 直接输出续写内容，不要任何标题或解释
- 续写要与原文无缝衔接
- 保持相同的人称、时态、语气
- 篇幅大致与原文相当（不要太短也不要太长）
- 内容要有实质性推进，不要原地打转` 
    },
    'mindmap': { 
        role: '思维导图专家', 
        prompt: `你的任务是生成【树状思维导图】。

请严格按以下Markdown格式输出：

---

# 🎯 （核心主题，5-15字）

## 📌 （分支1名称，5-15字）
- （要点A，5-15字）
- （要点B，5-15字）
  - （细节，如有）

## 📌 （分支2名称，5-15字）
- （要点A，5-15字）
- （要点B，5-15字）

## 📌 （分支3名称，5-15字）
- （要点A，5-15字）
- （要点B，5-15字）
依次类推…
---

【格式硬性要求】
- 必须使用 # 表示核心主题
- 必须使用 ## 表示一级分支
- 必须使用 - 表示二级要点
- 必须使用缩进的 - 表示三级细节
- 必须使用 emoji 图标（🎯📌✅💡🔑📊）
- 绝对禁止使用 1.1、1.1.1 这种编号
- 绝对禁止输出大段解释文字
- 分支数量根据实际内容确定
- 如用户输入内容过短无法提炼，直接建议用户提供更丰富的/结构化的信息
` 
    }
};

// CORS 配置
const ALLOWED_ORIGINS = [
    "https://www.aibox6.com", 
    "https://aibox6.com", 
    "http://localhost:3000",
    "http://localhost:5173"
];

export default async function handler(req) {
    if (req.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: getCorsHeaders(req)
        });
    }
    
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { 
            status: 405,
            headers: { 'Content-Type': 'application/json', ...getCorsHeaders(req) }
        });
    }
    
    const origin = req.headers.get("origin");
    
    if (process.env.NODE_ENV === 'production' && origin && !ALLOWED_ORIGINS.includes(origin)) {
        return new Response(JSON.stringify({ error: 'Unauthorized Domain' }), { 
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await req.json();
        const { message, userKey, model, toolId, temperature = 0.4 } = body;

        if (!message || typeof message !== 'string') {
            return errorResponse('缺少必要参数: message', 400, origin);
        }
        
        if (!userKey || typeof userKey !== 'string') {
            return errorResponse('缺少必要参数: userKey', 400, origin);
        }
        
        if (message.length > 50000) {
            return errorResponse('内容过长，请控制在 50000 字以内', 400, origin);
        }

        const toolConfig = TOOL_CONFIGS[toolId] || TOOL_CONFIGS['style'];
        
        // 针对 R1 优化的系统提示词 - 更简洁、更直接
        const systemPrompt = `你是${toolConfig.role}。

${toolConfig.prompt}`;

        const response = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${userKey}` 
            },
            body: JSON.stringify({
                model: model || "deepseek-reasoner",
                messages: [
                    { role: "system", content: systemPrompt }, 
                    { role: "user", content: message }
                ],
                stream: true,
                temperature: Math.min(Math.max(parseFloat(temperature) || 0.4, 0), 1),
                max_tokens: 8192
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            let errorMessage = `API 错误 (${response.status})`;
            
            try {
                const errorJson = JSON.parse(errorBody);
                errorMessage = errorJson.error?.message || errorMessage;
            } catch (e) {
                errorMessage = errorBody || errorMessage;
            }
            
            if (response.status === 401) {
                errorMessage = 'API Key 无效，请检查配置';
            } else if (response.status === 429) {
                errorMessage = '请求过于频繁，请稍后重试';
            } else if (response.status === 402) {
                errorMessage = 'API 余额不足，请充值';
            }
            
            return errorResponse(errorMessage, response.status, origin);
        }

        const stream = new ReadableStream({
            async start(controller) {
                const reader = response.body.getReader();
                const encoder = new TextEncoder();
                
                const heartbeatInterval = setInterval(() => {
                    try { 
                        controller.enqueue(encoder.encode(': heartbeat\n\n')); 
                    } catch(e) {
                        clearInterval(heartbeatInterval);
                    }
                }, 15000);
                
                try {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) {
                            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                            break;
                        }
                        controller.enqueue(value);
                    }
                } catch (err) {
                    const errorEvent = `data: ${JSON.stringify({ error: { message: err.message } })}\n\n`;
                    controller.enqueue(encoder.encode(errorEvent));
                } finally {
                    clearInterval(heartbeatInterval);
                    controller.close();
                }
            }
        });

        return new Response(stream, { 
            headers: { 
                'Content-Type': 'text/event-stream', 
                'Cache-Control': 'no-cache, no-store, must-revalidate', 
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no',
                ...getCorsHeaders(req)
            } 
        });

    } catch (error) {
        console.error('Handler error:', error);
        return errorResponse(error.message || '服务器内部错误', 500, req.headers.get("origin"));
    }
}

function errorResponse(message, status, origin) {
    return new Response(
        JSON.stringify({ error: { message, status } }), 
        { 
            status,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': origin || '*'
            } 
        }
    );
}

function getCorsHeaders(req) {
    const origin = req.headers.get("origin");
    return {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
    };
}
