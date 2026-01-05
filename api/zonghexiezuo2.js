/**
 * api/zonghexiezuo.js - 优化版本
 * 5个工具：文风转换、提炼要点、纠错建议、一键续写、思维大纲
 */
export const config = { 
    runtime: 'edge',
    maxDuration: 60
};

// 工具配置
const TOOL_CONFIGS = {
    'style': { 
        role: '资深文字工作者，精通各类文体风格转换', 
        prompt: `请理解以下文本的场景和意图，提供两种不同文风的改写版本：

## 版本一：公文体
将内容改写为正式、规范的公文风格。要求：
- 语言庄重、准确、简练
- 结构清晰，层次分明
- 使用规范的公文用语
- 适当使用"关于""为了""根据""特此"等公文惯用词

## 版本二：润色版
在保持原意的基础上对原文进行润色优化。要求：
- 保持非正式的自然语气
- 优化语句通顺度和可读性
- 修正语病和表达不当之处
- 使文字更加流畅优美

请用清晰的分隔标注两个版本。` 
    },
    'extract': { 
        role: '信息提炼专家，擅长快速抓取核心要点', 
        prompt: `请对以下文本进行核心要点提炼。要求：

1. **一句话概括**：用一句话概括全文核心内容
2. **关键要点**：以条目形式列出核心观点/要点
   - 每条要点控制在 20 字以内
   - 按重要性排序
   - 使用简洁有力的表述
3. **关键词**：提取 3-5 个关键词

输出格式清晰，便于快速阅读和理解。` 
    },
    'check': { 
        role: '资深校对编辑，精通文字规范和政策敏感度把控', 
        prompt: `请对以下文本进行全面校对，从以下维度进行排查并提出具体修改建议：

## 1. 逻辑表达
- 检查是否存在前后矛盾、逻辑不通之处
- 指出表述模糊或歧义的地方

## 2. 用词规范
- 检查错别字、词语搭配不当
- 指出口语化或不规范用词
- 检查成语使用是否正确

## 3. 政治敏感度
- 排查可能存在的政治敏感表述
- 检查是否有不当类比或隐喻
- 提示需要注意的措辞

## 4. 标点符号
- 检查标点使用是否规范
- 指出漏用、误用的标点

请对每个发现的问题：
1. 引用原文问题处
2. 说明问题类型
3. 给出具体修改建议` 
    },
    'continue': { 
        role: '资深写手，能够准确把握文风和意图进行续写（注意是续写不是改写）', 
        prompt: `请仔细分析以下文本的：
1. 写作场景和目的
2. 语言风格和语气
3. 行文逻辑和结构

然后进行自然、流畅的续写。要求：
- 保持与原文一致的人称、时态、语气
- 续写内容与原文逻辑连贯、衔接自然
- 不要出现风格断层
- 直接输出续写内容，无需解释` 
    },
    'mindmap': { 
        role: '结构化思维专家，擅长信息架构和知识图谱构建', 
        prompt: `请将以下内容提炼为可视化的思维导图大纲。

【输出格式要求】
使用 Markdown 缩进格式，呈现清晰的树状结构：

# 🎯 核心主题
## 📌 一级分支1
   - 二级要点
      - 三级细节
   - 二级要点
## 📌 一级分支2
   - 二级要点
   - 二级要点
      - 三级细节
      - 三级细节

【内容要求】
1. 提炼核心主题作为根节点
2. 归纳一级分支（主要观点/维度）
3. 根据一级分支展开二级要点
4. 必要时可有三级细节，但不超过三级
5. 每个节点精简到 5-15 字
6. 使用 emoji 图标增强视觉区分
7. 相关联的概念可用 → 或 ↔ 标注关系

【禁止事项】
- 不要使用 1. 1.1 1.1.1 这种编号格式
- 不要输出大段解释文字
- 不要遗漏原文的关键信息` 
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
    // 处理 CORS 预检请求
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
    
    // 生产环境下检查来源
    if (process.env.NODE_ENV === 'production' && origin && !ALLOWED_ORIGINS.includes(origin)) {
        return new Response(JSON.stringify({ error: 'Unauthorized Domain' }), { 
            status: 403,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const body = await req.json();
        const { message, userKey, model, toolId, temperature = 0.4 } = body;

        // 参数验证
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
        const beijingDate = new Date().toLocaleString("zh-CN", { 
            timeZone: "Asia/Shanghai",
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            weekday: 'long'
        });

        // 构建系统提示词
        const systemPrompt = `你是一位${toolConfig.role}。

当前时间：${beijingDate}

【核心输出规范】
1. 直接输出 Markdown 格式的结果
2. 不要有任何自我介绍、开场白或总结语
3. 严禁出现空括号 "()" 或 "（）"
4. 只有当关键信息完全缺失且无法推断时，才使用 [待填充]
5. 保持专业性的同时确保可读性

【任务说明】
${toolConfig.prompt}`;

        // 调用 DeepSeek API
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
                    { role: "user", content: `请处理以下素材：\n\n${message}` }
                ],
                stream: true,
                temperature: Math.min(Math.max(parseFloat(temperature) || 0.4, 0), 1),
                max_tokens: 8192
            })
        });

        // 检查 API 响应
        if (!response.ok) {
            const errorBody = await response.text();
            let errorMessage = `API 错误 (${response.status})`;
            
            try {
                const errorJson = JSON.parse(errorBody);
                errorMessage = errorJson.error?.message || errorMessage;
            } catch (e) {
                errorMessage = errorBody || errorMessage;
            }
            
            // 特殊处理常见错误
            if (response.status === 401) {
                errorMessage = 'API Key 无效，请检查配置';
            } else if (response.status === 429) {
                errorMessage = '请求过于频繁，请稍后重试';
            } else if (response.status === 402) {
                errorMessage = 'API 余额不足，请充值';
            }
            
            return errorResponse(errorMessage, response.status, origin);
        }

        // 创建流式响应
        const stream = new ReadableStream({
            async start(controller) {
                const reader = response.body.getReader();
                const encoder = new TextEncoder();
                
                // 心跳定时器，防止连接超时
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

// 辅助函数：生成错误响应
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

// 辅助函数：获取 CORS 头
function getCorsHeaders(req) {
    const origin = req.headers.get("origin");
    return {
        'Access-Control-Allow-Origin': origin || '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400'
    };
}
