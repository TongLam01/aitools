// api/proxy.js
// 这是一个运行在 Vercel 服务器端的代码，用于转发图片并解决跨域问题

export default async function handler(req, res) {
  const { url } = req.query;

  if (!url) {
    return res.status(400).send('Missing "url" parameter');
  }

  try {
    // 1. Vercel 服务器去请求火山引擎的图片
    // (服务器之间请求不受 CORS 限制)
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    // 2. 获取图片数据
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. 转发给你的前端，并强行加上“允许跨域”的头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', response.headers.get('content-type') || 'image/png');
    
    // 设置缓存，提升体验
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');

    res.send(buffer);

  } catch (error) {
    console.error("Proxy error:", error);
    res.status(500).send('Error fetching image');
  }
}
