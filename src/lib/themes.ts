// Preset profile layouts users can start from.
export interface Theme {
  id: string
  name: string
  css: string
  html?: string
}

export const THEMES: Theme[] = [
  { id: 'classic', name: 'Classic Black (default)', css: '' },
  {
    id: 'blood',
    name: 'Blood Moon',
    css: `body{background:#0a0000 radial-gradient(circle at 80% 0,#600 0,#000 50%) fixed}
.vf-box{background:rgba(20,0,0,.85);border-color:#900}
.vf-box>h3{background:#900;font-family:Georgia,serif;letter-spacing:2px}
.vf-name{color:#ff0033;text-shadow:0 0 10px #f00}
a{color:#ff6666}`,
  },
  {
    id: 'cyber',
    name: 'Toxic Cybergoth',
    css: `body{background:#000 repeating-linear-gradient(0deg,#001a00 0 1px,transparent 1px 4px);color:#b6ff9e;font-family:'Courier New',monospace}
.vf-box{background:#020;border:1px solid #39ff14;box-shadow:0 0 6px #39ff14}
.vf-box>h3{background:#39ff14;color:#000}
.vf-name{color:#39ff14;font-family:'Courier New',monospace;text-shadow:0 0 8px #39ff14}
.vf-headline{color:#ff00ff}
a{color:#00ffff}.vf-tag{background:#000;border-color:#39ff14;color:#39ff14}`,
  },
  {
    id: 'pastel',
    name: 'Pastel Goth',
    css: `body{background:#1b1520;color:#f5d9f2}
.vf-box{background:#2b2030;border:2px dashed #e0a8ff;border-radius:10px;overflow:hidden}
.vf-box>h3{background:#b78ce0;color:#1b1520}
.vf-name{color:#ffb3e6}.vf-headline{color:#b3f0ff}
a{color:#ff9ad5}.vf-tag{background:#3a2a40;border-color:#e0a8ff;color:#e0a8ff}`,
  },
  {
    id: 'coffin',
    name: 'Velvet Coffin',
    css: `body{background:#12001a url('data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22%3E%3Cpath d=%22M20 4l6 6-2 26h-8l-2-26z%22 fill=%22%23200030%22/%3E%3C/svg%3E')}
.vf-box{background:rgba(30,0,45,.9);border-color:#7a2c9e}
.vf-box>h3{background:linear-gradient(#5b1a7a,#2a0a3a);font-family:Georgia,serif}
.vf-name{color:#c77dff}.vf-headline{color:#e0aaff}a{color:#d291ff}`,
  },
  {
    id: 'emo',
    name: 'Emo Kid 2006',
    css: `body{background:#000 repeating-linear-gradient(45deg,#111 0 10px,#000 10px 20px);color:#eee}
.vf-box{background:#000;border:2px solid #ff0099}
.vf-box>h3{background:#ff0099;color:#000;font-family:Impact,sans-serif;letter-spacing:2px}
.vf-name{color:#fff;font-family:Impact,sans-serif;text-shadow:3px 3px 0 #ff0099}
.vf-headline{color:#00ccff}a{color:#ff66cc}`,
    html: `<div class="vf-box"><h3>~*~ currently ~*~</h3><div class="vf-in"><marquee>listening to: ... | feeling: ... | xoxo</marquee></div></div>`,
  },
]
