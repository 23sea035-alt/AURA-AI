// @ds-adherence-ignore -- dev tooling scaffold (raw elements/hex/px by design)
//
// dev-harness.jsx — out-of-frame DEV NAVIGATOR + state toggles for Aura Claude Design artifacts.
// Pairs with ios-frame.jsx. Exports to window: DevProvider, useDev, DevRail, DevStage.
//
// This chrome lives OUTSIDE the iOS frame (a fixed panel to the LEFT) and is intentionally neutral/
// dark so it's never mistaken for Aura's warm UI. It is dev-only: gated behind ?dev=1 (default ON in
// these review prototypes; add ?dev=0 to hide). Screens read state via useDev() and render variants —
// so flipping a toggle is also the way we verify every screen actually has all its states built.
//
// Wiring (per artifact):
//   const SCREENS = [
//     { id: 'welcome',  label: 'Welcome (carousel)', states: ['slide1','slide2','slide3'] },
//     { id: 'auth',     label: 'Auth',               states: ['signup','signin','forgot','verify','reset'] },
//     { id: 'chat',     label: 'Chat',               states: ['default','typing','crisis','limit'] },
//     ...
//   ];
//   function Shell() {
//     const { screenId } = useDev();
//     return <IOSDevice dark={useDev().theme === 'dark'}>{ renderScreen(screenId) }</IOSDevice>;
//   }
//   ReactDOM.createRoot(document.getElementById('root')).render(
//     <DevProvider screens={SCREENS}><DevStage><Shell/></DevStage></DevProvider>
//   );

const DevContext = React.createContext(null);
function useDev() { return React.useContext(DevContext) || {}; }

const DEV_ON = (() => {
  try { return new URLSearchParams(window.location.search).get('dev') !== '0'; }
  catch (e) { return true; }
})();

// Present mode (?present=1): clean demo view — device scaled onto a warm backdrop with a slim,
// on-brand navigator instead of the dev rail. For recording walkthroughs of the locked design.
const PRESENT_ON = (() => {
  try { return new URLSearchParams(window.location.search).get('present') === '1'; }
  catch (e) { return false; }
})();

// Cross-file navigation between Onboarding/HomeTabs/OneOff must carry the view params (present/dev),
// or a demo in present mode would drop back to the dev-rail build on every back button / deep link.
function withViewParams(href) {
  try {
    const cur = new URLSearchParams(window.location.search);
    const u = new URL(href, window.location.href);
    ['present', 'dev'].forEach((k) => { if (cur.has(k) && !u.searchParams.has(k)) u.searchParams.set(k, cur.get(k)); });
    return u.pathname.split('/').pop() + u.search + u.hash;
  } catch (e) { return href; }
}
function goHtml(href) { window.location.href = withViewParams(href); }  // for JS navigations
Object.assign(window, { withViewParams, goHtml });

// Catch every <a href="*.html"> click (back buttons, closes, legal links) and preserve the params.
if (typeof document !== 'undefined' && !window.__auraNavPatched) {
  window.__auraNavPatched = true;
  document.addEventListener('click', (e) => {
    const a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    const href = a.getAttribute('href') || '';
    if (!/\.html(\?|#|$)/.test(href)) return;             // only local html navigations
    const fixed = withViewParams(href);
    if (fixed !== href) { e.preventDefault(); window.location.href = fixed; }
  }, true);
}

function DevProvider({ screens = [], children, initial = {} }) {
  const { useState, useMemo, useCallback } = React;
  const firstState = (id) => (screens.find((s) => s.id === id)?.states || [])[0] || null;

  const [screenId, setScreenIdRaw] = useState(initial.screenId ?? screens[0]?.id);
  const [theme, setTheme] = useState(initial.theme ?? 'dark');        // 'light' | 'dark' (warm-dark)
  const [account, setAccount] = useState(initial.account ?? 'free');  // 'free' | 'premium'
  const [dataState, setDataState] = useState(initial.dataState ?? 'happy'); // happy|empty|loading|error
  const [companion, setCompanion] = useState(initial.companion ?? 'Aurora'); // companion model preview
  const [screenState, setScreenState] = useState(initial.screenState ?? firstState(initial.screenId ?? screens[0]?.id));

  // Switching screens resets the per-screen state to that screen's first declared state.
  const setScreenId = useCallback((id) => { setScreenIdRaw(id); setScreenState(firstState(id)); }, [screens]);

  const value = useMemo(() => ({
    screens, screenId, setScreenId, theme, setTheme, account, setAccount,
    dataState, setDataState, companion, setCompanion, screenState, setScreenState, devOn: DEV_ON,
  }), [screens, screenId, theme, account, dataState, companion, screenState]);

  return <DevContext.Provider value={value}>{children}</DevContext.Provider>;
}

// ── styling (scoped, dev-only) ────────────────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('aura-devrail-style')) {
  const st = document.createElement('style');
  st.id = 'aura-devrail-style';
  st.textContent = `
    .dev-stage{display:flex;align-items:stretch;height:100vh;overflow:hidden;background:#0c0c0f;}
    .dev-rail{width:248px;flex:0 0 248px;box-sizing:border-box;padding:18px 16px;overflow-y:auto;
      background:#141418;border-right:1px solid rgba(255,255,255,0.08);color:#e6e6ea;
      font-family:-apple-system,system-ui,sans-serif;}
    .dev-stage-canvas{flex:1;display:flex;align-items:center;justify-content:center;padding:24px;overflow:hidden;}
    .dev-h{font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#8a8a93;margin:18px 0 8px;}
    .dev-h:first-child{margin-top:0;}
    .dev-title{font-size:14px;font-weight:800;letter-spacing:-.2px;color:#fff;margin-bottom:2px;}
    .dev-sub{font-size:11px;color:#8a8a93;margin-bottom:6px;}
    .dev-jump{width:100%;box-sizing:border-box;padding:8px 10px;border-radius:9px;background:#1f1f25;
      color:#fff;border:1px solid rgba(255,255,255,0.1);font-size:13px;font-family:inherit;}
    .dev-seg{display:flex;flex-wrap:wrap;gap:6px;}
    .dev-chip{flex:1 1 auto;min-width:0;padding:7px 10px;border-radius:8px;background:#1f1f25;color:#b9b9c2;
      border:1px solid rgba(255,255,255,0.08);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;
      text-align:center;-webkit-tap-highlight-color:transparent;transition:all .15s;}
    .dev-chip:hover{color:#fff;}
    .dev-chip.on{background:#2b6cff;border-color:#2b6cff;color:#fff;}
    .dev-hint{font-size:10.5px;color:#6a6a73;line-height:1.5;margin-top:16px;}
    .dev-scaler{transform-origin:center center;}
    /* ── present mode · clean demo view ───────────────────────────────────────── */
    .present-stage{display:flex;flex-direction:column;height:100vh;overflow:hidden;}
    .present-stage.dark{background:radial-gradient(125% 100% at 50% -8%, #241D16 0%, #15110D 64%, #0B0907 100%);}
    .present-stage.light{background:radial-gradient(125% 100% at 50% -8%, #F1E7D7 0%, #E4D7C2 60%, #D6C6AC 100%);}
    .present-phone{border-radius:52px;box-shadow:0 42px 92px -28px rgba(0,0,0,.55), 0 10px 26px -14px rgba(0,0,0,.34);}
    .present-bar{flex:0 0 auto;display:flex;align-items:center;justify-content:center;gap:15px;flex-wrap:wrap;
      padding:11px 18px calc(11px + env(safe-area-inset-bottom));backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);
      font-family:'Hanken Grotesk',-apple-system,system-ui,sans-serif;}
    .present-stage.dark .present-bar{background:rgba(18,14,10,.6);border-top:1px solid rgba(255,255,255,.07);}
    .present-stage.light .present-bar{background:rgba(251,245,235,.72);border-top:1px solid rgba(143,65,80,.12);}
    .pb-grp{display:flex;align-items:center;gap:8px;}
    .pb-btn{width:34px;height:34px;border-radius:50%;border:1px solid;background:transparent;font-size:19px;line-height:1;
      cursor:pointer;display:grid;place-items:center;transition:all .15s;}
    .pb-label{min-width:150px;text-align:center;font-weight:600;font-size:14px;letter-spacing:-.01em;}
    .pb-chip,.pb-toggle{border-radius:999px;border:1px solid;background:transparent;font-weight:600;cursor:pointer;
      font-family:inherit;transition:all .15s;}
    .pb-chip{padding:6px 11px;font-size:12px;}
    .pb-toggle{padding:7px 13px;font-size:12.5px;}
    .pb-chip.on,.pb-toggle.on{background:#8F4150;border-color:#8F4150 !important;color:#fff !important;}
    .pb-sel{padding:7px 10px;border-radius:10px;border:1px solid;font-size:12.5px;font-family:inherit;cursor:pointer;}
    .pb-hide{margin-left:2px;width:30px;height:30px;border-radius:50%;border:1px solid;background:transparent;cursor:pointer;
      font-size:14px;display:grid;place-items:center;}
    .present-stage.dark .pb-btn,.present-stage.dark .pb-chip,.present-stage.dark .pb-toggle,
    .present-stage.dark .pb-sel,.present-stage.dark .pb-hide{border-color:rgba(255,255,255,.16);color:#E9E0D3;}
    .present-stage.dark .pb-sel{background:rgba(255,255,255,.06);}
    .present-stage.dark .pb-label{color:#F4ECE0;}
    .present-stage.dark .pb-chip:not(.on){color:#C7BCAC;}
    .present-stage.light .pb-btn,.present-stage.light .pb-chip,.present-stage.light .pb-toggle,
    .present-stage.light .pb-sel,.present-stage.light .pb-hide{border-color:rgba(58,46,36,.2);color:#5A4636;}
    .present-stage.light .pb-sel{background:rgba(255,255,255,.5);}
    .present-stage.light .pb-label{color:#3A2E24;}
    .present-stage.light .pb-chip:not(.on){color:#6A5848;}
    .pb-peek{position:fixed;bottom:14px;left:50%;transform:translateX(-50%);z-index:100;padding:7px 16px;border-radius:999px;
      border:1px solid rgba(255,255,255,.18);background:rgba(20,16,12,.55);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);
      color:#EAE2D6;font-size:11px;font-weight:700;letter-spacing:3px;cursor:pointer;font-family:'Hanken Grotesk',system-ui,sans-serif;}
  `;
  document.head.appendChild(st);
}

function DevSeg({ options, value, onChange }) {
  return (
    <div className="dev-seg">
      {options.map((o) => (
        <button key={o} type="button" className={'dev-chip' + (value === o ? ' on' : '')} onClick={() => onChange(o)}>{o}</button>
      ))}
    </div>
  );
}

function DevRail() {
  const d = useDev();
  if (!d.devOn) return null;
  const active = d.screens.find((s) => s.id === d.screenId);
  return (
    <div className="dev-rail" data-dev>
      <div className="dev-title">Aura · Dev</div>
      <div className="dev-sub">not part of the app — review tooling</div>

      <div className="dev-h">Screen</div>
      <select className="dev-jump" value={d.screenId} aria-label="Jump to screen"
              onChange={(e) => d.setScreenId(e.target.value)}>
        {d.screens.map((s, i) => <option key={s.id} value={s.id}>{(i + 1) + '. ' + (s.label || s.id)}</option>)}
      </select>

      <div className="dev-h">Theme</div>
      <DevSeg options={['light', 'dark']} value={d.theme} onChange={d.setTheme} />

      <div className="dev-h">Account</div>
      <DevSeg options={['free', 'premium']} value={d.account} onChange={d.setAccount} />

      <div className="dev-h">Data state</div>
      <DevSeg options={['happy', 'empty', 'loading', 'error']} value={d.dataState} onChange={d.setDataState} />

      {active?.states?.length ? (
        <>
          <div className="dev-h">{(active.label || active.id) + ' state'}</div>
          <DevSeg options={active.states} value={d.screenState} onChange={d.setScreenState} />
        </>
      ) : null}

      {active?.companions?.length ? (
        <>
          <div className="dev-h">Companion model</div>
          <DevSeg options={active.companions} value={d.companion} onChange={d.setCompanion} />
        </>
      ) : null}

      <div className="dev-hint">Toggles drive <code>useDev()</code> — every screen should render each
        state. Add <code>?dev=0</code> to hide this rail for clean screenshots.</div>
    </div>
  );
}

// ── present-mode navigator · slim, on-brand, keyboard-driven (← → screens · T theme · H hide) ──
function PresentBar() {
  const { useState, useEffect } = React;
  const d = useDev();
  const [hidden, setHidden] = useState(false);
  const idx = d.screens.findIndex((s) => s.id === d.screenId);
  const active = d.screens[idx] || {};
  const go = (delta) => {
    if (!d.screens.length) return;
    const n = (idx + delta + d.screens.length) % d.screens.length;
    d.setScreenId(d.screens[n].id);
  };
  useEffect(() => {
    const onKey = (e) => {
      const t = e.target || {};
      const tag = (t.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || t.isContentEditable) return;
      if (e.key === 'ArrowRight') go(1);
      else if (e.key === 'ArrowLeft') go(-1);
      else if (e.key === 'h' || e.key === 'H') setHidden((v) => !v);
      else if (e.key === 't' || e.key === 'T') d.setTheme(d.theme === 'dark' ? 'light' : 'dark');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [idx, d.theme, d.screens]);

  if (hidden) return <button className="pb-peek" onClick={() => setHidden(false)} aria-label="Show controls">• • •</button>;
  return (
    <div className="present-bar" data-dev>
      <div className="pb-grp">
        <button className="pb-btn" onClick={() => go(-1)} aria-label="Previous screen">‹</button>
        <span className="pb-label">{active.label || active.id || ''}</span>
        <button className="pb-btn" onClick={() => go(1)} aria-label="Next screen">›</button>
      </div>
      {active.states && active.states.length ? (
        <div className="pb-grp">
          {active.states.map((s) => (
            <button key={s} className={'pb-chip' + (d.screenState === s ? ' on' : '')} onClick={() => d.setScreenState(s)}>{s}</button>
          ))}
        </div>
      ) : null}
      <div className="pb-grp">
        {active.companions && active.companions.length ? (
          <select className="pb-sel" value={d.companion} onChange={(e) => d.setCompanion(e.target.value)} aria-label="Companion">
            {active.companions.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        ) : null}
        <button className={'pb-toggle' + (d.account === 'premium' ? ' on' : '')} onClick={() => d.setAccount(d.account === 'premium' ? 'free' : 'premium')}>{d.account === 'premium' ? 'Premium' : 'Free'}</button>
        <button className="pb-toggle" onClick={() => d.setTheme(d.theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">{d.theme === 'dark' ? '☾ Dark' : '☀ Light'}</button>
        <button className="pb-hide" onClick={() => setHidden(true)} aria-label="Hide controls">×</button>
      </div>
    </div>
  );
}

// Lays out [rail][scaled frame] and fits the 402×874 device to the available canvas.
function DevStage({ children, frameW = 402, frameH = 874 }) {
  const { useRef, useEffect, useState } = React;
  const d = useDev();
  const canvasRef = useRef(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const fit = () => {
      const el = canvasRef.current; if (!el) return;
      const pad = 48;
      const s = Math.min((el.clientWidth - pad) / frameW, (el.clientHeight - pad) / frameH, 1);
      setScale(s > 0 ? s : 1);
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [frameW, frameH]);

  // Present mode: clean device on a warm backdrop + slim navigator (recording demos).
  if (PRESENT_ON) {
    return (
      <div className={'present-stage ' + (d.theme === 'dark' ? 'dark' : 'light')}>
        <div className="dev-stage-canvas" ref={canvasRef}>
          <div className="present-phone" style={{ width: frameW * scale, height: frameH * scale }}>
            <div className="dev-scaler" style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: frameW, height: frameH }}>{children}</div>
          </div>
        </div>
        <PresentBar />
      </div>
    );
  }

  if (!d.devOn) return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: d.theme === 'dark' ? '#000' : '#F2F2F7' }}>{children}</div>;

  // Outer box is sized to the SCALED dimensions so it occupies real layout space; the inner frame
  // is scaled from its top-left corner. (A bare transform:scale leaves a full-size layout box, which
  // is what forces the whole page to scroll — this avoids that.)
  return (
    <div className="dev-stage">
      <DevRail />
      <div className="dev-stage-canvas" ref={canvasRef}>
        <div style={{ width: frameW * scale, height: frameH * scale }}>
          <div className="dev-scaler" style={{ transform: `scale(${scale})`, transformOrigin: 'top left', width: frameW, height: frameH }}>{children}</div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DevProvider, useDev, DevRail, DevStage });
