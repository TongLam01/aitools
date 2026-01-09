// 核心应用逻辑
const App = {
    color: '#07c160',
    bg: null,
    
    init() {
        const k = localStorage.getItem('ds_key');
        if (k) document.getElementById('apiKey').value = k;
        const b = localStorage.getItem('article_bg');
        if (b) {
            const f = Config.bgs.find(x => x.id === b);
            if (f) this.bg = f;
        }
        this.renderColors();
        this.renderBgs();
        this.updateBg();
        this.bindEvents();
    },
    
    bindEvents() {
        document.getElementById('pv').addEventListener('click', e => {
            const w = e.target.closest('.bw');
            if (w) {
                w.classList.toggle('sel');
                this.updateBadge();
            }
        });
        
        document.addEventListener('keydown', e => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
                const el = document.activeElement;
                if (el.id === 'pv' || el.closest('#pv')) {
                    e.preventDefault();
                    document.querySelectorAll('.bw').forEach(x => x.classList.add('sel'));
                    this.updateBadge();
                }
            }
            if (e.key === 'Escape') {
                document.querySelectorAll('.bw.sel').forEach(x => x.classList.remove('sel'));
                this.updateBadge();
            }
        });
    },
    
    showModal() { document.getElementById('modal').classList.add('on'); },
    hideModal() { document.getElementById('modal').classList.remove('on'); },
    saveKey() { localStorage.setItem('ds_key', document.getElementById('apiKey').value); },
    
    renderColors() {
        const el = document.getElementById('colors');
        el.innerHTML = '';
        Config.colors.forEach(c => {
            const d = document.createElement('div');
            d.className = 'cdot' + (c === this.color ? ' on' : '');
            d.style.background = c;
            d.onclick = () => this.setColor(c);
            el.appendChild(d);
        });
    },
    
    renderBgs() {
        const el = document.getElementById('bgs');
        el.innerHTML = '';
        Config.bgs.forEach(b => {
            const d = document.createElement('div');
            const on = (this.bg && this.bg.id === b.id) || (!this.bg && b.id === 'none');
            d.className = 'bdot' + (on ? ' on' : '') + (b.id === 'none' ? ' no' : '');
            if (b.pv) d.style.background = b.pv;
            d.onclick = () => this.setBg(b);
            el.appendChild(d);
        });
    },
    
    setColor(c) {
        this.color = c;
        this.renderColors();
        document.querySelectorAll('.bw.sel').forEach(w => this.apply(w.dataset.type, true, w));
    },
    
    setBg(b) {
        this.bg = b.id === 'none' ? null : b;
        if (b.id !== 'none') localStorage.setItem('article_bg', b.id);
        else localStorage.removeItem('article_bg');
        this.renderBgs();
        this.updateBg();
    },
    
    updateBg() {
        const pv = document.getElementById('pv');
        pv.style.background = this.bg && this.bg.val ? this.bg.val : '#fff';
    },
    
    updateBadge() {
        const n = document.querySelectorAll('.bw.sel').length;
        const b = document.getElementById('badge');
        b.textContent = n;
        b.classList.toggle('on', n > 0);
    },
    
    async generate() {
        const key = document.getElementById('apiKey').value;
        const text = document.getElementById('input').value;
        if (!key) { this.showModal(); return alert('请先设置 API Key'); }
        if (!text) return alert('请先输入文章内容');
        
        const btn = document.getElementById('btnRun');
        btn.disabled = true;
        btn.innerHTML = '<span class="spin">⚙️</span>排版中...';
        
        document.getElementById('pv').innerHTML = '<div class="empty"><i class="spin">⚙️</i><b>AI 正在分析</b><s>请稍候...</s></div>';
        
        try {
            const clean = text.replace(/(\n\s*){2,}/g, '\n').trim();
            const res = await fetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        { role: 'system', content: '你是一个排版解析工具。将文本拆分为逻辑段落的JSON数组[{type,content}]。识别标题(big_title,sub_title,num_title)和重点(key_point,quote)。保持原文。' },
                        { role: 'user', content: clean }
                    ],
                    temperature: 0.1
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            const json = data.choices[0].message.content.match(/\[[\s\S]*\]/);
            if (!json) throw new Error('AI 返回格式有误，请重试');
            this.render(JSON.parse(json[0]));
        } catch (e) {
            alert('错误：' + e.message);
            document.getElementById('pv').innerHTML = '<div class="empty"><i>✨</i><b>等待内容输入</b><s>粘贴文章后点击排版</s></div>';
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span>✨</span>一键智能排版';
        }
    },
    
    render(blocks) {
        const pv = document.getElementById('pv');
        pv.innerHTML = '';
        blocks.forEach(b => {
            const w = document.createElement('div');
            w.className = 'bw';
            w.dataset.type = b.type;
            w.dataset.variant = 0;
            w.dataset.raw = b.content;
            w.dataset.fs = 0;
            w.dataset.bold = 'false';
            const tpl = TPL[b.type] || TPL.normal;
            w.innerHTML = tpl[0](b.content, this.color);
            pv.appendChild(w);
        });
        this.updateBg();
    },
    
    apply(type, keep = false, single = null) {
        const list = single ? [single] : document.querySelectorAll('.bw.sel');
        if (!list.length && !keep) return alert('请先选中内容块');
        
        list.forEach(w => {
            const raw = w.dataset.raw;
            const old = w.dataset.type;
            let v = parseInt(w.dataset.variant) || 0;
            
            if (!keep) {
                v = old === type ? (v + 1) % TPL[type].length : 0;
            }
            
            const tpl = TPL[type][v];
            w.innerHTML = tpl(raw, this.color);
            w.dataset.type = type;
            w.dataset.variant = v;
            
            const fs = parseInt(w.dataset.fs) || 0;
            const bold = w.dataset.bold === 'true';
            if (fs !== 0 || bold) this.applyFont(w, fs, bold);
        });
    },
    
    bold() {
        const list = document.querySelectorAll('.bw.sel');
        if (!list.length) return alert('请先选中内容块');
        list.forEach(w => {
            const b = w.dataset.bold !== 'true';
            w.dataset.bold = b;
            this.applyFont(w, parseInt(w.dataset.fs) || 0, b);
        });
    },
    
    fontSize(d) {
        const list = document.querySelectorAll('.bw.sel');
        if (!list.length) return alert('请先选中内容块');
        list.forEach(w => {
            let fs = parseInt(w.dataset.fs) || 0;
            fs = Math.max(-6, Math.min(10, fs + d * 2));
            w.dataset.fs = fs;
            this.applyFont(w, fs, w.dataset.bold === 'true');
        });
    },
    
    applyFont(w, fs, bold) {
        w.querySelectorAll('section,p,span,strong').forEach(el => {
            const cur = parseInt(getComputedStyle(el).fontSize);
            if (!el.dataset.ofs) el.dataset.ofs = cur;
            const orig = parseInt(el.dataset.ofs);
            el.style.fontSize = (orig + fs) + 'px';
            el.style.fontWeight = bold ? 'bold' : (el.tagName === 'STRONG' ? 'bold' : '');
        });
    },
    
    merge() {
        const list = Array.from(document.querySelectorAll('.bw.sel')).sort((a, b) => a.offsetTop - b.offsetTop);
        if (list.length < 2) return alert('请至少选中两个内容块');
        
        const text = list.map(w => w.dataset.raw).join('\n');
        const w = document.createElement('div');
        w.className = 'bw sel';
        w.dataset.type = 'normal';
        w.dataset.variant = 0;
        w.dataset.raw = text;
        w.dataset.fs = 0;
        w.dataset.bold = 'false';
        w.innerHTML = TPL.normal[0](text, this.color);
        
        list[0].replaceWith(w);
        list.slice(1).forEach(x => x.remove());
        this.updateBadge();
    },
    
    async copy() {
        const pv = document.getElementById('pv');
        const list = pv.querySelectorAll('.bw');
        if (!list.length) return alert('没有可复制的内容');
        
        let html = Array.from(list).map(w => w.innerHTML).join('');
        if (this.bg && this.bg.val) {
            html = `<section style="background:${this.bg.val};padding:20px 8px;margin:0 -100px;padding-left:100px;padding-right:100px">${html}</section>`;
        }
        
        try {
            const blob = new Blob([html], { type: 'text/html' });
            await navigator.clipboard.write([new ClipboardItem({ 'text/html': blob })]);
            
            const btn = document.getElementById('btnCopy');
            const t = btn.innerHTML;
            btn.innerHTML = '✅ 已复制';
            btn.style.background = '#22c55e';
            setTimeout(() => { btn.innerHTML = t; btn.style.background = ''; }, 1500);
        } catch (e) {
            alert('复制失败：' + e.message);
        }
    }
};

// 初始化
document.addEventListener('DOMContentLoaded', () => App.init());