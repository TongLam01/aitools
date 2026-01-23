/**
 * Vercel Serverless Function
 * 路径: /api/proxy.js
 */
export default async function handler(req, res) {
    // 1. 设置跨域头，允许你的域名访问
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    const { url } = req.body;
    const authHeader = req.headers.authorization;

    // 2. 心跳/超时保护机制 (Vercel 10s 限制)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9500); 

    try {
        const targetUrl = 'https://metaso.cn/api/v1/reader';
        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ url: url }),
            signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            const errText = await response.text();
            return res.status(response.status).json({ error: `Metaso API Error: ${errText}` });
        }
        const textResult = await response.text();
        return res.status(200).json({ result: textResult });
    } catch (error) {
        if (error.name === 'AbortError') return res.status(504).json({ error: '请求超时，目标网页解析过慢。' });
        return res.status(500).json({ error: error.message });
    }
}