/**
 * AI 分析提示词模块
 * www.aibox6.com
 * 
 * 版权所有，仅授权在 aibox6.com 域名下使用
 */

(function() {
    'use strict';
    
    // ===== 域名验证 =====
    const ALLOWED_DOMAINS = [
        'www.aibox6.com',
        'aibox6.com',
        'localhost',
        '127.0.0.1'
    ];
    
    const ALLOWED_DOMAIN_PATTERNS = [
        /^.*\.aibox6\.com$/,           // 所有 aibox6.com 子域名
        /^.*--.*\.vercel\.app$/,       // Vercel 预览部署
        /^localhost(:\d+)?$/,          // 本地开发
        /^127\.0\.0\.1(:\d+)?$/        // 本地 IP
    ];
    
    /**
     * 验证当前域名是否被授权
     */
    function validateDomain() {
        const hostname = window.location.hostname;
        const port = window.location.port;
        const fullHost = port ? `${hostname}:${port}` : hostname;
        
        // 检查精确匹配
        if (ALLOWED_DOMAINS.includes(hostname)) {
            return true;
        }
        
        // 检查模式匹配
        for (const pattern of ALLOWED_DOMAIN_PATTERNS) {
            if (pattern.test(hostname) || pattern.test(fullHost)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * 域名验证失败时的处理
     */
    function handleUnauthorizedDomain() {
        console.error('[PromptBuilder] 未授权的域名:', window.location.hostname);
        
        // 显示警告
        const warningDiv = document.createElement('div');
        warningDiv.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.9);
            color: #ff4444;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 99999;
            font-family: system-ui, sans-serif;
            text-align: center;
            padding: 20px;
        `;
        warningDiv.innerHTML = `
            <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
            <h1 style="font-size: 24px; margin-bottom: 10px;">未授权使用</h1>
            <p style="font-size: 14px; color: #999; max-width: 400px;">
                本程序仅授权在 aibox6.com 域名下使用。<br>
                如需使用，请访问 <a href="https://www.aibox6.com" style="color: #7c5cff;">www.aibox6.com</a>
            </p>
        `;
        document.body.appendChild(warningDiv);
        
        // 返回假的构建器
        return {
            build: () => '域名未授权，无法生成分析提示词。请访问 www.aibox6.com 使用正版服务。',
            buildSimple: () => '域名未授权'
        };
    }
    
    // ===== 执行域名验证 =====
    if (!validateDomain()) {
        window.PromptBuilder = handleUnauthorizedDomain();
        return;
    }
    
    // ===== 正式的提示词构建器 =====
    window.PromptBuilder = {
        
        // 版本信息
        version: '1.0.0',
        domain: 'aibox6.com',
        
        /**
         * 构建完整分析提示词
         * @param {Object} params - 参数对象
         * @param {Object} params.stock - 股票基础信息
         * @param {Object} params.indicators - 技术指标
         * @param {Object} params.enhancedData - 增强数据（财务、评级、公告、北向）
         * @param {number} params.dataConfidence - 数据完整度
         * @param {Object} params.formatters - 格式化函数集合
         * @returns {string} 提示词
         */
        build: function({ stock, indicators, enhancedData, dataConfidence, formatters }) {
            // 二次验证
            if (!validateDomain()) {
                return '域名验证失败';
            }
            
            const fmt = formatters;
            const ed = enhancedData || {};
            const now = new Date().toLocaleString('zh-CN', { hour12: false });
            
            let prompt = `## 分析任务
请以资深证券分析师的视角，对【${stock.name}（${stock.code}）】进行全面深度分析。

**分析时间**：${now}
**数据完整度**：${dataConfidence}%

---

## 一、基础行情数据

| 指标 | 数值 | 说明 |
|------|------|------|
| 现价 | ${fmt.price(stock.price)} | 最新成交价 |
| 涨跌幅 | ${stock.change}% | 今日涨跌 |
| 市盈率(PE) | ${fmt.ratio(stock.pe)} | 动态市盈率 |
| 市净率(PB) | ${fmt.ratio(stock.pb)} | - |
| 总市值 | ${fmt.cap(stock.totalCap)} | - |
| 所属板块 | ${stock.sector || '未知'} | 行业分类 |
| 换手率 | ${fmt.forAI(stock.turnover)}% | 今日换手 |
| 量比 | ${fmt.forAI(stock.volRatio)} | 相对成交量 |

---

## 二、技术指标分析

| 指标 | 数值 | 参考意义 |
|------|------|----------|
| MA20 | ${fmt.forAI(indicators.ma20)} | 20日均线，短期趋势 |
| MA60 | ${fmt.forAI(indicators.ma60)} | 60日均线，中期趋势 |
| RSI(6) | ${fmt.forAI(indicators.rsi)} | <30超卖，>70超买 |
| MACD DIF | ${indicators.macd?.dif || '-'} | 快线 |
| MACD DEA | ${indicators.macd?.dea || '-'} | 慢线 |

`;

            // 添加财务数据
            if (ed.financials) {
                prompt += `
---

## 三、财务数据（报告期：${ed.financials.reportDate || '最新'}）

| 指标 | 数值 | 行业参考 |
|------|------|----------|
| 营收同比增长 | ${fmt.change(ed.financials.revenueYoY)} | 反映成长性 |
| 净利润同比 | ${fmt.change(ed.financials.netProfitYoY)} | 盈利能力变化 |
| 毛利率 | ${fmt.percent(ed.financials.grossMargin)} | 产品竞争力 |
| ROE（加权） | ${fmt.percent(ed.financials.roe)} | 股东回报率 |
| 资产负债率 | ${fmt.percent(ed.financials.debtRatio)} | 财务风险 |

`;
            }

            // 添加机构评级
            if (ed.ratings?.length) {
                prompt += `
---

## 四、机构研究评级

| 研究机构 | 最新评级 | 目标价 | 评级日期 |
|----------|----------|--------|----------|
${ed.ratings.map(r => `| ${r.org || '-'} | ${r.rating || '-'} | ${r.targetPrice || '-'} | ${r.date || '-'} |`).join('\n')}

`;
            }

            // 添加公司公告
            if (ed.announcements?.length) {
                prompt += `
---

## 五、近期重要公告

${ed.announcements.map(a => `- **[${a.date}]** ${a.title}`).join('\n')}

`;
            }

            // 添加北向资金
            if (ed.northbound) {
                prompt += `
---

## 六、北向资金动态

| 指标 | 数值 | 说明 |
|------|------|------|
| 持股占流通比 | ${fmt.percent(ed.northbound.ratio)} | 外资持仓占比 |
| 近期持仓变动 | ${ed.northbound.changeRatio > 0 ? '+' : ''}${ed.northbound.changeRatio?.toFixed(2) || '-'}% | 近20个交易日 |

`;
            }

            // 输出格式要求
            prompt += `
---

## 输出要求

请严格按照以下格式输出专业分析报告：

### 📊 投资评级

| 项目 | 结论 |
|------|------|
| **综合评级** | [强烈买入/买入/持有/观望/卖出] |
| **目标价格** | XX.XX 元 |
| **评级置信度** | [高/中/低]（基于数据完整度 ${dataConfidence}%） |
| **投资周期** | [短线/中线/长线] |

### 📈 核心投资逻辑

请列出 3 个最重要的投资要点：

1. **[要点标题]**
   - 具体分析内容...

2. **[要点标题]**
   - 具体分析内容...

3. **[要点标题]**
   - 具体分析内容...

### 💰 估值分析

- **当前估值水平**：[高估/合理/低估]
- **估值依据**：
  - PE 与行业对比分析
  - PB 与历史分位分析
  - 其他估值方法（如适用）

### 📉 技术面研判

- **趋势判断**：[上升趋势/下降趋势/震荡整理]
- **关键支撑位**：XX.XX 元（依据：...）
- **关键压力位**：XX.XX 元（依据：...）
- **短期走势预判**：...

### 🏦 资金面分析

- **主力资金动向**：...
- **北向资金解读**：...（如有数据）
- **筹码结构判断**：...

### ⚠️ 风险提示

请列出 2-3 个主要风险因素：

1. **[风险类型]**：具体风险描述...
2. **[风险类型]**：具体风险描述...
3. **[风险类型]**：具体风险描述...

### 🎯 操作策略建议

| 策略项 | 建议 |
|--------|------|
| **建仓区间** | XX.XX - XX.XX 元 |
| **止损位置** | XX.XX 元（跌幅 X%） |
| **第一目标** | XX.XX 元（涨幅 X%） |
| **第二目标** | XX.XX 元（涨幅 X%） |
| **仓位建议** | XX%（原因：...） |

---

**重要声明**：
1. 本分析基于公开数据，不构成投资建议
2. 如数据不足，请明确指出并说明对分析结论的影响
3. 投资有风险，入市需谨慎

---
*分析由 AI 生成 · www.aibox6.com*
`;

            return prompt;
        },
        
        /**
         * 获取简化版提示词（用于快速分析）
         */
        buildSimple: function({ stock, formatters }) {
            if (!validateDomain()) {
                return '域名验证失败';
            }
            
            const fmt = formatters;
            return `请简要分析 ${stock.name}（${stock.code}），现价 ${fmt.price(stock.price)}，涨跌 ${stock.change}%。
给出：1. 短期趋势判断 2. 关键支撑/压力位 3. 操作建议（一句话）`;
        }
    };
    
    console.log('[PromptBuilder] 模块加载成功 - www.aibox6.com');
    
})();