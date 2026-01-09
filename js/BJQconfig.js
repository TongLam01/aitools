// 配置与样式模板
const Config = {
    colors: ['#07c160', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'],
    bgs: [
        { id: 'none', val: null, pv: null },
        { id: 'warm', val: '#fffbf5', pv: '#fffbf5' },
        { id: 'cool', val: '#f8fafc', pv: '#f8fafc' },
        { id: 'green', val: '#f6fef9', pv: '#f6fef9' },
        { id: 'blue', val: '#f0f7ff', pv: '#f0f7ff' },
        { id: 'purple', val: '#faf5ff', pv: '#faf5ff' },
        { id: 'g1', val: 'linear-gradient(180deg,#fdf6f0,#fffdfb)', pv: 'linear-gradient(180deg,#fdf6f0,#fffdfb)' },
        { id: 'g2', val: 'linear-gradient(180deg,#f0f5ff,#fffeff)', pv: 'linear-gradient(180deg,#f0f5ff,#fffeff)' }
    ]
};

// 工具函数
const U = {
    rgba: (hex, a) => {
        let r = 0, g = 0, b = 0;
        if (hex.length === 4) {
            r = parseInt(hex[1] + hex[1], 16);
            g = parseInt(hex[2] + hex[2], 16);
            b = parseInt(hex[3] + hex[3], 16);
        } else if (hex.length === 7) {
            r = parseInt(hex.slice(1, 3), 16);
            g = parseInt(hex.slice(3, 5), 16);
            b = parseInt(hex.slice(5, 7), 16);
        }
        return `rgba(${r},${g},${b},${a})`;
    },
    parseNum: (t) => {
        const m = t.match(/^(\d+|[一二三四五六七八九十]+)[.、\s]\s*(.*)$/);
        return m ? { n: m[1], t: m[2] } : { n: '', t };
    },
    fmt: (t) => t.split('\n').filter(l => l.trim()).map(l => `<p style="margin:0;padding:0">${l}</p>`).join('')
};

// 样式模板
const TPL = {
    big_title: [
        (t, c) => `<section style="margin:0 0 20px;padding:0 8px;text-align:center"><strong style="font-size:20px;color:#1f2937;border-bottom:3px solid ${c};padding:0 10px 8px;display:inline-block">${t}</strong></section>`,
        (t, c) => `<section style="margin:0 0 20px;padding:0 8px;text-align:center"><strong style="font-size:18px;color:#fff;background:${c};padding:10px 24px;border-radius:6px;display:inline-block">${t}</strong></section>`,
        (t, c) => `<section style="margin:0 0 20px;padding:12px 16px;background:${U.rgba(c, .1)};border-left:8px solid ${c};color:${c};font-size:18px;font-weight:700">${t}</section>`,
        (t, c) => `<section style="margin:0 0 20px;padding:0 8px;text-align:center"><strong style="font-size:18px;color:${c};border:2px solid ${c};padding:8px 24px;border-radius:50px;display:inline-block">${t}</strong></section>`,
        (t, c) => `<section style="margin:0 0 20px;padding:0 8px;text-align:center;display:flex;align-items:center;justify-content:center;gap:12px"><span style="flex:1;max-width:50px;height:2px;background:linear-gradient(to right,transparent,${c})"></span><strong style="font-size:19px;color:#1f2937">${t}</strong><span style="flex:1;max-width:50px;height:2px;background:linear-gradient(to left,transparent,${c})"></span></section>`,
        (t, c) => `<section style="margin:0 0 20px;padding:0 8px;text-align:center"><strong style="font-size:18px;color:#fff;background:linear-gradient(135deg,${c},${U.rgba(c, .7)});padding:12px 28px;border-radius:8px;display:inline-block;box-shadow:0 4px 12px ${U.rgba(c, .3)}">${t}</strong></section>`
    ],
    sub_title: [
        (t, c) => `<section style="margin:8px 0 16px;padding:0 8px;display:flex;align-items:center"><span style="display:inline-block;width:4px;height:18px;background:${c};margin-right:10px;border-radius:2px"></span><strong style="font-size:17px;color:#1f2937">${t}</strong></section>`,
        (t, c) => `<section style="display:flex;align-items:center;justify-content:center;gap:10px;margin:16px 0"><div style="height:1px;width:50px;background:linear-gradient(to right,transparent,#e0e0e0)"></div><div style="color:${c};font-weight:700;font-size:16px;display:flex;align-items:center;gap:6px"><span style="font-size:12px">✦</span>${t}<span style="font-size:12px">✦</span></div><div style="height:1px;width:50px;background:linear-gradient(to left,transparent,#e0e0e0)"></div></section>`,
        (t, c) => `<section style="margin:8px 0 16px;padding:0 8px;display:inline-block"><strong style="font-size:17px;color:#1f2937;border-bottom:2px solid ${c};padding-bottom:4px">${t}</strong></section>`,
        (t, c) => `<section style="margin:8px 0 16px;padding:0 8px;display:flex;align-items:center"><span style="display:inline-block;width:8px;height:8px;background:${c};margin-right:10px;border-radius:50%"></span><strong style="font-size:17px;color:#1f2937">${t}</strong></section>`,
        (t, c) => `<section style="margin:8px 0 16px;padding:0 8px"><strong style="font-size:16px;color:${c};background:${U.rgba(c, .1)};padding:6px 14px;border-radius:4px;display:inline-block">${t}</strong></section>`
    ],
    num_title: [
        (t, c) => { const { n, t: x } = U.parseNum(t); return `<section style="margin:8px 0 16px;padding:0 8px;display:flex;align-items:center"><span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;background:${c};color:#fff;border-radius:50%;font-size:13px;font-weight:700;margin-right:10px;flex-shrink:0">${n || '1'}</span><strong style="font-size:17px;color:#1f2937">${x}</strong></section>`; },
        (t, c) => { const { n, t: x } = U.parseNum(t); const d = (n || '1').length === 1 ? '0' + (n || '1') : n; return `<section style="margin:12px 0 16px;padding:0 8px 8px;border-bottom:2px solid ${c}"><section style="display:flex;align-items:flex-end;gap:10px"><span style="display:inline-block;background:${U.rgba(c, .15)};border-left:4px solid ${c};color:#666;font-size:18px;font-weight:700;padding:4px 12px;line-height:1">${d}</span><span style="font-size:16px;color:#555;padding-bottom:2px">${x}</span></section></section>`; },
        (t, c) => { const { n, t: x } = U.parseNum(t); return `<section style="margin:16px 8px"><section style="background:${U.rgba(c, .1)};padding:8px"><section style="background:#fff;border:1px solid ${U.rgba(c, .4)};position:relative;min-height:40px"><section style="position:absolute;top:0;left:0;background:${U.rgba(c, .5)};color:#fff;width:36px;height:26px;line-height:26px;text-align:center;font-weight:700;font-size:13px">${n || '1'}</section><section style="padding:8px 12px 10px 48px;color:#333;font-size:15px;line-height:1.7">${x}</section></section></section></section>`; },
        (t, c) => { const { n, t: x } = U.parseNum(t); return `<section style="margin:8px 0 16px;padding:0 8px;display:flex;align-items:center"><span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border:2px solid ${c};color:${c};border-radius:50%;font-size:13px;font-weight:700;margin-right:10px;flex-shrink:0">${n || '1'}</span><strong style="font-size:17px;color:#1f2937">${x}</strong></section>`; },
        (t, c) => { const { n, t: x } = U.parseNum(t); const d = (n || '1').length === 1 ? '0' + (n || '1') : n; return `<section style="margin:8px 0 16px;padding:0 8px;display:flex;align-items:center"><span style="font-size:26px;font-weight:900;color:${U.rgba(c, .25)};margin-right:8px;font-family:Arial;line-height:1">${d}</span><strong style="font-size:17px;color:#1f2937">${x}</strong></section>`; },
        (t, c) => { const { n, t: x } = U.parseNum(t); return `<section style="margin:8px 0 16px;padding:0 8px;display:flex;align-items:center"><span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;background:${c};color:#fff;border-radius:4px;font-size:13px;font-weight:700;margin-right:10px;flex-shrink:0">${n || '1'}</span><strong style="font-size:17px;color:#1f2937">${x}</strong></section>`; }
    ],
    grad_title: [
        (t, c) => `<section style="margin:8px 0 16px;padding:0 8px"><span style="display:inline-block;background:linear-gradient(90deg,${c},${U.rgba(c, .6)});color:#fff;padding:6px 14px;font-size:15px;font-weight:700;border-radius:4px">${t}</span></section>`,
        (t, c) => `<section style="margin:8px 0 16px;padding:0 8px"><span style="display:inline-block;background:${U.rgba(c, .1)};border-left:4px solid ${c};padding:8px 14px;color:#1f2937;font-weight:700;font-size:16px;border-radius:0 6px 6px 0">${t}</span></section>`,
        (t, c) => `<section style="margin:8px 0 16px;padding:0 8px"><strong style="font-size:17px;color:#1f2937;background:linear-gradient(to top,${U.rgba(c, .4)} 0%,${U.rgba(c, .4)} 35%,transparent 35.1%,transparent 100%);padding:0 4px">${t}</strong></section>`,
        (t, c) => `<section style="margin:8px 0 16px;padding:0 8px"><span style="display:inline-block;background:${c};color:#fff;padding:5px 12px 5px 10px;font-size:15px;font-weight:700;border-radius:4px 20px 20px 4px">${t}</span></section>`
    ],
    key_point: [
        (t, c) => `<section style="margin:20px 8px;padding:14px 16px;background:${U.rgba(c, .08)};border:1px solid ${U.rgba(c, .2)};border-radius:8px;font-size:15px;color:#334155;line-height:1.8;text-align:justify">${U.fmt(t)}</section>`,
        (t, c) => `<section style="margin:20px 8px;border:1px solid ${c};border-radius:4px;padding:24px 20px;background:${U.rgba(c, .06)};background-image:radial-gradient(circle,${c} 3px,transparent 4px),radial-gradient(circle,${c} 3px,transparent 4px),linear-gradient(135deg,transparent 50%,${c} 50%);background-position:left 12px top 12px,right 12px top 12px,right bottom;background-size:8px 8px,8px 8px,24px 24px;background-repeat:no-repeat"><section style="font-size:15px;color:#334155;line-height:1.8;text-align:justify">${U.fmt(t)}</section></section>`,
        (t, c) => `<section style="margin:20px 8px;padding:14px 16px;border-left:4px solid ${c};background:#f8fafc;font-size:15px;color:#334155;line-height:1.8;text-align:justify;border-radius:0 8px 8px 0">${U.fmt(t)}</section>`,
        (t, c) => `<section style="margin:20px 8px;padding:14px 16px;background:#fff;border:1px solid #e2e8f0;border-top:3px solid ${c};border-radius:0 0 8px 8px;font-size:15px;color:#334155;line-height:1.8;text-align:justify;box-shadow:0 2px 6px rgba(0,0,0,.03)">${U.fmt(t)}</section>`,
        (t, c) => `<section style="margin:20px 8px;padding:14px 16px 14px 44px;background:${U.rgba(c, .08)};border-radius:8px;font-size:15px;color:#334155;line-height:1.8;text-align:justify;position:relative"><span style="position:absolute;left:14px;top:14px;font-size:18px">💡</span>${U.fmt(t)}</section>`,
        (t, c) => `<section style="margin:20px 8px;background:${U.rgba(c, .06)};border-radius:8px;overflow:hidden"><section style="padding:20px 16px 16px;font-size:15px;color:#3e3e3e;line-height:1.75;text-align:justify">${U.fmt(t)}</section><section style="display:block;margin:0;padding:0;line-height:0;font-size:0"><svg viewBox="0 0 600 40" style="display:block;width:100%" preserveAspectRatio="none"><polygon points="600,0 600,40 0,40" fill="${U.rgba(c, .4)}"/><polygon points="0,12 280,40 0,40" fill="${c}"/></svg></section></section>`
    ],
    quote: [
        (t, c) => `<section style="margin:20px 8px;padding:12px 16px;background:#f8fafc;color:#64748b;border-radius:6px;font-size:15px;line-height:1.8;border-left:3px solid #cbd5e1">${U.fmt(t)}</section>`,
        (t, c) => `<section style="margin:20px 8px;padding:18px 16px 12px;background:#f8fafc;color:#64748b;border-radius:8px;font-size:15px;line-height:1.8;position:relative"><span style="position:absolute;top:6px;left:12px;font-size:24px;color:#cbd5e1;font-family:Georgia;line-height:1">"</span><span style="display:block;padding-left:18px">${U.fmt(t)}</span></section>`,
        (t, c) => `<section style="margin:20px 8px;padding:14px 18px;background:linear-gradient(135deg,#f8fafc,#f1f5f9);color:#64748b;border-radius:8px;font-size:15px;line-height:1.8;font-style:italic;border:1px solid #e2e8f0">${U.fmt(t)}</section>`,
        (t, c) => `<section style="margin:20px 8px;padding:12px 16px;background:${U.rgba(c, .06)};color:#475569;border-radius:6px;font-size:15px;line-height:1.8;border-left:3px solid ${c}">${U.fmt(t)}</section>`
    ],
    bg_card: [
        (t, c) => `<section style="margin:20px 8px;padding:16px;background:${c};border-radius:8px;color:#fff;font-size:15px;line-height:1.8;text-align:justify">${U.fmt(t)}</section>`,
        (t, c) => `<section style="margin:20px 8px;padding:16px;background:${U.rgba(c, .12)};border-radius:8px;color:#334155;font-size:15px;line-height:1.8;text-align:justify">${U.fmt(t)}</section>`,
        (t, c) => `<section style="margin:20px 8px;padding:16px;background:linear-gradient(135deg,${c},${U.rgba(c, .8)});border-radius:8px;color:#fff;font-size:15px;line-height:1.8;text-align:justify;box-shadow:0 4px 10px ${U.rgba(c, .25)}">${U.fmt(t)}</section>`,
        (t, c) => `<section style="margin:20px 8px;padding:16px;background:${U.rgba(c, .08)};border:1px solid ${U.rgba(c, .25)};border-radius:8px;color:#334155;font-size:15px;line-height:1.8;text-align:justify">${U.fmt(t)}</section>`
    ],
    code_block: [
        (t, c) => `<section style="margin:20px 8px;padding:12px 14px;background:#1e293b;color:#e2e8f0;font-family:Menlo,Monaco,Consolas,monospace;font-size:12px;border-radius:8px;overflow-x:auto;line-height:1.6;white-space:pre-wrap;word-break:break-all">${t}</section>`,
        (t, c) => `<section style="margin:20px 8px;padding:12px 14px;background:#f8fafc;color:#334155;font-family:Menlo,Monaco,Consolas,monospace;font-size:12px;border-radius:8px;border:1px solid #e2e8f0;overflow-x:auto;line-height:1.6;white-space:pre-wrap;word-break:break-all">${t}</section>`,
        (t, c) => `<section style="margin:20px 8px;border-radius:8px;overflow:hidden;border:1px solid #334155"><section style="background:#334155;padding:6px 12px"><span style="display:inline-block;width:9px;height:9px;background:#ef4444;border-radius:50%;margin-right:5px"></span><span style="display:inline-block;width:9px;height:9px;background:#f59e0b;border-radius:50%;margin-right:5px"></span><span style="display:inline-block;width:9px;height:9px;background:#22c55e;border-radius:50%"></span></section><section style="padding:12px 14px;background:#1e293b;color:#e2e8f0;font-family:Menlo,Monaco,Consolas,monospace;font-size:12px;line-height:1.6;white-space:pre-wrap;word-break:break-all">${t}</section></section>`
    ],
    normal: [
        (t, c) => `<section style="margin:0 0 12px;padding:0 8px;line-height:1.8;font-size:15px;color:#334155;text-align:justify">${U.fmt(t)}</section>`
    ]
};