// 配置
const Config = {
    colors: ['#07c160', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'],
    bgs: [
        { id: 'none', val: null, pv: null },
        { id: 'warm', val: '#fffbf5', pv: '#fffbf5' },
        { id: 'cool', val: '#f8fafc', pv: '#f8fafc' },
        { id: 'green', val: '#f6fef9', pv: '#f6fef9' },
        { id: 'blue', val: '#f0f7ff', pv: '#f0f7ff' },
        { id: 'purple', val: '#faf5ff', pv: '#faf5ff' },
        { id: 'g1', val: 'linear-gradient(180deg,#fdf6f0 0%,#fffdfb 100%)', pv: 'linear-gradient(180deg,#fdf6f0,#fffdfb)' },
        { id: 'g2', val: 'linear-gradient(180deg,#f0f5ff 0%,#fffeff 100%)', pv: 'linear-gradient(180deg,#f0f5ff,#fffeff)' }
    ]
};

// 工具函数
const U = {
    rgba(hex, a) {
        const r = parseInt(hex.slice(1,3), 16);
        const g = parseInt(hex.slice(3,5), 16);
        const b = parseInt(hex.slice(5,7), 16);
        return `rgba(${r},${g},${b},${a})`;
    },
    parseNum(t) {
        const m = t.match(/^(\d+|[一二三四五六七八九十]+)[.、\s]\s*(.*)$/);
        return m ? { n: m[1], t: m[2] } : { n: '', t };
    },
    fmt(t) {
        return t.split('\n').filter(l => l.trim()).map(l => `<p style="margin:0;padding:0">${l}</p>`).join('');
    },
    // 基础样式：确保宽度和盒模型正确
    base: 'box-sizing:border-box;width:100%;'
};

// 样式模板 - 完全兼容微信公众号
// 关键：不使用 inline-block 居中，不使用 position:absolute，使用 table 布局替代
const TPL = {
    big_title: [
        // 样式1：下划线居中 - 使用 text-align:center
        (t, c) => `<section style="${U.base}margin:0 0 20px;padding:0 8px;text-align:center"><section style="display:inline;font-size:20px;font-weight:bold;color:#1f2937;border-bottom:3px solid ${c};padding-bottom:8px">${t}</section></section>`,
        // 样式2：背景色居中
        (t, c) => `<section style="${U.base}margin:0 0 20px;padding:0 8px;text-align:center"><section style="display:inline;font-size:18px;font-weight:bold;color:#fff;background:${c};padding:10px 24px;border-radius:6px">${t}</section></section>`,
        // 样式3：左边框 - 全宽
        (t, c) => `<section style="${U.base}margin:0 0 20px;padding:14px 18px;background:${U.rgba(c,.1)};border-left:6px solid ${c}"><section style="font-size:18px;font-weight:bold;color:${c}">${t}</section></section>`,
        // 样式4：边框居中
        (t, c) => `<section style="${U.base}margin:0 0 20px;padding:0 8px;text-align:center"><section style="display:inline;font-size:18px;font-weight:bold;color:${c};border:2px solid ${c};padding:8px 24px;border-radius:50px">${t}</section></section>`,
        // 样式5：两侧线条 - 使用 table 布局
        (t, c) => `<section style="${U.base}margin:0 0 20px;padding:0 8px"><section style="display:table;width:100%"><section style="display:table-cell;width:50px;vertical-align:middle"><section style="height:2px;background:linear-gradient(to right,transparent,${c})"></section></section><section style="display:table-cell;text-align:center;padding:0 12px;vertical-align:middle"><section style="font-size:19px;font-weight:bold;color:#1f2937">${t}</section></section><section style="display:table-cell;width:50px;vertical-align:middle"><section style="height:2px;background:linear-gradient(to left,transparent,${c})"></section></section></section></section>`,
        // 样式6：渐变背景居中
        (t, c) => `<section style="${U.base}margin:0 0 20px;padding:0 8px;text-align:center"><section style="display:inline;font-size:18px;font-weight:bold;color:#fff;background:linear-gradient(135deg,${c},${U.rgba(c,.7)});padding:12px 28px;border-radius:8px">${t}</section></section>`
    ],
    sub_title: [
        // 样式1：左竖条 - 使用 table 布局
        (t, c) => `<section style="${U.base}margin:10px 0 18px;padding:0 8px"><section style="display:table"><section style="display:table-cell;width:4px;vertical-align:middle"><section style="width:4px;height:18px;background:${c};border-radius:2px"></section></section><section style="display:table-cell;padding-left:10px;vertical-align:middle"><section style="font-size:17px;font-weight:bold;color:#1f2937">${t}</section></section></section></section>`,
        // 样式2：两侧装饰居中
        (t, c) => `<section style="${U.base}margin:16px 0;padding:0 8px;text-align:center"><section style="display:inline;color:${c};font-weight:bold;font-size:16px">✦ ${t} ✦</section></section>`,
        // 样式3：下划线
        (t, c) => `<section style="${U.base}margin:10px 0 18px;padding:0 8px"><section style="display:inline;font-size:17px;font-weight:bold;color:#1f2937;border-bottom:2px solid ${c};padding-bottom:4px">${t}</section></section>`,
        // 样式4：圆点 - 使用 table
        (t, c) => `<section style="${U.base}margin:10px 0 18px;padding:0 8px"><section style="display:table"><section style="display:table-cell;width:8px;vertical-align:middle"><section style="width:8px;height:8px;background:${c};border-radius:50%"></section></section><section style="display:table-cell;padding-left:10px;vertical-align:middle"><section style="font-size:17px;font-weight:bold;color:#1f2937">${t}</section></section></section></section>`,
        // 样式5：背景标签
        (t, c) => `<section style="${U.base}margin:10px 0 18px;padding:0 8px"><section style="display:inline;font-size:16px;font-weight:bold;color:${c};background:${U.rgba(c,.1)};padding:6px 14px;border-radius:4px">${t}</section></section>`
    ],
    num_title: [
        // 样式1：圆形序号 - 使用 table
        (t, c) => { const {n,t:x} = U.parseNum(t); return `<section style="${U.base}margin:10px 0 18px;padding:0 8px"><section style="display:table"><section style="display:table-cell;width:26px;vertical-align:middle"><section style="width:26px;height:26px;background:${c};color:#fff;border-radius:50%;font-size:14px;font-weight:bold;text-align:center;line-height:26px">${n||'1'}</section></section><section style="display:table-cell;padding-left:10px;vertical-align:middle"><section style="font-size:17px;font-weight:bold;color:#1f2937">${x}</section></section></section></section>`; },
        // 样式2：下划线序号 - 使用 table
        (t, c) => { const {n,t:x} = U.parseNum(t); const d = String(n||'1').padStart(2,'0'); return `<section style="${U.base}margin:12px 0 18px;padding:0 8px"><section style="display:table;width:100%;border-bottom:2px solid ${c};padding-bottom:6px"><section style="display:table-cell;vertical-align:bottom"><section style="display:inline;background:${U.rgba(c,.15)};border-left:4px solid ${c};color:#666;font-size:18px;font-weight:bold;padding:4px 12px">${d}</section></section><section style="display:table-cell;padding-left:10px;vertical-align:bottom"><section style="font-size:16px;color:#555">${x}</section></section></section></section>`; },
        // 样式3：卡片序号 - 全宽，不用定位
        (t, c) => { const {n,t:x} = U.parseNum(t); return `<section style="${U.base}margin:16px 0;padding:0 8px"><section style="background:${U.rgba(c,.1)};padding:8px;width:100%;box-sizing:border-box"><section style="background:#fff;border:1px solid ${U.rgba(c,.4)};width:100%;box-sizing:border-box"><section style="display:table;width:100%"><section style="display:table-cell;width:40px;background:${U.rgba(c,.5)};color:#fff;font-weight:bold;font-size:14px;text-align:center;vertical-align:middle">${n||'1'}</section><section style="display:table-cell;padding:12px 14px;vertical-align:middle"><section style="font-size:15px;color:#333;line-height:1.7">${x}</section></section></section></section></section></section>`; },
        // 样式4：空心圆序号
        (t, c) => { const {n,t:x} = U.parseNum(t); return `<section style="${U.base}margin:10px 0 18px;padding:0 8px"><section style="display:table"><section style="display:table-cell;width:26px;vertical-align:middle"><section style="width:26px;height:26px;border:2px solid ${c};color:${c};border-radius:50%;font-size:14px;font-weight:bold;text-align:center;line-height:22px;box-sizing:border-box">${n||'1'}</section></section><section style="display:table-cell;padding-left:10px;vertical-align:middle"><section style="font-size:17px;font-weight:bold;color:#1f2937">${x}</section></section></section></section>`; },
        // 样式5：大数字水印
        (t, c) => { const {n,t:x} = U.parseNum(t); const d = String(n||'1').padStart(2,'0'); return `<section style="${U.base}margin:10px 0 18px;padding:0 8px"><section style="display:table"><section style="display:table-cell;vertical-align:middle"><section style="font-size:28px;font-weight:900;color:${U.rgba(c,.25)};font-family:Arial;line-height:1">${d}</section></section><section style="display:table-cell;padding-left:8px;vertical-align:middle"><section style="font-size:17px;font-weight:bold;color:#1f2937">${x}</section></section></section></section>`; },
        // 样式6：方形序号
        (t, c) => { const {n,t:x} = U.parseNum(t); return `<section style="${U.base}margin:10px 0 18px;padding:0 8px"><section style="display:table"><section style="display:table-cell;width:26px;vertical-align:middle"><section style="width:26px;height:26px;background:${c};color:#fff;border-radius:4px;font-size:14px;font-weight:bold;text-align:center;line-height:26px">${n||'1'}</section></section><section style="display:table-cell;padding-left:10px;vertical-align:middle"><section style="font-size:17px;font-weight:bold;color:#1f2937">${x}</section></section></section></section>`; }
    ],
    grad_title: [
        // 样式1：渐变背景
        (t, c) => `<section style="${U.base}margin:10px 0 18px;padding:0 8px"><section style="display:inline;background:linear-gradient(90deg,${c},${U.rgba(c,.6)});color:#fff;padding:6px 16px;font-size:15px;font-weight:bold;border-radius:4px">${t}</section></section>`,
        // 样式2：左边框背景
        (t, c) => `<section style="${U.base}margin:10px 0 18px;padding:0 8px"><section style="display:inline;background:${U.rgba(c,.1)};border-left:4px solid ${c};padding:8px 14px;color:#1f2937;font-weight:bold;font-size:16px;border-radius:0 6px 6px 0">${t}</section></section>`,
        // 样式3：高亮下划线
        (t, c) => `<section style="${U.base}margin:10px 0 18px;padding:0 8px"><section style="display:inline;font-size:17px;font-weight:bold;color:#1f2937;background:linear-gradient(to top,${U.rgba(c,.35)} 0%,${U.rgba(c,.35)} 40%,transparent 40%);padding:0 4px">${t}</section></section>`,
        // 样式4：右圆角
        (t, c) => `<section style="${U.base}margin:10px 0 18px;padding:0 8px"><section style="display:inline;background:${c};color:#fff;padding:6px 18px 6px 14px;font-size:15px;font-weight:bold;border-radius:4px 20px 20px 4px">${t}</section></section>`
    ],
    // 重点卡、底色卡等 - 全部使用 width:100% 确保居中
    key_point: [
        (t, c) => `<section style="${U.base}margin:20px 0;padding:0 8px"><section style="width:100%;box-sizing:border-box;padding:16px 18px;background:${U.rgba(c,.08)};border:1px solid ${U.rgba(c,.2)};border-radius:8px;font-size:15px;color:#334155;line-height:1.8;text-align:justify">${U.fmt(t)}</section></section>`,
        (t, c) => `<section style="${U.base}margin:20px 0;padding:0 8px"><section style="width:100%;box-sizing:border-box;padding:20px;background:${U.rgba(c,.06)};border:1px solid ${c};border-radius:6px;font-size:15px;color:#334155;line-height:1.8;text-align:justify">${U.fmt(t)}</section></section>`,
        (t, c) => `<section style="${U.base}margin:20px 0;padding:0 8px"><section style="width:100%;box-sizing:border-box;padding:16px 18px;border-left:4px solid ${c};background:#f8fafc;font-size:15px;color:#334155;line-height:1.8;text-align:justify;border-radius:0 8px 8px 0">${U.fmt(t)}</section></section>`,
        (t, c) => `<section style="${U.base}margin:20px 0;padding:0 8px"><section style="width:100%;box-sizing:border-box;padding:16px 18px;background:#fff;border:1px solid #e2e8f0;border-top:3px solid ${c};border-radius:0 0 8px 8px;font-size:15px;color:#334155;line-height:1.8;text-align:justify">${U.fmt(t)}</section></section>`,
        // 带图标 - 使用 table 布局
        (t, c) => `<section style="${U.base}margin:20px 0;padding:0 8px"><section style="width:100%;box-sizing:border-box;padding:16px 18px;background:${U.rgba(c,.08)};border-radius:8px"><section style="display:table;width:100%"><section style="display:table-cell;width:28px;vertical-align:top;padding-top:2px"><section style="font-size:20px">💡</section></section><section style="display:table-cell;vertical-align:top"><section style="font-size:15px;color:#334155;line-height:1.8;text-align:justify">${U.fmt(t)}</section></section></section></section></section>`
    ],
    quote: [
        (t, c) => `<section style="${U.base}margin:20px 0;padding:0 8px"><section style="width:100%;box-sizing:border-box;padding:14px 18px;background:#f8fafc;color:#64748b;border-radius:6px;font-size:15px;line-height:1.8;border-left:3px solid #cbd5e1">${U.fmt(t)}</section></section>`,
        // 引号 - 使用 table
        (t, c) => `<section style="${U.base}margin:20px 0;padding:0 8px"><section style="width:100%;box-sizing:border-box;padding:16px 18px;background:#f8fafc;border-radius:8px"><section style="display:table;width:100%"><section style="display:table-cell;width:24px;vertical-align:top"><section style="font-size:28px;color:#cbd5e1;font-family:Georgia;line-height:1">"</section></section><section style="display:table-cell;vertical-align:top"><section style="font-size:15px;color:#64748b;line-height:1.8">${U.fmt(t)}</section></section></section></section></section>`,
        (t, c) => `<section style="${U.base}margin:20px 0;padding:0 8px"><section style="width:100%;box-sizing:border-box;padding:16px 20px;background:linear-gradient(135deg,#f8fafc,#f1f5f9);color:#64748b;border-radius:8px;font-size:15px;line-height:1.8;font-style:italic;border:1px solid #e2e8f0">${U.fmt(t)}</section></section>`,
        (t, c) => `<section style="${U.base}margin:20px 0;padding:0 8px"><section style="width:100%;box-sizing:border-box;padding:14px 18px;background:${U.rgba(c,.06)};color:#475569;border-radius:6px;font-size:15px;line-height:1.8;border-left:3px solid ${c}">${U.fmt(t)}</section></section>`
    ],
    bg_card: [
        (t, c) => `<section style="${U.base}margin:20px 0;padding:0 8px"><section style="width:100%;box-sizing:border-box;padding:18px;background:${c};border-radius:8px;color:#fff;font-size:15px;line-height:1.8;text-align:justify">${U.fmt(t)}</section></section>`,
        (t, c) => `<section style="${U.base}margin:20px 0;padding:0 8px"><section style="width:100%;box-sizing:border-box;padding:18px;background:${U.rgba(c,.12)};border-radius:8px;color:#334155;font-size:15px;line-height:1.8;text-align:justify">${U.fmt(t)}</section></section>`,
        (t, c) => `<section style="${U.base}margin:20px 0;padding:0 8px"><section style="width:100%;box-sizing:border-box;padding:18px;background:linear-gradient(135deg,${c} 0%,${U.rgba(c,.75)} 100%);border-radius:8px;color:#fff;font-size:15px;line-height:1.8;text-align:justify">${U.fmt(t)}</section></section>`,
        (t, c) => `<section style="${U.base}margin:20px 0;padding:0 8px"><section style="width:100%;box-sizing:border-box;padding:18px;background:${U.rgba(c,.08)};border:1px solid ${U.rgba(c,.3)};border-radius:8px;color:#334155;font-size:15px;line-height:1.8;text-align:justify">${U.fmt(t)}</section></section>`
    ],
    code_block: [
        (t, c) => `<section style="${U.base}margin:20px 0;padding:0 8px"><section style="width:100%;box-sizing:border-box;padding:14px 16px;background:#1e293b;color:#e2e8f0;font-family:Menlo,Monaco,Consolas,monospace;font-size:12px;border-radius:8px;line-height:1.6;white-space:pre-wrap;word-break:break-all;overflow-x:auto">${t}</section></section>`,
        (t, c) => `<section style="${U.base}margin:20px 0;padding:0 8px"><section style="width:100%;box-sizing:border-box;padding:14px 16px;background:#f8fafc;color:#334155;font-family:Menlo,Monaco,Consolas,monospace;font-size:12px;border-radius:8px;border:1px solid #e2e8f0;line-height:1.6;white-space:pre-wrap;word-break:break-all;overflow-x:auto">${t}</section></section>`,
        // 带标题栏 - 嵌套 section
        (t, c) => `<section style="${U.base}margin:20px 0;padding:0 8px"><section style="width:100%;box-sizing:border-box;border-radius:8px;overflow:hidden;border:1px solid #334155"><section style="background:#334155;padding:8px 14px"><section style="display:inline-block;width:10px;height:10px;background:#ef4444;border-radius:50%;margin-right:6px"></section><section style="display:inline-block;width:10px;height:10px;background:#f59e0b;border-radius:50%;margin-right:6px"></section><section style="display:inline-block;width:10px;height:10px;background:#22c55e;border-radius:50%"></section></section><section style="padding:14px 16px;background:#1e293b;color:#e2e8f0;font-family:Menlo,Monaco,Consolas,monospace;font-size:12px;line-height:1.6;white-space:pre-wrap;word-break:break-all">${t}</section></section></section>`
    ],
    normal: [
        (t, c) => `<section style="${U.base}margin:0 0 14px;padding:0 8px;line-height:1.8;font-size:15px;color:#334155;text-align:justify">${U.fmt(t)}</section>`
    ]
};
