// 核心逻辑
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
        el.innerHTML = Config.colors.map(c => 
            `<div class="cdot${c === this.color ? ' on' : ''}" style="background:${c}" onclick="App.setColor('${c}')"></div>`
        ).join('');
    },
    
    renderBgs() {
        const el = document.getElementById('bgs');
        el.innerHTML = Config.bgs.map(b => {
            const on = (this.bg?.id === b.id) || (!this.bg && b.id === 'none');
            const cls = 'bdot' + (on ? ' on' : '') + (b.id === 'none' ? ' no' : '');
            const style = b.pv ? `background:${b.pv}` : '';
            return `<div class="${cls}" style="${style}" onclick="App.setBg('${b.id}')"></div>`;
        }).join('');
    },
    
    setColor(c) {
        this.color = c;
        this.renderColors();
        document.querySelectorAll('.bw.sel').forEach(w => this._reapply(w));
    },
    
    setBg(id) {
        const b = Config.bgs.find(x => x.id === id);
        this.bg = b.id === 'none' ? null : b;
        localStorage.setItem('article_bg', this.bg ? this.bg.id : '');
        this.renderBgs();
        this.updateBg();
    },
    
    updateBg() {
        const pv = document.getElementById('pv');
        pv.style.background = this.bg?.val || '#fff';
    },
    
    updateBadge() {
        const n = document.querySelectorAll('.bw.sel').length;
        const b = document.getElementById('badge');
        b.textContent = n + ' 块';
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
        
        const pv = document.getElementById('pv');
        pv.innerHTML = '<div class="empty"><i class="spin">⚙️</i><b>AI 正在分析排版</b><s>请稍候...</s></div>';
        
        try {
            const clean = text.replace(/(\n\s*){2,}/g, '\n').trim();
            const res = await fetch('https://api.deepseek.com/chat/completions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
                body: JSON.stringify({
                    model: 'deepseek-chat',
                    messages: [
                        { role: 'system', content: '你是排版工具。将文本拆分为JSON数组[{type,content}]。type可选:big_title,sub_title,num_title,key_point,quote,normal。保持原文。' },
                        { role: 'user', content: clean }
                    ],
                    temperature: 0.1
                })
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message);
            const json = data.choices[0].message.content.match(/\[[\s\S]*\]/);
            if (!json) throw new Error('AI 返回格式有误');
            this.render(JSON.parse(json[0]));
        } catch (e) {
            alert('错误：' + e.message);
            pv.innerHTML = '<div class="empty"><i>✨</i><b>等待内容输入</b><s>粘贴文章后点击排版按钮</s></div>';
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<span>✨</span>一键智能排版';
        }
    },
    
    render(blocks) {
        const pv = document.getElementById('pv');
        pv.innerHTML = blocks.map(b => {
            const tpl = TPL[b.type] || TPL.normal;
            return `<div class="bw" data-type="${b.type}" data-v="0" data-raw="${this._esc(b.content)}" data-fs="0" data-bold="0">${tpl[0](b.content, this.color)}</div>`;
        }).join('');
        this.updateBg();
    },
    
    _esc(s) {
        return s.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    },
    
    _unesc(s) {
        return s.replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
    },
    
    apply(type, keep = false) {
        const list = document.querySelectorAll('.bw.sel');
        if (!list.length) return alert('请先在预览区选中内容块');
        list.forEach(w => this._applyOne(w, type, keep));
    },
    
    _applyOne(w, type, keep = false) {
        const raw = this._unesc(w.dataset.raw);
        const old = w.dataset.type;
        let v = parseInt(w.dataset.v) || 0;
        if (!keep) v = old === type ? (v + 1) % TPL[type].length : 0;
        
        w.innerHTML = TPL[type][v](raw, this.color);
        w.dataset.type = type;
        w.dataset.v = v;
        
        const fs = parseInt(w.dataset.fs) || 0;
        const bold = w.dataset.bold === '1';
        if (fs || bold) this._font(w, fs, bold);
    },
    
    _reapply(w) {
        this._applyOne(w, w.dataset.type, true);
    },
    
    bold() {
        const list = document.querySelectorAll('.bw.sel');
        if (!list.length) return alert('请先选中内容块');
        list.forEach(w => {
            w.dataset.bold = w.dataset.bold === '1' ? '0' : '1';
            this._font(w, parseInt(w.dataset.fs) || 0, w.dataset.bold === '1');
        });
    },
    
    fontSize(d) {
        const list = document.querySelectorAll('.bw.sel');
        if (!list.length) return alert('请先选中内容块');
        list.forEach(w => {
            let fs = parseInt(w.dataset.fs) || 0;
            fs = Math.max(-6, Math.min(10, fs + d * 2));
            w.dataset.fs = fs;
            this._font(w, fs, w.dataset.bold === '1');
        });
    },
    
    _font(w, fs, bold) {
        w.querySelectorAll('section,p,span,strong').forEach(el => {
            const cur = parseInt(getComputedStyle(el).fontSize);
            if (!el.dataset.ofs) el.dataset.ofs = cur;
            el.style.fontSize = (parseInt(el.dataset.ofs) + fs) + 'px';
            el.style.fontWeight = bold ? 'bold' : (el.tagName === 'STRONG' ? 'bold' : '');
        });
    },
    
    merge() {
        const list = [...document.querySelectorAll('.bw.sel')].sort((a, b) => a.offsetTop - b.offsetTop);
        if (list.length < 2) return alert('请至少选中两个内容块');
        
        const text = list.map(w => this._unesc(w.dataset.raw)).join('\n');
        const html = TPL.normal[0](text, this.color);
        const w = document.createElement('div');
        w.className = 'bw sel';
        w.dataset.type = 'normal';
        w.dataset.v = '0';
        w.dataset.raw = this._esc(text);
        w.dataset.fs = '0';
        w.dataset.bold = '0';
        w.innerHTML = html;
        
        list[0].replaceWith(w);
        list.slice(1).forEach(x => x.remove());
        this.updateBadge();
    },
    
    async copy() {
        const list = document.querySelectorAll('#pv .bw');
        if (!list.length) return alert('没有可复制的内容');
        
        let html = [...list].map(w => w.innerHTML).join('');
        
        // 修复底色：使用简单的包裹方式，不用负边距
        if (this.bg?.val) {
            html = `<section style="background:${this.bg.val};padding:20px 10px;margin:0">${html}</section>`;
        }
        
        try {
            await navigator.clipboard.write([
                new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }) })
            ]);
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

document.addEventListener('DOMContentLoaded', () => App.init());
