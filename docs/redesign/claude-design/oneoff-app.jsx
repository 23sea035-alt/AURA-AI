/* ════════════════════════════════════════════════════════════════════════
   Aura — One-off / pushed screens  ·  SCAFFOLD ONLY
   Every screen you push to from the three tabs, as stubs wired into the dev
   rail. Each is a STUB (title + purpose + current dev-state) with a warm back
   affordance. Real content gets designed later (screens/oneoffs.md). chat is
   the hero and will reuse the firstchat components from the onboarding flow —
   don't rebuild them here. "Reading Nook" tokens — warm + opaque surfaces.
   ════════════════════════════════════════════════════════════════════════ */
const { useState } = React;

/* ── tokens · single source of truth → tokens.js (window.AURA) ──────────── */
const { FONTS, TOKENS } = window.AURA;
const FF_DISPLAY = FONTS.display;
const FF_BODY = FONTS.body;
function useT() { const { theme } = useDev(); return TOKENS[theme === 'dark' ? 'dark' : 'light']; }

/* ── SCREENS registry (pushed-from-tab destinations) ───────────────────────── */
const SCREENS = [
  { id: 'chat',        label: 'Chat conversation ★', states: ['default', 'typing', 'crisis', 'limit', 'report', 'break'], companions: ['Aurora', 'Orion', 'Lyra'], purpose: 'The 1:1 conversation — the heart of Aura.' },
  { id: 'create',      label: 'Companion create/edit', states: ['create', 'edit'], purpose: 'Create or customize a companion (premium).' },
  { id: 'memory',      label: 'Memory',              purpose: 'What your companion remembers about you. (states follow the Data-state toggle)' },
  { id: 'paywall',     label: 'Paywall',             purpose: 'Upgrade to Aura Premium. (default / owned follow the Account toggle)' },
  { id: 'submgmt',     label: 'Subscription',        purpose: 'Your subscription (both tiers) — Free shows plan + upgrade, Premium shows billing.' },
  { id: 'editprofile', label: 'Edit profile',        states: ['default', 'focus', 'error', 'saving'], purpose: 'Edit your name and profile details.' },
  { id: 'signin',      label: 'Sign-in & security',  states: ['password', 'google', 'apple', 'apple-hidden'], purpose: 'Email + password — editable for email/password, read-only for Google/Apple SSO.' },
  { id: 'account',     label: 'Account management',  states: ['default', 'export-sent', 'delete-confirm'], purpose: 'Export or delete your account data.' },
  { id: 'notifs',      label: 'Notifications',       states: ['default'], purpose: 'Choose what Aura notifies you about.' },
  { id: 'safety',      label: 'Safety center',       states: ['default'], purpose: 'Crisis resources and content controls.' },
  { id: 'legal',       label: 'Privacy / legal',     states: ['default'], purpose: 'Privacy policy, terms, and data use.' },
  { id: 'help',        label: 'Help / support',      states: ['default'], purpose: 'Get help or contact support.' },
  { id: 'states',      label: 'System-states kit',   states: ['empty', 'loading', 'error', 'offline', 'blocked'], purpose: 'Reusable empty / loading / error / offline / blocked.' },
];

/* ── shared BackChevron — bare left-chevron, neutral ink, 44pt tap target ───── */
function BackBtn({ href = 'HomeTabs.html' }) {
  const T = useT();
  const [press, setPress] = useState(false);
  return (
    <a href={href} aria-label="Back"
      onPointerDown={() => { setPress(true); if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(8); }}
      onPointerUp={() => setPress(false)} onPointerLeave={() => setPress(false)}
      style={{ width: 44, height: 44, marginLeft: -10, flex: 'none', display: 'grid', placeItems: 'center',
        background: 'transparent', border: 'none', color: T.textPrimary, cursor: 'pointer',
        textDecoration: 'none', padding: 0,
        transform: press ? 'scale(0.9)' : 'scale(1)', transition: 'transform .12s', WebkitTapHighlightColor: 'transparent' }}>
      <svg width="24" height="24" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true"><path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z"></path></svg>
    </a>
  );
}

/* ── warm top bar (back + screen label) ────────────────────────────────────── */
function TopBar({ label }) {
  const T = useT();
  return (
    <div style={{ flex: 'none', padding: '54px 16px 12px', background: T.bg, borderBottom: `1px solid ${T.divider}`,
      display: 'flex', alignItems: 'center', gap: 12 }}>
      <BackBtn />
      <span style={{ flex: 1, minWidth: 0, fontFamily: FF_DISPLAY, fontWeight: 600, fontSize: 18, color: T.textPrimary,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      <div style={{ width: 38, flex: 'none' }} />
    </div>
  );
}

/* ── the one stub used by every screen ─────────────────────────────────────── */
function Stub({ screen }) {
  const T = useT();
  const d = useDev();
  const stateName = screen.states && screen.states.length > 1 ? d.screenState : (screen.states ? screen.states[0] : null);
  const cleanLabel = screen.label.replace(/\s*★\s*$/, '');
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bg }}>
      <TopBar label={cleanLabel} />
      <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '24px 28px 40px' }}>
        <div style={{ fontFamily: FF_BODY, fontWeight: 600, fontSize: 11.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.textTertiary, marginBottom: 16 }}>
          Pushed screen
        </div>
        <h1 style={{ fontFamily: FF_DISPLAY, fontWeight: 600, fontSize: 34, lineHeight: 1.08, color: T.textPrimary, margin: '0 0 14px', letterSpacing: 0.2 }}>
          {cleanLabel}
        </h1>
        <p style={{ fontFamily: FF_BODY, fontSize: 16, lineHeight: 1.55, color: T.textSecondary, margin: 0, maxWidth: '28ch', textWrap: 'pretty' }}>
          {screen.purpose}
        </p>
        {stateName && (
          <div style={{ marginTop: 22, display: 'inline-flex', alignItems: 'center', gap: 7,
            fontFamily: FF_BODY, fontWeight: 600, fontSize: 12.5, color: T.accent,
            background: T.accentTint, border: `1px solid ${T.border}`, padding: '6px 14px', borderRadius: 999 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.accent }} />
            state · {stateName}
          </div>
        )}
        <div style={{ marginTop: 26, fontFamily: FF_BODY, fontSize: 12, color: T.textTertiary, opacity: 0.85 }}>
          Stub — design pending
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   CHAT — the hero. Reuses IOSDevice + IOSKeyboard (device chrome). All app
   surfaces read from window.AURA tokens. States: default·typing·crisis·limit·
   report, wired to the dev rail (+ account toggle gates `limit`).
   ════════════════════════════════════════════════════════════════════════ */
const { useEffect, useRef } = React;

const prefersReducedMotion = () => {
  try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
  catch (e) { return false; }
};

/* The conversation (verbatim demo persona). role: 'them' = Aurora, 'me' = Maya */
const THREAD = [
  { role: 'me',   text: "honestly the new job is kicking my butt this week 😮‍💨 imposter syndrome is loud" },
  { role: 'them', text: "That feeling makes complete sense, Maya. A few weeks into something new, the brain loves to whisper that everyone else has it figured out. They don't. What part is feeling the heaviest right now?" },
  { role: 'me',   text: "like everyone seems to already know the tools and the lingo and i'm just nodding along" },
  { role: 'them', text: "Nodding-along season is real, and temporary. You were hired for how you think, not for a glossary you'll pick up in a month. Want to name one thing that tripped you up today? We can make it less scary together." },
];

const CRISIS_TURN = [
  { role: 'me',   text: "some days lately it all just feels like too much. like i don't know how much longer i can keep doing this." },
  { role: 'them', text: "I'm really glad you told me, Maya, and I'm sorry it's this heavy right now. You don't have to carry it alone. I care about what happens to you." },
];

/* ── the warm hand-crafted companion mark (header only, never per-bubble) ──── */
/* The 3 vetted companions (02-mock-content.md) — Maya's primary is Aurora */
const COMPANIONS = {
  Aurora: { name: 'Aurora', glyph: 'A', avatar: null },        // null → theme-default dawn/amber-rose
  Orion:  { name: 'Orion',  glyph: 'O', avatar: '#A56B52' },   // dusk / deep-clay warm
  Lyra:   { name: 'Lyra',   glyph: 'L', avatar: '#D9A95E' },   // sunlit / honey warm
};

const AVATAR_IMG = { Aurora: 'aurora', Orion: 'orion', Lyra: 'lyra' };
function Avatar({ T, size = 36, glyph = 'A', name = 'Aurora' }) {
  // all AI avatars share the same theme background — differentiation is the portrait, not the bg color
  const base = T.avatar;
  const img = AVATAR_IMG[name];
  return (
    <div role="img" aria-label={`${name}, AI companion`} style={{
      width: size, height: size, flex: 'none', borderRadius: '50%', position: 'relative', overflow: 'hidden',
      background: `radial-gradient(120% 120% at 32% 26%, ${base} 0%, ${base} 38%, ${T.accent} 140%)`,
      boxShadow: T.e1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {img ? (
        <img src={`brand/avatars/${img}.png`} alt="" draggable="false"
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 8%', display: 'block' }} />
      ) : (
        <span style={{ fontFamily: FF_DISPLAY, fontWeight: 600, fontSize: size * 0.5, lineHeight: size + 'px',
          color: T.avatarText }}>{glyph}</span>
      )}
      <span style={{ position: 'absolute', inset: 0, borderRadius: '50%',
        boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.35)', pointerEvents: 'none' }} />
    </div>
  );
}

/* ── header ────────────────────────────────────────────────────────────────── */
function ChatHeader({ T, onMenu, menuOpen, model }) {
  return (
    <div style={{ flex: 'none', padding: '54px 12px 12px', background: T.bg, borderBottom: `1px solid ${T.divider}`,
      boxShadow: T.e1, display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 30 }}>
      <BackBtn />
      <Avatar T={T} size={38} glyph={model.glyph} color={model.avatar} name={model.name} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontFamily: FF_DISPLAY, fontWeight: 600, fontSize: 19, lineHeight: 1.1, color: T.textPrimary,
          letterSpacing: '-0.01em' }}>{model.name}</span>
        <span style={{ fontFamily: FF_BODY, fontWeight: 500, fontSize: 11.5, lineHeight: 1, color: T.textTertiary,
          letterSpacing: '0.01em' }}>AI companion</span>
      </div>
      <button type="button" aria-label="Conversation options" aria-haspopup="menu" aria-expanded={menuOpen} onClick={onMenu}
        style={{ width: 38, height: 38, flex: 'none', borderRadius: '50%', display: 'grid', placeItems: 'center',
          background: menuOpen ? T.accentTint : 'transparent', border: 'none', color: T.textSecondary, cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent', transition: 'background .15s' }}>
        <svg width="22" height="6" viewBox="0 0 22 6"><circle cx="3" cy="3" r="2.5" fill="currentColor"/><circle cx="11" cy="3" r="2.5" fill="currentColor"/><circle cx="19" cy="3" r="2.5" fill="currentColor"/></svg>
      </button>
    </div>
  );
}

function OverflowMenu({ T, onClose, onReport }) {
  const d = useDev();
  const item = (label, onClick, danger) => (
    <button type="button" role="menuitem" onClick={() => { onClose(); onClick(); }}
      style={{ display: 'block', width: '100%', textAlign: 'left', padding: '12px 16px', background: 'transparent', border: 'none',
        fontFamily: FF_BODY, fontWeight: 500, fontSize: 15, color: danger ? T.textSecondary : T.textPrimary, cursor: 'pointer',
        WebkitTapHighlightColor: 'transparent' }}>{label}</button>
  );
  return (
    <>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 40 }} />
      <div role="menu" style={{ position: 'absolute', top: 92, right: 14, zIndex: 50, width: 208, padding: '4px 0',
        background: T.sheet, borderRadius: T.RADIUS?.card || 16, border: `1px solid ${T.border}`, boxShadow: T.e3, overflow: 'hidden' }}>
        {item('Companion settings', () => d.setScreenId('create'))}
        <div style={{ height: 1, background: T.divider, margin: '2px 0' }} />
        {item('View memory', () => d.setScreenId('memory'))}
        <div style={{ height: 1, background: T.divider, margin: '2px 0' }} />
        {item('Report', onReport, true)}
      </div>
    </>
  );
}

/* ── AI disclosure · anchored at the conversation start, shown in full on open ─ */
function DisclosureBanner({ T, onDismiss }) {
  return (
    <div role="note" aria-label="Aurora is an AI companion. She's here for support, not a substitute for professional care."
      style={{ display: 'flex', alignItems: 'flex-start', gap: 10, margin: '4px 16px 14px', padding: '11px 13px',
        background: T.raised, borderRadius: T.card || 16, border: `1px solid ${T.border}` }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={T.textTertiary} strokeWidth="1.8" style={{ flex: 'none', marginTop: 1 }}>
        <circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01" strokeLinecap="round"/></svg>
      <span style={{ flex: 1, fontFamily: FF_BODY, fontSize: 12.5, lineHeight: 1.46, color: T.textSecondary, textWrap: 'pretty' }}>
        Aurora is an AI companion. She's here for support, not a substitute for professional care.</span>
      <button type="button" aria-label="Dismiss" onClick={onDismiss}
        style={{ flex: 'none', width: 22, height: 22, marginTop: -1, borderRadius: '50%', display: 'grid', placeItems: 'center',
          background: 'transparent', border: 'none', color: T.textTertiary, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>
  );
}

/* ── gentle break reminder (after a long session, dismissible) ─────────────── */
function BreakReminder({ T, onDismiss }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'center', margin: '6px 0 16px', padding: '8px 14px',
      background: T.accentTint, borderRadius: T.pill || 999, maxWidth: '86%' }}>
      <span style={{ flex: 1, fontFamily: FF_BODY, fontSize: 12, lineHeight: 1.4, color: T.accent, textAlign: 'center', textWrap: 'pretty' }}>
        You've been chatting a while. Aurora will be here whenever you come back.
        <svg width="12" height="12" viewBox="0 0 24 24" fill={T.accent} aria-hidden="true" style={{ display: 'inline-block', verticalAlign: '-1px', marginLeft: 4 }}><path d="M12 21s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.4-7 10-7 10Z"/></svg></span>
      <button type="button" aria-label="Dismiss reminder" onClick={onDismiss}
        style={{ flex: 'none', width: 18, height: 18, borderRadius: '50%', display: 'grid', placeItems: 'center', background: 'transparent',
          border: 'none', color: T.accent, cursor: 'pointer', opacity: 0.7, WebkitTapHighlightColor: 'transparent' }}>
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>
  );
}

/* ── bubble · intimate surface, soft, no outline ───────────────────────────── */
function Bubble({ T, role, children, gap = 18, enter = true, onLongPress }) {
  const me = role === 'me';
  const pressTimer = useRef(null);
  const start = () => { if (onLongPress) pressTimer.current = setTimeout(onLongPress, 480); };
  const cancel = () => { if (pressTimer.current) clearTimeout(pressTimer.current); };
  return (
    <div onPointerDown={start} onPointerUp={cancel} onPointerLeave={cancel}
      style={{ display: 'flex', justifyContent: me ? 'flex-end' : 'flex-start', marginTop: gap,
        animation: enter ? 'auraRise .42s cubic-bezier(.22,.8,.32,1) both' : 'none' }}>
      <div style={{ maxWidth: me ? '76%' : '81%', padding: '11px 15px',
        background: me ? T.bubbleBg : T.sheet, color: me ? T.bubbleText : T.textPrimary,
        borderRadius: me ? '18px 18px 6px 18px' : '18px 18px 18px 6px',
        boxShadow: T.e1, fontFamily: FF_BODY, fontSize: 15.5, lineHeight: 1.56, textWrap: 'pretty' }}>
        {children}
      </div>
    </div>
  );
}

/* ── typing: three-dot thinking → calm clause-grouped reveal (lands softly) ── */
function TypingBubble({ T, full, onDone }) {
  const [shown, setShown] = useState('');
  const [thinking, setThinking] = useState(true);
  useEffect(() => {
    let cancelled = false;
    if (prefersReducedMotion()) {                       // reduce-motion → snap to final
      setThinking(false); setShown(full); onDone && onDone(); return;
    }
    const groups = full.match(/[^ ]+ ?/g) || [full];    // word/clause groups
    const chunks = [];
    for (let i = 0; i < groups.length; i += 2) chunks.push(groups.slice(i, i + 2).join(''));
    const t0 = setTimeout(() => {                        // a beat of "thinking" first
      if (cancelled) return;
      setThinking(false);
      let i = 0, acc = '';
      const tick = () => {
        if (cancelled) return;
        acc += chunks[i]; setShown(acc); i++;
        if (i < chunks.length) {
          const ease = 1 + (i / chunks.length) * 1.4;    // decelerate so it lands
          setTimeout(tick, 90 * ease);
        } else { onDone && onDone(); }
      };
      tick();
    }, 900);
    return () => { cancelled = true; clearTimeout(t0); };
  }, [full]);

  if (thinking) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 18 }}>
        <div style={{ padding: '13px 17px', background: T.sheet, borderRadius: '18px 18px 18px 6px', boxShadow: T.e1,
          display: 'flex', gap: 5, alignItems: 'center' }} aria-label="Aurora is typing">
          {[0, 1, 2].map(i => (
            <span key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: T.textTertiary,
              animation: `auraDot 1.2s ${i * 0.16}s infinite ease-in-out` }} />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 18 }}>
      <div style={{ maxWidth: '81%', padding: '11px 15px', background: T.sheet, color: T.textPrimary,
        borderRadius: '18px 18px 18px 6px', boxShadow: T.e1, fontFamily: FF_BODY, fontSize: 15.5, lineHeight: 1.56, minHeight: 22 }}>
        {shown}
      </div>
    </div>
  );
}

/* ── crisis · grounding support block (calm green token, never alarm-red) ──── */
function CrisisCard({ T }) {
  const action = (label, href, primary) => (
    <a href={href} aria-label={label} style={{ flex: 1, textAlign: 'center', padding: '12px 8px', borderRadius: T.soft || 12,
      fontFamily: FF_BODY, fontWeight: 600, fontSize: 15, textDecoration: 'none', WebkitTapHighlightColor: 'transparent',
      background: primary ? T.crisis : 'transparent', color: primary ? '#FFFCF6' : T.crisisText,
      border: primary ? 'none' : `1.5px solid ${T.crisis}` }}>{label}</a>
  );
  return (
    <div role="group" aria-label="Crisis support resources" style={{ marginTop: 16, padding: '16px 16px 15px',
      background: T.crisisBg, borderRadius: T.card || 16, animation: 'auraFade 1.1s ease both' }}>
      <p style={{ margin: '0 0 13px', fontFamily: FF_BODY, fontSize: 14.5, lineHeight: 1.5, color: T.crisisText, textWrap: 'pretty' }}>
        If you're thinking about harming yourself, please reach out. People want to help.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
        <div style={{ fontFamily: FF_BODY, fontSize: 13.5, lineHeight: 1.5, color: T.crisisText2 }}>
          <strong style={{ color: T.crisisText, fontWeight: 600 }}>Call or text 988</strong>: Suicide &amp; Crisis Lifeline (US, 24/7)</div>
        <div style={{ fontFamily: FF_BODY, fontSize: 13.5, lineHeight: 1.5, color: T.crisisText2 }}>
          <strong style={{ color: T.crisisText, fontWeight: 600 }}>Text HOME to 741741</strong>: Crisis Text Line</div>
      </div>
      <div style={{ display: 'flex', gap: 9 }}>
        {action('Call 988', 'tel:988', true)}
        {action('Text 988', 'sms:988', false)}
      </div>
      <p style={{ margin: '12px 0 0', fontFamily: FF_BODY, fontSize: 12.5, lineHeight: 1.5, color: T.crisisText2, textAlign: 'center' }}>
        You can keep talking with Aurora too. She's here.</p>
    </div>
  );
}

/* ── limit · gentle inline end-of-thread care card (free only) ─────────────── */
function LimitCard({ T }) {
  const d = useDev();
  return (
    <div style={{ marginTop: 18, padding: '18px 18px 16px', background: T.raised, borderRadius: T.card || 16,
      border: `1px solid ${T.border}`, textAlign: 'center', animation: 'auraFade .9s ease both' }}>
      <div style={{ fontFamily: FF_DISPLAY, fontWeight: 600, fontSize: 18, lineHeight: 1.2, color: T.textPrimary, marginBottom: 7 }}>
        That's 30 for today</div>
      <p style={{ margin: '0 0 15px', fontFamily: FF_BODY, fontSize: 14, lineHeight: 1.5, color: T.textSecondary, textWrap: 'pretty' }}>
        You've reached today's 30 free messages. Aurora will be here tomorrow, or go unlimited with Premium.</p>
      <button type="button" onClick={() => d.setScreenId('paywall')}
        style={{ padding: '11px 24px', borderRadius: T.pill || 999, background: T.accent, color: T.onAccent, border: 'none',
          fontFamily: FF_BODY, fontWeight: 600, fontSize: 14.5, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
        See Premium</button>
    </div>
  );
}

/* ── report · low-friction bottom sheet ────────────────────────────────────── */
const REPORT_REASONS = ['Inappropriate', 'Harmful', 'Not helpful', 'Other'];
function ReportSheet({ T, onClose, onSubmit }) {
  const [reason, setReason] = useState(null);
  const [note, setNote] = useState('');
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 70, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(20,12,6,0.34)', animation: 'auraFade .2s ease both' }} />
      <div role="dialog" aria-label="Report this message" style={{ position: 'relative', background: T.sheet, borderRadius: '24px 24px 0 0',
        padding: '10px 18px calc(18px + env(safe-area-inset-bottom))', boxShadow: T.e3, animation: 'auraSheet .32s cubic-bezier(.22,.8,.32,1) both' }}>
        <div style={{ width: 38, height: 4, borderRadius: 999, background: T.border, margin: '0 auto 16px' }} />
        <h2 style={{ margin: '0 0 4px', fontFamily: FF_DISPLAY, fontWeight: 600, fontSize: 20, color: T.textPrimary }}>Help us keep Aura safe</h2>
        <p style={{ margin: '0 0 16px', fontFamily: FF_BODY, fontSize: 13.5, lineHeight: 1.5, color: T.textSecondary }}>
          Tell us what felt off. This is private and won't interrupt your chat.</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
          {REPORT_REASONS.map(r => {
            const on = reason === r;
            return (
              <button key={r} type="button" onClick={() => setReason(r)}
                style={{ padding: '9px 16px', borderRadius: T.pill || 999, cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
                  fontFamily: FF_BODY, fontWeight: 600, fontSize: 13.5, transition: 'all .15s',
                  background: on ? T.accent : T.raised, color: on ? T.onAccent : T.textSecondary,
                  border: `1px solid ${on ? T.accent : T.border}` }}>{r}</button>
            );
          })}
        </div>
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note (optional)" rows={2}
          style={{ width: '100%', resize: 'none', padding: '12px 14px', borderRadius: T.soft || 12, background: T.raised,
            border: `1px solid ${T.border}`, color: T.textPrimary, fontFamily: FF_BODY, fontSize: 14.5, lineHeight: 1.5,
            outline: 'none', marginBottom: 16, boxSizing: 'border-box' }} />
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={onClose}
            style={{ flex: '0 0 auto', padding: '13px 22px', borderRadius: T.pill || 999, background: 'transparent',
              border: `1px solid ${T.border}`, color: T.textSecondary, fontFamily: FF_BODY, fontWeight: 600, fontSize: 15,
              cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>Cancel</button>
          <button type="button" disabled={!reason} onClick={onSubmit}
            style={{ flex: 1, padding: '13px', borderRadius: T.pill || 999, border: 'none',
              background: reason ? T.accent : T.border, color: reason ? T.onAccent : T.textTertiary,
              fontFamily: FF_BODY, fontWeight: 600, fontSize: 15, cursor: reason ? 'pointer' : 'default',
              WebkitTapHighlightColor: 'transparent' }}>Submit report</button>
        </div>
      </div>
    </div>
  );
}

function Toast({ T, text }) {
  return (
    <div role="status" style={{ position: 'absolute', left: 0, right: 0, bottom: 'calc(28px + env(safe-area-inset-bottom))', zIndex: 80,
      display: 'flex', justifyContent: 'center', pointerEvents: 'none', animation: 'auraToast 2.6s ease both' }}>
      <div style={{ padding: '11px 18px', background: T.textPrimary, color: T.bg, borderRadius: T.pill || 999, boxShadow: T.e3,
        fontFamily: FF_BODY, fontWeight: 500, fontSize: 14 }}>{text}</div>
    </div>
  );
}

/* ── input dock · structural surface (warm hairline, send when non-empty) ──── */
function InputDock({ T, disabled, value, onChange, onFocus, onBlur, onSend, disabledHint }) {
  const [focused, setFocused] = useState(false);
  const CAP = 2000;
  const count = value.length;
  const near = count >= CAP * 0.8;
  const over = count >= CAP * 0.94;
  const hasText = value.trim().length > 0;
  return (
    <div style={{ flex: 'none', background: T.bg, padding: focused ? '10px 12px 10px' : '10px 12px 40px' }}>
      {disabled && disabledHint && (
        <div style={{ fontFamily: FF_BODY, fontSize: 12, color: T.textTertiary, textAlign: 'center', padding: '2px 0 9px' }}>{disabledHint}</div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 8, padding: '8px 8px 8px 14px',
          background: disabled ? T.raised : T.sheet, border: `1px solid ${T.border}`, borderRadius: 20,
          opacity: disabled ? 0.6 : 1 }}>
          <textarea value={value} disabled={disabled} onFocus={() => { setFocused(true); onFocus && onFocus(); }} onBlur={() => { setFocused(false); onBlur && onBlur(); }}
            onChange={e => onChange(e.target.value.slice(0, CAP))}
            placeholder="Message Aurora" rows={1} aria-label="Message Aurora"
            style={{ flex: 1, resize: 'none', border: 'none', outline: 'none', background: 'transparent', maxHeight: 96,
              fontFamily: FF_BODY, fontSize: 15.5, lineHeight: 1.45, color: T.textPrimary, padding: '4px 0' }} />
          {near && (
            <span aria-hidden="true" style={{ flex: 'none', fontFamily: FF_BODY, fontWeight: over ? 600 : 500, fontSize: 11.5,
              color: over ? T.accent : T.textTertiary, padding: '0 2px 4px', transition: 'color .2s' }}>
              {CAP - count}</span>
          )}
        </div>
        <button type="button" aria-label="Send" disabled={disabled || !hasText} onClick={onSend}
          style={{ flex: 'none', width: 40, height: 40, borderRadius: '50%', display: 'grid', placeItems: 'center',
            background: hasText && !disabled ? T.accent : T.raised, color: hasText && !disabled ? T.onAccent : T.textTertiary,
            border: hasText && !disabled ? 'none' : `1px solid ${T.border}`, cursor: hasText && !disabled ? 'pointer' : 'default',
            boxShadow: hasText && !disabled ? T.e1 : 'none', WebkitTapHighlightColor: 'transparent', transition: 'background .15s, color .15s' }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>
        </button>
      </div>
    </div>
  );
}

/* ── the chat screen ───────────────────────────────────────────────────────── */
function ChatScreen({ onFocusChange }) {
  const T = useT();
  const d = useDev();
  const st = d.screenState || 'default';
  const isLimit = st === 'limit' && d.account === 'free';
  const model = COMPANIONS[d.companion] || COMPANIONS.Aurora;

  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [toast, setToast] = useState(false);
  const [showDisclosure, setShowDisclosure] = useState(true);
  const [showBreak, setShowBreak] = useState(true);  // long-session reminder — previews under the `break` rail state
  const [draft, setDraft] = useState('');
  const [typingDone, setTypingDone] = useState(false);
  const threadRef = useRef(null);

  // reset transient typing reveal whenever we (re)enter the typing state
  useEffect(() => { setTypingDone(false); }, [st]);

  // Option A: the AI disclosure is anchored at the conversation's start and shown in full when it
  // opens; states that append a bottom element (typing/crisis/limit/break) scroll to the newest.
  // (Real app: a FRESH conversation opens at the top like this; an ongoing one opens at the newest,
  // so the disclosure simply scrolls into history. The header's "AI companion" label is always on.)
  useEffect(() => {
    const el = threadRef.current; if (!el) return;
    el.scrollTop = st === 'default' ? 0 : el.scrollHeight;
  }, [st, typingDone]);

  const submitReport = () => { setReportOpen(false); setToast(true); setTimeout(() => setToast(false), 2600); };

  const messages = st === 'crisis' ? THREAD.concat(CRISIS_TURN) : THREAD;

  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', background: T.bg }}>
      <ChatHeader T={T} model={model} menuOpen={menuOpen} onMenu={() => setMenuOpen(v => !v)} />
      {menuOpen && <OverflowMenu T={T} onClose={() => setMenuOpen(false)} onReport={() => setReportOpen(true)} />}

      <div ref={threadRef} className="aura-noscroll" style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 8px', display: 'flex', flexDirection: 'column' }}>
        {showDisclosure && <DisclosureBanner T={T} onDismiss={() => setShowDisclosure(false)} />}

        <div style={{ alignSelf: 'center', fontFamily: FF_DISPLAY, fontWeight: 500, fontSize: 13, color: T.textTertiary,
          letterSpacing: '0.02em', margin: '0 0 4px' }}>Today</div>

        {messages.map((m, i) => (
          <Bubble key={i} T={T} role={m.role} enter={false}
            gap={i > 0 && messages[i - 1].role === m.role ? 4 : 18}
            onLongPress={m.role === 'them' ? () => setReportOpen(true) : null}>
            {m.text}
          </Bubble>
        ))}

        {st === 'crisis' && <CrisisCard T={T} />}

        {st === 'typing' && (
          <TypingBubble T={T} full="Here's the thing I keep coming back to with you…" onDone={() => setTypingDone(true)} />
        )}

        {isLimit && <LimitCard T={T} />}

        {showBreak && st === 'break' && <BreakReminder T={T} onDismiss={() => setShowBreak(false)} />}

        <div style={{ height: 4 }} />
      </div>

      <InputDock T={T} value={draft} onChange={setDraft}
        disabled={isLimit}
        disabledHint={isLimit ? 'Messages are paused until tomorrow' : null}
        onFocus={() => onFocusChange(true)} onBlur={() => onFocusChange(false)}
        onSend={() => setDraft('')} />

      {(reportOpen || st === 'report') && <ReportSheet T={T} onClose={() => setReportOpen(false)} onSubmit={submitReport} />}
      {toast && <Toast T={T} text="Thanks, we'll review this." />}
    </div>
  );
}

/* keyframes (one-time inject; app-level, not device chrome) */
if (typeof document !== 'undefined' && !document.getElementById('aura-chat-anim')) {
  const s = document.createElement('style');
  s.id = 'aura-chat-anim';
  s.textContent = `
    @keyframes auraRise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
    @keyframes auraFade{from{opacity:0}to{opacity:1}}
    @keyframes auraSheet{from{transform:translateY(100%)}to{transform:none}}
    @keyframes auraPop{from{transform:scale(.6);opacity:0}to{transform:scale(1);opacity:1}}
    @keyframes auraDot{0%,60%,100%{transform:translateY(0);opacity:.45}30%{transform:translateY(-4px);opacity:1}}
    @keyframes auraToast{0%{opacity:0;transform:translateY(8px)}12%,82%{opacity:1;transform:none}100%{opacity:0;transform:translateY(8px)}}
    @keyframes auraSpin{to{transform:rotate(360deg)}}
    @keyframes auraBreath{0%,100%{opacity:1}50%{opacity:.45}}
    .aura-noscroll{scrollbar-width:none;-ms-overflow-style:none}
    .aura-noscroll::-webkit-scrollbar{width:0;height:0;display:none}
    @media (prefers-reduced-motion: reduce){
      [style*="auraRise"],[style*="auraSheet"],[style*="auraPop"]{animation:auraFade .25s ease both !important}
    }`;
  document.head.appendChild(s);
}

/* ════════════════════════════════════════════════════════════════════════
   CREATE / EDIT — Companion create & customize (premium-gated).
   One grouped form, top→bottom: avatar + change-look · (create) base-persona
   picker / (edit) locked base header · 3 left-labeled 3-segment trait controls
   (SELECTED = neutral raised fill, never accent) · inline prose voice-preview ·
   editable name (auto-numbering) · Save (the ONE accent fill). free/account =
   whole creator dimmed behind ONE Unlock door. Both themes. All from window.AURA.
   ════════════════════════════════════════════════════════════════════════ */
const { SPACE, RADIUS, TYPE } = window.AURA;

/* canonical personas (from personas.md) + the create-screen default tune */
const PERSONAS = {
  Aurora: { line: 'Warm and gentle, a soft place to land.', tone: '#D8A98C',
            traits: { warmth: 'affectionate', energy: 'balanced', verbosity: 'balanced' } },
  Orion:  { line: 'Steady and grounded, a calm anchor.',    tone: '#A56B52',
            traits: { warmth: 'warm', energy: 'calm', verbosity: 'concise' } },
  Lyra:   { line: 'Bright and playful, lifts the mood.',     tone: '#D9A95E',
            traits: { warmth: 'warm', energy: 'playful', verbosity: 'expansive' } },
};
const PERSONA_ORDER = ['Aurora', 'Orion', 'Lyra'];

const AXES = [
  { key: 'warmth',    label: 'Warmth',    options: ['reserved', 'warm', 'affectionate'] },
  { key: 'energy',    label: 'Energy',    options: ['calm', 'balanced', 'playful'] },
  { key: 'verbosity', label: 'Verbosity', options: ['concise', 'balanced', 'expansive'] },
];

/* curated, swap-not-upload looks (mood / presence-state variants of the master) */
const LOOKS = [
  { id: 'default', label: 'Default', filter: 'none' },
  { id: 'cozy',    label: 'Cozy',    filter: 'saturate(1.14) brightness(1.03)' },
  { id: 'evening', label: 'Evening', filter: 'brightness(0.9) saturate(0.96) hue-rotate(-7deg)' },
  { id: 'bright',  label: 'Bright',  filter: 'brightness(1.08) saturate(1.16)' },
  { id: 'quiet',   label: 'Quiet',   filter: 'contrast(0.93) brightness(1.05) saturate(0.92)' },
];

/* the user already has one Aurora → a second becomes "Aurora 2" */
const EXISTING_NAMES = ['Aurora'];
function autoName(base) {
  if (!EXISTING_NAMES.includes(base)) return base;
  let n = 2;
  while (EXISTING_NAMES.includes(`${base} ${n}`)) n++;
  return `${base} ${n}`;
}

/* prose voice-preview composed from the three chips (warmth-led, calm tail) */
const WARMTH_TAIL = { reserved: 'measured and gives you room', warm: 'warm and kind', affectionate: 'warm, gentle, emotionally attuned' };
const ENERGY_TAIL = { calm: 'unhurried', playful: 'with a light, playful lift' };
const VERB_TAIL   = { concise: 'keeping it brief', expansive: 'taking its time' };
function voicePreview(tr) {
  const chips = [tr.warmth, tr.energy, tr.verbosity].map(s => s[0].toUpperCase() + s.slice(1)).join(' · ');
  let tail = WARMTH_TAIL[tr.warmth];
  if (tr.energy !== 'balanced') tail += `, ${ENERGY_TAIL[tr.energy]}`;
  if (tr.verbosity !== 'balanced') tail += `, ${VERB_TAIL[tr.verbosity]}`;
  return { chips, tail: tail + '.' };
}

const cap = s => s[0].toUpperCase() + s.slice(1);

/* ── left-labeled 3-segment control · selected = NEUTRAL raised fill ───────── */
function SegRow({ T, label, options, value, onChange, disabled, isLast }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.md, padding: `${SPACE.md}px ${SPACE.lg}px`,
      borderBottom: isLast ? 'none' : `1px solid ${T.divider}` }}>
      <span style={{ flex: '0 0 76px', fontFamily: FF_BODY, fontWeight: 600, fontSize: TYPE.label.fontSize,
        color: T.textSecondary, letterSpacing: '0.005em' }}>{label}</span>
      <div role="radiogroup" aria-label={label} style={{ flex: 1, display: 'flex', gap: 3, padding: 3,
        background: T.bg, border: `1px solid ${T.border}`, borderRadius: RADIUS.edit }}>
        {options.map(o => {
          const on = value === o;
          return (
            <button key={o} type="button" role="radio" aria-checked={on} disabled={disabled}
              onClick={() => onChange(o)}
              style={{ flex: 1, minWidth: 0, padding: '7px 4px', borderRadius: RADIUS.tight + 2, cursor: disabled ? 'default' : 'pointer',
                border: 'none', fontFamily: FF_BODY, fontSize: 12.5, fontWeight: on ? 600 : 500,
                letterSpacing: '0.005em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                background: on ? T.sheet : 'transparent', color: on ? T.textPrimary : T.textSecondary,
                boxShadow: on ? T.e1 : 'none', WebkitTapHighlightColor: 'transparent',
                transition: 'background .16s, color .16s, transform .1s' }}
              onPointerDown={e => { if (!disabled) e.currentTarget.style.transform = 'scale(0.96)'; }}
              onPointerUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              onPointerLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
              {cap(o)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── base-persona picker card (create only) · neutral raised/selected ──────── */
function PersonaCard({ T, name, selected, onSelect }) {
  const p = PERSONAS[name];
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected}
      style={{ display: 'flex', alignItems: 'center', gap: SPACE.md, width: '100%', textAlign: 'left',
        padding: '11px 13px', borderRadius: RADIUS.soft, cursor: 'pointer',
        background: selected ? T.sheet : T.raised, border: `1.5px solid ${selected ? T.textSecondary : 'transparent'}`,
        boxShadow: selected ? T.e2 : T.e1, WebkitTapHighlightColor: 'transparent',
        transition: 'box-shadow .18s, border-color .18s, background .18s' }}>
      <Avatar T={T} size={42} glyph={name[0]} color={p.tone} name={name} />
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontFamily: FF_DISPLAY, fontWeight: 600, fontSize: 16.5, color: T.textPrimary, letterSpacing: '-0.01em' }}>{name}</span>
        <span style={{ fontFamily: FF_BODY, fontSize: 12.5, lineHeight: 1.35, color: T.textSecondary, textWrap: 'pretty' }}>{p.line}</span>
      </span>
      <span aria-hidden="true" style={{ flex: 'none', width: 22, height: 22, borderRadius: '50%', display: 'grid', placeItems: 'center',
        background: selected ? T.textPrimary : 'transparent', border: selected ? 'none' : `1.5px solid ${T.border}`,
        transition: 'background .18s' }}>
        {selected && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.bg} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4.5 4.5L19 6.5"/></svg>}
      </span>
    </button>
  );
}

/* ── curated look gallery · bottom sheet (swap, never upload) ──────────────── */
function LookSheet({ T, persona, value, onPick, onClose }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 70, overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(20,12,6,0.34)', animation: 'auraFade .2s ease both' }} />
      <div role="dialog" aria-label="Choose a look" style={{ position: 'relative', background: T.sheet, borderRadius: '24px 24px 0 0',
        padding: '10px 18px calc(20px + env(safe-area-inset-bottom))', boxShadow: T.e3, animation: 'auraSheet .32s cubic-bezier(.22,.8,.32,1) both' }}>
        <div style={{ width: 38, height: 4, borderRadius: 999, background: T.border, margin: '0 auto 16px' }} />
        <h2 style={{ margin: '0 0 4px', fontFamily: FF_DISPLAY, fontWeight: 600, fontSize: 20, color: T.textPrimary }}>Choose a look</h2>
        <p style={{ margin: '0 0 18px', fontFamily: FF_BODY, fontSize: 13.5, lineHeight: 1.5, color: T.textSecondary }}>
          Curated looks for {persona}. Same companion, different mood. Pick the one that feels right.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
          {LOOKS.map(lk => {
            const on = value === lk.id;
            return (
              <button key={lk.id} type="button" onClick={() => onPick(lk.id)} aria-pressed={on}
                style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7, padding: '10px 6px 9px',
                  borderRadius: RADIUS.soft, cursor: 'pointer', background: on ? T.raised : 'transparent',
                  border: `1.5px solid ${on ? T.textSecondary : T.border}`, boxShadow: on ? T.e1 : 'none',
                  WebkitTapHighlightColor: 'transparent', transition: 'all .16s' }}>
                <div style={{ position: 'relative', width: 60, height: 60, borderRadius: '50%', overflow: 'hidden',
                  background: `radial-gradient(120% 120% at 32% 26%, ${T.avatar} 0%, ${T.avatar} 38%, ${T.accent} 150%)` }}>
                  <img src={`brand/avatars/${AVATAR_IMG[persona]}.png`} alt="" draggable="false"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 8%', filter: lk.filter }} />
                  {on && <span style={{ position: 'absolute', right: 2, bottom: 2, width: 19, height: 19, borderRadius: '50%',
                    background: T.textPrimary, display: 'grid', placeItems: 'center', boxShadow: T.e1 }}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke={T.bg} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4.5 4.5L19 6.5"/></svg>
                  </span>}
                </div>
                <span style={{ fontFamily: FF_BODY, fontWeight: on ? 600 : 500, fontSize: 12, color: on ? T.textPrimary : T.textSecondary }}>{lk.label}</span>
              </button>
            );
          })}
        </div>
        <button type="button" onClick={onClose}
          style={{ width: '100%', padding: '13px', borderRadius: RADIUS.pill, border: 'none', background: T.accent, color: T.onAccent,
            fontFamily: FF_BODY, fontWeight: 600, fontSize: 15, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>Done</button>
      </div>
    </div>
  );
}

/* ── section label (secondary-text, structural) ───────────────────────────── */
function SectionLabel({ T, children, style }) {
  return (
    <div style={{ fontFamily: FF_BODY, fontWeight: 600, fontSize: 11.5, letterSpacing: '0.13em', textTransform: 'uppercase',
      color: T.textTertiary, margin: '0 4px 9px', ...style }}>{children}</div>
  );
}

function CreateScreen() {
  const T = useT();
  const d = useDev();
  const isEdit = d.screenState === 'edit';
  const locked = d.account === 'free';

  // create starts on Aurora; edit opens an existing companion (locked base)
  const [base, setBase] = useState(isEdit ? 'Aurora' : 'Aurora');
  const [traits, setTraits] = useState(PERSONAS.Aurora.traits);
  const [name, setName] = useState(isEdit ? 'Aurora' : autoName('Aurora'));
  const [nameTouched, setNameTouched] = useState(isEdit);
  const [look, setLook] = useState('default');
  const [lookOpen, setLookOpen] = useState(false);
  const [savePress, setSavePress] = useState(false);

  // entering edit vs create resets the seed
  useEffect(() => {
    setBase('Aurora');
    setTraits(PERSONAS.Aurora.traits);
    setName(isEdit ? 'Aurora' : autoName('Aurora'));
    setNameTouched(isEdit);
    setLook('default');
  }, [isEdit]);

  const selectBase = (n) => {
    setBase(n);
    setTraits(PERSONAS[n].traits);
    setLook('default');
    if (!nameTouched) setName(autoName(n));
  };
  const setAxis = (key, val) => setTraits(t => ({ ...t, [key]: val }));

  const pv = voicePreview(traits);
  const showAutoHint = !isEdit && !nameTouched && name !== base;
  const lookFilter = (LOOKS.find(l => l.id === look) || LOOKS[0]).filter;

  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', background: T.bg }}>
      <TopBar label={isEdit ? 'Edit companion' : 'New companion'} />

      {/* scrollable grouped form — free can scroll to preview the whole creator, but it stays
          dimmed + non-interactive (pointer-events off on the CONTENT, not the scroller, so it still scrolls) */}
      <div className="aura-noscroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 22px' }}>
        <div style={{ opacity: locked ? 0.5 : 1, pointerEvents: locked ? 'none' : 'auto',
          filter: locked ? 'saturate(0.85)' : 'none', transition: 'opacity .2s' }} aria-disabled={locked}>

        {/* avatar + change look */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div style={{ position: 'relative', width: 96, height: 96, borderRadius: '50%', overflow: 'hidden', boxShadow: T.e2,
            background: `radial-gradient(120% 120% at 32% 26%, ${T.avatar} 0%, ${T.avatar} 38%, ${T.accent} 150%)` }}>
            <img src={`brand/avatars/${AVATAR_IMG[base]}.png`} alt={`${base} avatar`} draggable="false"
              style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 8%', filter: lookFilter, transition: 'filter .25s' }} />
          </div>
          <button type="button" onClick={() => setLookOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: RADIUS.pill,
              background: T.sheet, border: `1px solid ${T.border}`, color: T.textPrimary, cursor: 'pointer',
              fontFamily: FF_BODY, fontWeight: 600, fontSize: 13.5, boxShadow: T.e1, WebkitTapHighlightColor: 'transparent' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3a9 9 0 1 0 9 9c0-.5-.4-.9-.9-.9H17a2 2 0 0 1-1.4-3.4l.6-.6A2 2 0 0 0 14.8 4 9 9 0 0 0 12 3Z"/>
              <circle cx="7.5" cy="11" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="7.5" r="1.1" fill="currentColor" stroke="none"/><circle cx="16" cy="11" r="1.1" fill="currentColor" stroke="none"/>
            </svg>
            Change look
          </button>
        </div>

        {/* base persona — picker (create) / locked header (edit) */}
        {isEdit ? (
          <div style={{ marginBottom: 22 }}>
            <SectionLabel T={T}>Base persona</SectionLabel>
            <div style={{ display: 'flex', alignItems: 'center', gap: SPACE.md, padding: '12px 13px', borderRadius: RADIUS.soft,
              background: T.raised, boxShadow: T.e1 }}>
              <Avatar T={T} size={42} glyph={base[0]} color={PERSONAS[base].tone} name={base} />
              <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontFamily: FF_DISPLAY, fontWeight: 600, fontSize: 16.5, color: T.textPrimary }}>{base}</span>
                <span style={{ fontFamily: FF_BODY, fontSize: 12.5, lineHeight: 1.35, color: T.textSecondary }}>{PERSONAS[base].line}</span>
              </span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.textTertiary} strokeWidth="1.8" aria-label="Base persona is fixed">
                <rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round"/></svg>
            </div>
          </div>
        ) : (
          <div style={{ marginBottom: 22 }}>
            <SectionLabel T={T}>Start from</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {PERSONA_ORDER.map(n => <PersonaCard key={n} T={T} name={n} selected={base === n} onSelect={() => selectBase(n)} />)}
            </div>
          </div>
        )}

        {/* trait controls — one cluster */}
        <SectionLabel T={T}>Personality</SectionLabel>
        <div style={{ background: T.sheet, border: `1px solid ${T.border}`, borderRadius: RADIUS.edit, overflow: 'hidden', boxShadow: T.e1 }}>
          {AXES.map((ax, i) => (
            <SegRow key={ax.key} T={T} label={ax.label} options={ax.options} value={traits[ax.key]}
              onChange={v => setAxis(ax.key, v)} isLast={i === AXES.length - 1} />
          ))}
        </div>

        {/* inline prose voice preview — local to the controls, cross-fades */}
        <div style={{ display: 'flex', gap: 9, padding: '13px 4px 2px', alignItems: 'flex-start' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.textTertiary} strokeWidth="1.8" style={{ flex: 'none', marginTop: 3 }}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" strokeLinejoin="round"/></svg>
          <p key={pv.chips + pv.tail} style={{ margin: 0, fontFamily: FF_BODY, fontSize: 13.5, lineHeight: 1.5, textWrap: 'pretty',
            color: T.textSecondary, animation: prefersReducedMotion() ? 'none' : 'auraFade .4s ease both' }}>
            <span style={{ color: T.textPrimary, fontWeight: 600 }}>{pv.chips}</span>: {pv.tail}
          </p>
        </div>

        {/* editable name + auto-number */}
        <div style={{ marginTop: 22 }}>
          <SectionLabel T={T}>Name</SectionLabel>
          <input value={name} onChange={e => { setName(e.target.value); setNameTouched(true); }}
            placeholder="Name your companion" aria-label="Companion name"
            style={{ width: '100%', boxSizing: 'border-box', padding: '13px 15px', borderRadius: RADIUS.edit,
              background: T.sheet, border: `1px solid ${T.border}`, color: T.textPrimary, outline: 'none',
              fontFamily: FF_BODY, fontSize: 16, fontWeight: 500 }}
            onFocus={e => e.target.style.borderColor = T.textSecondary}
            onBlur={e => e.target.style.borderColor = T.border} />
          {showAutoHint && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, margin: '8px 4px 0', fontFamily: FF_BODY, fontSize: 12,
              lineHeight: 1.45, color: T.textTertiary, textWrap: 'pretty' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flex: 'none', marginTop: 2 }}><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01" strokeLinecap="round"/></svg>
              <span>Numbered to keep it distinct from your existing {base}. Tap to rename.</span>
            </div>
          )}
        </div>
        </div>
      </div>

      {/* footer dock — Save (premium) / Unlock door (free) */}
      <div style={{ flex: 'none', background: T.bg, borderTop: `1px solid ${T.divider}`,
        padding: '12px 16px calc(20px + env(safe-area-inset-bottom))' }}>
        {locked ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, margin: '0 0 11px',
              fontFamily: FF_BODY, fontSize: 12.5, lineHeight: 1.45, color: T.textTertiary, textAlign: 'center', textWrap: 'pretty' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" style={{ flex: 'none' }}>
                <rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round"/></svg>
              Tuning &amp; looks are a Premium feature.
            </div>
            <button type="button" onClick={() => d.setScreenId('paywall')}
              style={{ width: '100%', padding: '15px', borderRadius: RADIUS.pill, border: 'none', background: T.accent, color: T.onAccent,
                fontFamily: FF_BODY, fontWeight: 600, fontSize: 16, cursor: 'pointer', boxShadow: T.e1, WebkitTapHighlightColor: 'transparent' }}>
              Unlock with Premium
            </button>
          </>
        ) : (
          <button type="button"
            onPointerDown={() => setSavePress(true)} onPointerUp={() => setSavePress(false)} onPointerLeave={() => setSavePress(false)}
            onClick={() => d.setScreenId('chat')}
            style={{ width: '100%', padding: '15px', borderRadius: RADIUS.pill, border: 'none', background: T.accent, color: T.onAccent,
              fontFamily: FF_BODY, fontWeight: 600, fontSize: 16, cursor: 'pointer', boxShadow: T.e1, WebkitTapHighlightColor: 'transparent',
              transform: savePress ? 'scale(0.985)' : 'scale(1)', transition: 'transform .12s' }}>
            {isEdit ? 'Save changes' : 'Save companion'}
          </button>
        )}
      </div>

      {lookOpen && !locked && <LookSheet T={T} persona={base} value={look} onPick={setLook} onClose={() => setLookOpen(false)} />}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SYSTEM-STATES KIT — shared empty / loading / error renders (screen `states`).
   Memory and every data view pull from here so the states never get reinvented.
   ════════════════════════════════════════════════════════════════════════ */

/* warm tonal mark (calm, never alarmy) — icon passed in */
function StateMark({ T, children, tone }) {
  const base = tone || T.avatar;
  return (
    <div style={{ width: 72, height: 72, borderRadius: '50%', display: 'grid', placeItems: 'center', color: T.bg,
      background: `radial-gradient(120% 120% at 34% 28%, ${base} 0%, ${base} 42%, ${T.accent} 160%)`, boxShadow: T.e2 }}>
      {children}
    </div>
  );
}

function EmptyState({ T, mark, title, body }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '24px 36px 56px', animation: prefersReducedMotion() ? 'none' : 'auraFade .5s ease both' }}>
      <StateMark T={T}>{mark}</StateMark>
      <h2 style={{ fontFamily: FF_DISPLAY, fontWeight: 600, fontSize: 22, lineHeight: 1.2, color: T.textPrimary, margin: '18px 0 8px' }}>{title}</h2>
      <p style={{ fontFamily: FF_BODY, fontSize: 15, lineHeight: 1.55, color: T.textSecondary, margin: 0, maxWidth: '30ch', textWrap: 'pretty' }}>{body}</p>
    </div>
  );
}

function ErrorState({ T, title, body, onRetry }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: '24px 36px 56px', animation: prefersReducedMotion() ? 'none' : 'auraFade .5s ease both' }}>
      <StateMark T={T} tone={T.warning}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/></svg>
      </StateMark>
      <h2 style={{ fontFamily: FF_DISPLAY, fontWeight: 600, fontSize: 22, lineHeight: 1.2, color: T.textPrimary, margin: '18px 0 8px' }}>{title}</h2>
      <p style={{ fontFamily: FF_BODY, fontSize: 15, lineHeight: 1.55, color: T.textSecondary, margin: '0 0 20px', maxWidth: '30ch', textWrap: 'pretty' }}>{body}</p>
      <button type="button" onClick={onRetry}
        style={{ padding: '11px 26px', borderRadius: RADIUS.pill, border: `1px solid ${T.border}`, background: T.sheet, color: T.textPrimary,
          fontFamily: FF_BODY, fontWeight: 600, fontSize: 14.5, cursor: 'pointer', boxShadow: T.e1, WebkitTapHighlightColor: 'transparent' }}>Try again</button>
    </div>
  );
}

/* skeleton rows matching the final grouped layout — slow breathing, no spinner */
function LoadingState({ T, groups = 4 }) {
  const bar = (w) => <div style={{ height: 12, width: w, borderRadius: 6, background: T.divider }} />;
  return (
    <div style={{ padding: '20px 16px 40px', animation: prefersReducedMotion() ? 'none' : 'auraBreath 2.4s ease-in-out infinite' }} aria-label="Loading" aria-busy="true">
      {Array.from({ length: groups }).map((_, g) => (
        <div key={g} style={{ marginBottom: 22 }}>
          <div style={{ margin: '0 4px 9px' }}>{bar(72)}</div>
          <div style={{ background: T.sheet, border: `1px solid ${T.border}`, borderRadius: RADIUS.edit, padding: '15px 16px',
            display: 'flex', flexDirection: 'column', gap: 9 }}>
            {bar('86%')}{bar('58%')}
          </div>
        </div>
      ))}
    </div>
  );
}

/* warm, non-blocking offline banner — auto-catches-up on reconnect, never red */
function OfflineBanner({ T }) {
  return (
    <div role="status" style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '13px 15px', margin: '0 0 2px',
      background: T.raised, border: `1px solid ${T.border}`, borderRadius: RADIUS.edit, boxShadow: T.e1,
      animation: 'auraFade .5s ease both' }}>
      <span style={{ flex: 'none', width: 30, height: 30, borderRadius: '50%', display: 'grid', placeItems: 'center',
        background: T.sheet, border: `1px solid ${T.border}`, color: T.textSecondary }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0M12 19.5h.01"/><path d="M3 3l18 18" opacity="0.55"/></svg>
      </span>
      <span style={{ flex: 1, fontFamily: FF_BODY, fontSize: 14, lineHeight: 1.45, color: T.textSecondary, textWrap: 'pretty' }}>
        You’re offline. Aurora will catch up when you’re back.</span>
    </div>
  );
}

/* in-thread moderation — message softly held back, calm-neutral, NEVER red/stamp */
function BlockedMessage({ T }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18, animation: 'auraFade .5s ease both' }}>
      <div role="note" style={{ maxWidth: '82%', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
        <div style={{ padding: '11px 16px', borderRadius: '18px 18px 6px 18px', background: 'transparent',
          border: `1.5px dashed ${T.border}`, display: 'flex', alignItems: 'center', gap: 9 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.textTertiary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>
          <span style={{ fontFamily: FF_BODY, fontSize: 14.5, fontStyle: 'italic', color: T.textTertiary }}>Message held back</span>
        </div>
        <span style={{ fontFamily: FF_BODY, fontSize: 12.5, lineHeight: 1.45, color: T.crisisText, textAlign: 'right',
          textWrap: 'pretty', maxWidth: '34ch' }}>
          This message was held back to keep things safe. You can rephrase and try again.</span>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   MEMORY — per-companion remembered facts (Aurora about Maya), grouped by
   category. Editable / deletable rows (swipe-reveal tray + ••• toggle); delete
   CONFIRMS first. happy · empty · loading · error from the data-state toggle.
   ════════════════════════════════════════════════════════════════════════ */
const DEMO_MEMORIES = [
  { id: 'm1', cat: 'Identity',     text: 'Maya is 28 and lives in Austin, Texas.' },
  { id: 'm2', cat: 'Work',         text: 'Started a new UX design role recently, excited but nervous about proving herself.' },
  { id: 'm3', cat: 'Relationship', text: 'Close with her younger brother Theo; they catch up most weekends.' },
  { id: 'm4', cat: 'Attribute',    text: 'Has a dog named Pixel.' },
  { id: 'm5', cat: 'Preference',   text: 'Loves rock climbing and sci-fi novels.' },
  { id: 'm6', cat: 'General',      text: 'Moved to Austin from Chicago about six months ago; still settling in.' },
];

/* centered destructive confirm — delete confirms first, no instant full-swipe */
function ConfirmDialog({ T, title, body, confirmLabel, cancelLabel, onConfirm, onCancel }) {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 80, display: 'grid', placeItems: 'center', padding: 24, overflow: 'hidden' }}>
      <div onClick={onCancel} style={{ position: 'absolute', inset: 0, background: 'rgba(20,12,6,0.38)', animation: 'auraFade .18s ease both' }} />
      <div role="alertdialog" aria-label={title} style={{ position: 'relative', width: '100%', maxWidth: 300, background: T.sheet,
        borderRadius: RADIUS.card, padding: '22px 22px 18px', boxShadow: T.e3, textAlign: 'center', animation: 'auraPop .22s cubic-bezier(.22,.8,.32,1) both' }}>
        <h2 style={{ margin: '0 0 8px', fontFamily: FF_DISPLAY, fontWeight: 600, fontSize: 19, color: T.textPrimary }}>{title}</h2>
        <p style={{ margin: '0 0 20px', fontFamily: FF_BODY, fontSize: 14, lineHeight: 1.5, color: T.textSecondary, textWrap: 'pretty' }}>{body}</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
          <button type="button" onClick={onConfirm}
            style={{ padding: '12px', borderRadius: RADIUS.pill, border: 'none', background: T.error, color: '#FFFCF6',
              fontFamily: FF_BODY, fontWeight: 600, fontSize: 15, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>{confirmLabel}</button>
          <button type="button" onClick={onCancel}
            style={{ padding: '12px', borderRadius: RADIUS.pill, border: `1px solid ${T.border}`, background: 'transparent', color: T.textSecondary,
              fontFamily: FF_BODY, fontWeight: 600, fontSize: 15, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>{cancelLabel || 'Keep it'}</button>
        </div>
      </div>
    </div>
  );
}

const TRAY_W = 150;
function MemoryRow({ T, text, open, onOpenChange, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(text);
  const [dx, setDx] = useState(0);
  const drag = useRef(null);

  const startEdit = () => { setDraft(text); setEditing(true); onOpenChange(false); };
  const saveEdit = () => { onEdit(draft.trim() || text); setEditing(false); };

  const onDown = (e) => { drag.current = { x: e.clientX, base: open ? -TRAY_W : 0 }; };
  const onMove = (e) => {
    if (!drag.current) return;
    const next = Math.max(-TRAY_W, Math.min(0, drag.current.base + (e.clientX - drag.current.x)));
    setDx(next);
  };
  const onUp = () => {
    if (!drag.current) return;
    const moved = dx !== 0 || (open ? -TRAY_W : 0) !== 0;
    if (dx < -TRAY_W / 2.4) { onOpenChange(true); }
    else if (dx > -TRAY_W / 1.6 && open) { onOpenChange(false); }
    else { onOpenChange(dx < -TRAY_W / 2.4); }
    setDx(0); drag.current = null;
  };
  const offset = dx !== 0 ? dx : (open ? -TRAY_W : 0);

  if (editing) {
    return (
      <div style={{ padding: '12px 14px', background: T.sheet }}>
        <textarea value={draft} onChange={e => setDraft(e.target.value)} rows={2} autoFocus
          style={{ width: '100%', boxSizing: 'border-box', resize: 'none', padding: '10px 12px', borderRadius: RADIUS.tight + 2,
            background: T.bg, border: `1px solid ${T.textSecondary}`, color: T.textPrimary, outline: 'none',
            fontFamily: FF_BODY, fontSize: 14.5, lineHeight: 1.5 }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 9 }}>
          <button type="button" onClick={() => setEditing(false)}
            style={{ padding: '8px 16px', borderRadius: RADIUS.pill, border: `1px solid ${T.border}`, background: 'transparent', color: T.textSecondary,
              fontFamily: FF_BODY, fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}>Cancel</button>
          <button type="button" onClick={saveEdit}
            style={{ padding: '8px 18px', borderRadius: RADIUS.pill, border: 'none', background: T.accent, color: T.onAccent,
              fontFamily: FF_BODY, fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}>Save</button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden', background: T.sheet, touchAction: 'pan-y' }}>
      {/* trailing actions tray */}
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: TRAY_W, display: 'flex' }}>
        <button type="button" onClick={startEdit}
          style={{ flex: 1, border: 'none', background: T.raised, color: T.textPrimary, cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
            fontFamily: FF_BODY, fontWeight: 600, fontSize: 12.5, WebkitTapHighlightColor: 'transparent' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
          Edit
        </button>
        <button type="button" onClick={onDelete}
          style={{ flex: 1, border: 'none', background: T.error, color: '#FFFCF6', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
            fontFamily: FF_BODY, fontWeight: 600, fontSize: 12.5, WebkitTapHighlightColor: 'transparent' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg>
          Delete
        </button>
      </div>
      {/* foreground */}
      <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp}
        onClick={() => { if (open) onOpenChange(false); }}
        style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 14px 14px 16px',
          background: T.sheet, transform: `translateX(${offset}px)`, transition: drag.current ? 'none' : 'transform .26s cubic-bezier(.22,.8,.32,1)',
          cursor: 'grab' }}>
        <span style={{ flex: 1, fontFamily: FF_BODY, fontSize: 14.5, lineHeight: 1.5, color: T.textPrimary, textWrap: 'pretty' }}>{text}</span>
        <button type="button" aria-label="Row actions" onClick={(e) => { e.stopPropagation(); onOpenChange(!open); }}
          style={{ flex: 'none', width: 30, height: 30, borderRadius: '50%', display: 'grid', placeItems: 'center',
            background: open ? T.accentTint : 'transparent', border: 'none', color: T.textTertiary, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
          <svg width="18" height="5" viewBox="0 0 22 6"><circle cx="3" cy="3" r="2.5" fill="currentColor"/><circle cx="11" cy="3" r="2.5" fill="currentColor"/><circle cx="19" cy="3" r="2.5" fill="currentColor"/></svg>
        </button>
      </div>
    </div>
  );
}

function MemoryScreen() {
  const T = useT();
  const d = useDev();
  const ds = d.dataState || 'happy';
  const [items, setItems] = useState(DEMO_MEMORIES);
  const [openId, setOpenId] = useState(null);
  const [pendingDelete, setPendingDelete] = useState(null);

  // refill when returning to happy (after a delete demo / state flip)
  useEffect(() => { if (ds === 'happy' && items.length === 0) setItems(DEMO_MEMORIES); }, [ds]);

  const editItem = (id, text) => setItems(list => list.map(m => m.id === id ? { ...m, text } : m));
  const confirmDelete = () => { setItems(list => list.filter(m => m.id !== pendingDelete)); setOpenId(null); setPendingDelete(null); };

  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', background: T.bg }}>
      <TopBar label="Memory" />

      {ds === 'loading' ? (
        <div style={{ flex: 1, overflowY: 'auto' }} className="aura-noscroll"><LoadingState T={T} /></div>
      ) : ds === 'error' ? (
        <ErrorState T={T} title="Couldn't load memories"
          body="Something went wrong reaching Aurora's notes. Give it another try."
          onRetry={() => d.setDataState('happy')} />
      ) : ds === 'empty' || items.length === 0 ? (
        <EmptyState T={T}
          mark={<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.4-7 10-7 10Z"/></svg>}
          title="Nothing noted yet"
          body="Aurora hasn't noted anything yet. As you talk, the things that matter will show up here." />
      ) : (
        <div className="aura-noscroll" style={{ flex: 1, overflowY: 'auto', padding: '18px 16px 36px' }}>
          <h1 style={{ fontFamily: FF_DISPLAY, fontWeight: 600, fontSize: 27, lineHeight: 1.14, letterSpacing: '-0.015em',
            color: T.textPrimary, margin: '0 4px 5px' }}>What Aurora remembers</h1>
          <p style={{ fontFamily: FF_BODY, fontSize: 14, lineHeight: 1.5, color: T.textSecondary, margin: '0 4px 20px', textWrap: 'pretty' }}>
            You're always in control. Swipe or tap ••• on any memory to edit or remove it.</p>

          {items.map((m, i) => (
            <div key={m.id} style={{ marginBottom: 18, animation: prefersReducedMotion() ? 'none' : `auraRise .42s ${i * 0.05}s cubic-bezier(.22,.8,.32,1) both` }}>
              <div style={{ fontFamily: FF_BODY, fontWeight: 600, fontSize: 11.5, letterSpacing: '0.13em', textTransform: 'uppercase',
                color: T.textTertiary, margin: '0 4px 8px' }}>{m.cat}</div>
              <div style={{ background: T.sheet, border: `1px solid ${T.border}`, borderRadius: RADIUS.edit, overflow: 'hidden', boxShadow: T.e1 }}>
                <MemoryRow T={T} text={m.text} open={openId === m.id}
                  onOpenChange={(v) => setOpenId(v ? m.id : null)}
                  onEdit={(t) => editItem(m.id, t)}
                  onDelete={() => setPendingDelete(m.id)} />
              </div>
            </div>
          ))}
        </div>
      )}

      {pendingDelete && (
        <ConfirmDialog T={T} title="Remove this memory?"
          body="Aurora will forget this. You can always share it again later."
          confirmLabel="Remove" onConfirm={confirmDelete} onCancel={() => setPendingDelete(null)} />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   PAYWALL — calm conversion sheet (NOT a fireworks moment). One plan, one
   accent CTA. Price is StoreKit/RevenueCat-injected (skeleton while loading) —
   never hardcoded. default (free) · owned (premium) from the account toggle.
   ════════════════════════════════════════════════════════════════════════ */
/* PLACEHOLDER — the real app injects RevenueCat `localizedPriceString` here. */
const STORE_PRICE = '$9.99';
const RENEWAL_DATE = 'Jul 14, 2026';

const PREMIUM_VALUE = [
  'Unlimited messages',
  'Personality tuning: warmth, energy, and style',
  'Create extra companions',
  'Priority responses',
];

function ValueItem({ T, label, owned, delay }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 2px',
      animation: prefersReducedMotion() ? 'none' : `auraRise .4s ${delay}s cubic-bezier(.22,.8,.32,1) both` }}>
      <span style={{ flex: 'none', width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center',
        background: T.raised, border: `1px solid ${T.border}`, color: T.textSecondary }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4.5 4.5L19 6.5"/></svg>
      </span>
      <span style={{ flex: 1, fontFamily: FF_BODY, fontSize: 15, lineHeight: 1.4, color: T.textPrimary, textWrap: 'pretty' }}>{label}</span>
    </div>
  );
}

function PaywallScreen() {
  const T = useT();
  const d = useDev();
  const owned = d.account === 'premium';
  const [priceReady, setPriceReady] = useState(false);
  const [press, setPress] = useState(false);

  // simulate StoreKit fetching localizedPriceString (skeleton until resolved)
  useEffect(() => {
    setPriceReady(false);
    const t = setTimeout(() => setPriceReady(true), 1100);
    return () => clearTimeout(t);
  }, [owned]);

  const legal = (
    <p style={{ fontFamily: FF_BODY, fontSize: 11.5, lineHeight: 1.5, color: T.textTertiary, textAlign: 'center', margin: '14px 6px 0', textWrap: 'pretty' }}>
      Subscription renews automatically until canceled. Manage or cancel anytime in App Store settings.
      <br />
      <a href="OneOff.html" style={{ color: T.textSecondary, textDecoration: 'underline' }}>Terms of Service</a>
      {'  ·  '}
      <a href="OneOff.html" style={{ color: T.textSecondary, textDecoration: 'underline' }}>Privacy Policy</a>
    </p>
  );

  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', background: T.bg, overflow: 'hidden' }}>
      {/* calm dim above — the sheet reads as a continuation, not a tonal break */}
      <a href="HomeTabs.html" aria-label="Close" style={{ flex: 'none', display: 'block', height: 88, textDecoration: 'none' }} />

      {/* the sheet */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column', background: T.sheet,
        borderRadius: `${RADIUS.sheet}px ${RADIUS.sheet}px 0 0`, boxShadow: T.e3,
        animation: prefersReducedMotion() ? 'auraFade .3s ease both' : 'auraSheet .42s cubic-bezier(.22,.8,.32,1) both' }}>
        <div style={{ flex: 'none', display: 'flex', justifyContent: 'center', padding: '10px 0 2px' }}>
          <div style={{ width: 38, height: 4, borderRadius: 999, background: T.border }} />
        </div>
        <a href="HomeTabs.html" aria-label="Close" style={{ position: 'absolute', top: 14, right: 16, width: 32, height: 32, borderRadius: '50%',
          display: 'grid', placeItems: 'center', background: T.raised, color: T.textTertiary, textDecoration: 'none', WebkitTapHighlightColor: 'transparent' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
        </a>

        <div className="aura-noscroll" style={{ flex: 1, overflowY: 'auto', padding: '14px 22px 22px', display: 'flex', flexDirection: 'column' }}>
          {/* headline */}
          {owned && (
            <span style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12,
              padding: '5px 12px', borderRadius: RADIUS.pill, background: T.accentTint, color: T.accent,
              fontFamily: FF_BODY, fontWeight: 600, fontSize: 12 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4.5 4.5L19 6.5"/></svg>
              Current plan
            </span>
          )}
          <h1 style={{ fontFamily: FF_DISPLAY, fontWeight: 600, fontSize: 29, lineHeight: 1.12, letterSpacing: '-0.015em',
            color: T.textPrimary, margin: '0 0 8px' }}>
            {owned ? "You're on Aura Premium" : 'Go deeper with Aura Premium'}</h1>
          <p style={{ fontFamily: FF_BODY, fontSize: 15, lineHeight: 1.5, color: T.textSecondary, margin: '0 0 20px', textWrap: 'pretty' }}>
            {owned
              ? 'Everything below is yours. Thank you for supporting a calmer kind of companion.'
              : 'More room to be heard, and the space to make a companion truly yours.'}</p>

          {/* the single warm value block */}
          <div style={{ marginBottom: 18 }}>
            {PREMIUM_VALUE.map((v, i) => <ValueItem key={v} T={T} label={v} owned={owned} delay={0.06 + i * 0.05} />)}
          </div>

          {/* honest free baseline (quiet, not a cold matrix) */}
          <p style={{ fontFamily: FF_BODY, fontSize: 12.5, lineHeight: 1.5, color: T.textTertiary, margin: '0 0 20px', textWrap: 'pretty' }}>
            Free always includes 3 base companions, their default personalities, and 30 messages a day.</p>

          {/* price block — StoreKit-injected, skeleton while loading */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4, minHeight: 38 }}>
            {priceReady ? (
              <>
                <span style={{ fontFamily: FF_DISPLAY, fontWeight: 600, fontSize: 32, color: T.textPrimary, letterSpacing: '-0.01em' }}>{STORE_PRICE}</span>
                <span style={{ fontFamily: FF_BODY, fontSize: 15, color: T.textSecondary }}>/ month</span>
              </>
            ) : (
              <span aria-label="Loading price" aria-busy="true" style={{ width: 132, height: 30, borderRadius: 8, background: T.divider,
                animation: prefersReducedMotion() ? 'none' : 'auraBreath 2.4s ease-in-out infinite' }} />
            )}
          </div>
          {/* NOTE: in the real app the price is StoreKit / RevenueCat `localizedPriceString`;
              STORE_PRICE is only a prototype placeholder and is not surfaced to users. */}
          <div style={{ height: 16 }} />
          <div style={{ flex: 1 }} />

          {/* primary CTA — the ONE accent */}
          <button type="button" disabled={owned}
            onPointerDown={() => setPress(true)} onPointerUp={() => setPress(false)} onPointerLeave={() => setPress(false)}
            onClick={() => { if (!owned) d.setScreenId('chat'); }}
            style={{ width: '100%', padding: '15px', borderRadius: RADIUS.pill, border: 'none',
              background: owned ? T.raised : T.accent, color: owned ? T.textTertiary : T.onAccent,
              fontFamily: FF_BODY, fontWeight: 600, fontSize: 16, cursor: owned ? 'default' : 'pointer',
              boxShadow: owned ? 'none' : T.e1, WebkitTapHighlightColor: 'transparent',
              transform: press && !owned ? 'scale(0.985)' : 'scale(1)', transition: 'transform .12s' }}>
            {owned ? 'Current plan' : 'Subscribe'}</button>

          {owned ? (
            <>
              <p style={{ fontFamily: FF_BODY, fontSize: 13, color: T.textSecondary, textAlign: 'center', margin: '14px 0 0' }}>
                Renews {RENEWAL_DATE}.</p>
              <button type="button" onClick={() => d.setScreenId('submgmt')}
                style={{ alignSelf: 'center', marginTop: 4, padding: '8px 14px', background: 'transparent', border: 'none', color: T.accent,
                  fontFamily: FF_BODY, fontWeight: 600, fontSize: 14, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
                Manage subscription</button>
            </>
          ) : (
            <button type="button" onClick={() => d.setScreenId('submgmt')}
              style={{ alignSelf: 'center', marginTop: 10, padding: '8px 14px', background: 'transparent', border: 'none', color: T.textSecondary,
                fontFamily: FF_BODY, fontWeight: 600, fontSize: 14, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
              Restore Purchases</button>
          )}

          {legal}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SUBSCRIPTION MANAGEMENT — `submgmt`. Utility screen: explains, never mutates.
   Billing is store-managed (App Store hand-off). Reached at account==='premium';
   in free, You → Subscription routes to the PAYWALL instead (see Shell note).
   STILL — soft press only, no entrances. Both themes.
   ════════════════════════════════════════════════════════════════════════ */

/* shared list-group primitive — one rounded card, warm hairline rows */
function ListGroup({ T, label, children, footnote }) {
  const rows = React.Children.toArray(children).filter(Boolean);
  return (
    <div style={{ marginBottom: 22 }}>
      {label && (
        <div style={{ fontFamily: FF_BODY, fontWeight: 600, fontSize: 11.5, letterSpacing: '0.13em', textTransform: 'uppercase',
          color: T.textTertiary, margin: '0 4px 9px' }}>{label}</div>
      )}
      <div style={{ background: T.sheet, border: `1px solid ${T.border}`, borderRadius: RADIUS.edit, overflow: 'hidden', boxShadow: T.e1 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ borderBottom: i === rows.length - 1 ? 'none' : `1px solid ${T.divider}` }}>{r}</div>
        ))}
      </div>
      {footnote && (
        <p style={{ fontFamily: FF_BODY, fontSize: 12, lineHeight: 1.5, color: T.textTertiary, margin: '8px 4px 0', textWrap: 'pretty' }}>{footnote}</p>
      )}
    </div>
  );
}

/* status row — settled, no affordance */
function StatusRow({ T, label, value, accentValue }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px' }}>
      <span style={{ fontFamily: FF_BODY, fontSize: 15, color: T.textPrimary }}>{label}</span>
      <span style={{ fontFamily: FF_BODY, fontWeight: 600, fontSize: 15, color: accentValue ? T.accent : T.textSecondary }}>{value}</span>
    </div>
  );
}

/* action row — soft press, external-handoff or quiet utility */
function ActionRow({ T, label, sub, external, onActivate }) {
  const [press, setPress] = useState(false);
  return (
    <button type="button" onClick={onActivate}
      onPointerDown={() => setPress(true)} onPointerUp={() => setPress(false)} onPointerLeave={() => setPress(false)}
      style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px',
        background: press ? T.raised : 'transparent', border: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
        transition: 'background .12s' }}>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <span style={{ fontFamily: FF_BODY, fontWeight: 500, fontSize: 15, color: T.textPrimary }}>{label}</span>
        {sub && <span style={{ fontFamily: FF_BODY, fontSize: 12.5, lineHeight: 1.45, color: T.textTertiary, textWrap: 'pretty' }}>{sub}</span>}
      </span>
      {external ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.textTertiary} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><path d="M9 18l6-6-6-6"/></svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.textTertiary} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><path d="M9 18l6-6-6-6"/></svg>
      )}
    </button>
  );
}

function SubMgmtScreen() {
  const T = useT();
  const d = useDev();
  // "your subscription" for BOTH tiers — Free shows its plan + a gentle upgrade path (NOT a forced
  // paywall); Premium shows plan + store-managed billing. The paywall stays the dedicated upsell.
  const premium = d.account === 'premium';
  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', background: T.bg }}>
      <TopBar label="Subscription" />
      <div className="aura-noscroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 36px' }}>

        <ListGroup T={T} label="Your plan"
          footnote={premium ? undefined : 'Free includes 3 base companions, their default personalities, and 30 messages a day.'}>
          <StatusRow T={T} label="Current plan" value={premium ? 'Premium' : 'Free'} accentValue={premium} />
          {premium && <StatusRow T={T} label="Renews" value={RENEWAL_DATE} />}
        </ListGroup>

        {!premium && (
          <button type="button" onClick={() => d.setScreenId('paywall')}
            style={{ width: '100%', padding: '15px', borderRadius: RADIUS.pill, border: 'none', background: T.accent, color: T.onAccent,
              fontFamily: FF_BODY, fontWeight: 600, fontSize: 16, cursor: 'pointer', boxShadow: T.e1, marginBottom: 22, WebkitTapHighlightColor: 'transparent' }}>
            Upgrade to Premium
          </button>
        )}

        <ListGroup T={T} label="Billing"
          footnote="Aura can’t change billing in-app. Payment, price, and cancellation are handled securely by the App Store.">
          {premium && (
            <ActionRow T={T} label="Manage in App Store" external
              sub="Billing is managed by the App Store; changes happen there."
              onActivate={() => {}} />
          )}
          <ActionRow T={T} label="Restore Purchases" onActivate={() => {}} />
        </ListGroup>

        {premium && (
          <button type="button" onClick={() => d.setScreenId('paywall')}
            style={{ display: 'block', width: '100%', textAlign: 'center', padding: '10px', background: 'transparent', border: 'none',
              color: T.textSecondary, fontFamily: FF_BODY, fontWeight: 600, fontSize: 14, cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent', textDecoration: 'underline', textUnderlineOffset: 3 }}>
            See everything Premium includes
          </button>
        )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SIGN-IN & SECURITY — `signin`. Email + password live HERE (not in Edit profile
   = name/avatar, not in Manage your data = export/delete). Conditional on the
   sign-in method: email/password → editable; Google/Apple SSO → read-only
   ("managed by your provider"), since the identity provider owns the credentials.
   Apple Hide-My-Email shows the relay + a forwarding note. In the real app the
   method comes from Clerk (externalAccounts / passwordEnabled); here the dev-rail
   state drives it. Both themes.
   ════════════════════════════════════════════════════════════════════════ */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  );
}

function SigninSecurityScreen() {
  const T = useT();
  const d = useDev();
  const method = ['password', 'google', 'apple', 'apple-hidden'].includes(d.screenState) ? d.screenState : 'password';
  const sso = method !== 'password';
  const provider = method === 'google' ? 'Google' : 'Apple';
  const hidden = method === 'apple-hidden';
  const email = method === 'google' ? 'maya.chen@gmail.com'
    : method === 'apple' ? 'maya.chen@icloud.com'
    : hidden ? 'qp7k3m9x2c@privaterelay.appleid.com'
    : 'maya.chen@example.com';
  const emailNote = !sso ? 'We use this to reach you about your account.'
    : hidden ? 'Apple hides your real address and forwards messages to your inbox. Manage it in your Apple ID settings.'
    : `Your email comes from your ${provider} account. Change it there and it updates here.`;

  const managedRow = (label) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 16px' }}>
      <span style={{ flex: 1, minWidth: 0, fontFamily: FF_BODY, fontSize: 15, color: T.textPrimary,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
      <span style={{ flex: 'none', fontFamily: FF_BODY, fontSize: 12.5, color: T.textTertiary }}>Managed by {provider}</span>
    </div>
  );

  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', background: T.bg }}>
      <TopBar label="Sign-in & security" />
      <div className="aura-noscroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 36px' }}>

        {/* how you sign in */}
        <SectionLabel T={T}>How you sign in</SectionLabel>
        <div style={{ display: 'flex', alignItems: 'center', gap: 13, background: T.sheet, border: `1px solid ${T.border}`,
          borderRadius: RADIUS.edit, padding: '14px 16px', boxShadow: T.e1, marginBottom: 22 }}>
          <span style={{ width: 34, height: 34, flex: 'none', borderRadius: '50%', display: 'grid', placeItems: 'center',
            background: T.bg, border: `1px solid ${T.border}` }}>
            {method === 'google' ? <GoogleMark />
              : sso ? <svg width="17" height="17" viewBox="0 0 24 24" fill={T.textPrimary} aria-hidden="true"><path d="M16.37 1.43c0 1.14-.49 2.27-1.18 3.08-.74.9-1.99 1.57-2.98 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.57-2.27 1.2-2.98.8-.94 2.14-1.64 3.25-1.68.03.13.05.28.05.43zM20.93 17.14c-.03.07-.46 1.58-1.52 3.12-.94 1.34-1.94 2.71-3.43 2.71-1.51 0-1.9-.88-3.63-.88-1.7 0-2.3.91-3.67.91-1.38 0-2.33-1.26-3.43-2.8C3.96 18.5 2.93 15.69 2.93 13.04c0-4.28 2.8-6.55 5.55-6.55 1.45 0 2.68.95 3.6.95.86 0 2.22-1.01 3.9-1.01.61 0 2.89.06 4.37 2.19-.13.09-2.38 1.37-2.38 4.19 0 3.26 2.85 4.42 2.96 4.45z"/></svg>
              : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.textSecondary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>}
          </span>
          <span style={{ flex: 1, fontFamily: FF_BODY, fontWeight: 600, fontSize: 15, color: T.textPrimary }}>
            {sso ? `Signed in with ${provider}` : 'Email & password'}</span>
        </div>

        {/* email — editable for email/password; read-only + managed-by note for SSO */}
        <ListGroup T={T} label="Email" footnote={emailNote}>
          {sso ? managedRow(email) : <ActionRow T={T} label="Email address" sub={email} onActivate={() => {}} />}
        </ListGroup>

        {/* password — change for email/password; managed-by the provider for SSO */}
        <ListGroup T={T} label="Password">
          {sso ? managedRow('Password') : <ActionRow T={T} label="Change password" onActivate={() => {}} />}
        </ListGroup>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   EDIT PROFILE — `editprofile`. Minimal: avatar (curated/monogram, NO upload),
   first + last name, sticky Save disabled-until-dirty. Inline validation on blur.
   default · focus (field above keyboard, accent ring) · error · saving→toast.
   ════════════════════════════════════════════════════════════════════════ */
const PROFILE_SEED = { first: 'Maya', last: 'Chen' };
/* curated, no-UGC avatar palette — warm monogram tones, never a photo picker */
const MONO_TONES = ['#C77B57', '#A9683F', '#5E7B6A', '#7A6CA8', '#B58A4A', '#6E6E78'];

function EditProfileScreen() {
  const T = useT();
  const d = useDev();
  const st = d.screenState || 'default';

  const [first, setFirst] = useState(PROFILE_SEED.first);
  const [last, setLast] = useState(PROFILE_SEED.last);
  const [tone, setTone] = useState(MONO_TONES[0]);
  const [focused, setFocused] = useState(null);   // 'first' | 'last' | null
  const [touched, setTouched] = useState({});
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedToast, setSavedToast] = useState(false);

  // demo: the harness state pre-seeds focus / error / saving so each is reviewable
  useEffect(() => {
    setFirst(st === 'error' ? '' : PROFILE_SEED.first);
    setLast(PROFILE_SEED.last);
    setTone(MONO_TONES[st === 'focus' || st === 'error' || st === 'saving' ? 1 : 0]); // dirty in those states
    setFocused(st === 'focus' || st === 'error' ? 'first' : null);
    setTouched(st === 'error' ? { first: true } : {});
    setSaving(st === 'saving');
    setSavedToast(false);
  }, [st]);

  const dirty = first !== PROFILE_SEED.first || last !== PROFILE_SEED.last || tone !== MONO_TONES[0];
  const firstError = touched.first && first.trim() === '' ? "First name can't be empty" : null;
  const canSave = dirty && first.trim() !== '' && !saving;

  const initials = ((first.trim()[0] || '') + (last.trim()[0] || '')).toUpperCase() || '·';

  const doSave = () => {
    if (!canSave) return;
    setSaving(true);
    setTimeout(() => { setSaving(false); setSavedToast(true); setTimeout(() => setSavedToast(false), 2400); }, 1100);
  };

  const fieldStyle = (key) => ({
    width: '100%', boxSizing: 'border-box', padding: '13px 15px', border: 'none', outline: 'none',
    background: 'transparent', color: T.textPrimary, fontFamily: FF_BODY, fontSize: 16, fontWeight: 500,
  });
  const ringFor = (key, isErr) => focused === key
    ? `0 0 0 2px ${isErr ? T.error : T.accent}`
    : 'none';

  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', background: T.bg }}>
      <TopBar label="Edit profile" />

      <div className="aura-noscroll" style={{ flex: 1, overflowY: 'auto', padding: '22px 16px 28px' }}
        onPointerDown={(e) => { /* tap-outside dismisses focus */ if (e.target === e.currentTarget) setFocused(null); }}>

        {/* avatar — curated monogram, change affordance (no upload) */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 11, marginBottom: 26 }}>
          <div style={{ width: 88, height: 88, borderRadius: '50%', display: 'grid', placeItems: 'center', boxShadow: T.e2,
            background: `radial-gradient(120% 120% at 32% 26%, ${tone} 0%, ${tone} 46%, ${T.accent} 165%)`,
            color: '#FFFCF6', fontFamily: FF_DISPLAY, fontWeight: 600, fontSize: 34, letterSpacing: '0.01em' }}>
            {initials}
          </div>
          <button type="button" onClick={() => setPaletteOpen(v => !v)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 15px', borderRadius: RADIUS.pill,
              background: T.sheet, border: `1px solid ${T.border}`, color: T.textPrimary, cursor: 'pointer',
              fontFamily: FF_BODY, fontWeight: 600, fontSize: 13.5, boxShadow: T.e1, WebkitTapHighlightColor: 'transparent' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="10.5" r="2.5"/><circle cx="8.5" cy="7.5" r="2.5"/><circle cx="6.5" cy="12.5" r="2.5"/><path d="M12 2a10 10 0 1 0 0 20 2 2 0 0 0 1.4-3.4 2 2 0 0 1 1.4-3.4H17a5 5 0 0 0 5-5 10 10 0 0 0-10-8.2Z" opacity="0"/></svg>
            Change color
          </button>
          {paletteOpen && (
            <div style={{ display: 'flex', gap: 10, padding: '12px 14px', background: T.sheet, border: `1px solid ${T.border}`,
              borderRadius: RADIUS.pill, boxShadow: T.e1 }}>
              {MONO_TONES.map(c => {
                const on = c === tone;
                return (
                  <button key={c} type="button" aria-label={`Avatar color ${c}`} aria-pressed={on} onClick={() => setTone(c)}
                    style={{ width: 30, height: 30, borderRadius: '50%', cursor: 'pointer', background: c,
                      border: on ? `2.5px solid ${T.textPrimary}` : `1px solid rgba(0,0,0,0.1)`,
                      boxShadow: on ? T.e1 : 'none', WebkitTapHighlightColor: 'transparent', transition: 'border-color .14s' }} />
                );
              })}
            </div>
          )}
        </div>

        {/* name fields — one grouped card */}
        <div style={{ background: T.sheet, border: `1px solid ${T.border}`, borderRadius: RADIUS.edit, overflow: 'hidden', boxShadow: T.e1 }}>
          {/* first */}
          <div style={{ padding: '4px 0', borderBottom: `1px solid ${T.divider}` }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px' }}>
              <label htmlFor="pf-first" style={{ flex: '0 0 92px', padding: '0 0 0 16px', fontFamily: FF_BODY, fontWeight: 600,
                fontSize: 13.5, color: T.textSecondary }}>First name</label>
              <div style={{ flex: 1, margin: '6px 8px 6px 0', borderRadius: RADIUS.tight + 2, boxShadow: ringFor('first', !!firstError),
                transition: 'box-shadow .16s' }}>
                <input id="pf-first" value={first} placeholder="First name" aria-invalid={!!firstError}
                  onChange={e => setFirst(e.target.value)}
                  onFocus={() => setFocused('first')}
                  onBlur={() => { setFocused(null); setTouched(t => ({ ...t, first: true })); }}
                  style={fieldStyle('first')} />
              </div>
            </div>
          </div>
          {/* last */}
          <div style={{ padding: '4px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px' }}>
              <label htmlFor="pf-last" style={{ flex: '0 0 92px', padding: '0 0 0 16px', fontFamily: FF_BODY, fontWeight: 600,
                fontSize: 13.5, color: T.textSecondary }}>Last name</label>
              <div style={{ flex: 1, margin: '6px 8px 6px 0', borderRadius: RADIUS.tight + 2, boxShadow: ringFor('last', false),
                transition: 'box-shadow .16s' }}>
                <input id="pf-last" value={last} placeholder="Last name"
                  onChange={e => setLast(e.target.value)}
                  onFocus={() => setFocused('last')}
                  onBlur={() => { setFocused(null); setTouched(t => ({ ...t, last: true })); }}
                  style={fieldStyle('last')} />
              </div>
            </div>
          </div>
        </div>

        {/* inline error (says what to do next) — kept away from the Save button */}
        {firstError && (
          <div role="alert" style={{ display: 'flex', alignItems: 'center', gap: 7, margin: '9px 6px 0',
            fontFamily: FF_BODY, fontSize: 12.5, lineHeight: 1.4, color: T.error }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flex: 'none' }}><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01" strokeLinecap="round"/></svg>
            Enter a first name. It’s what your companion calls you.
          </div>
        )}

        {/* helper: first name is what the companion uses */}
        {!firstError && (
          <p style={{ fontFamily: FF_BODY, fontSize: 12.5, lineHeight: 1.5, color: T.textTertiary, margin: '10px 6px 0', textWrap: 'pretty' }}>
            Your first name is what your companion calls you.</p>
        )}
      </div>

      {/* sticky Save footer — accent only when actionable */}
      <div style={{ flex: 'none', background: T.bg, borderTop: `1px solid ${T.divider}`,
        padding: '12px 16px calc(16px + env(safe-area-inset-bottom))' }}>
        <button type="button" disabled={!canSave} onClick={doSave}
          style={{ width: '100%', padding: '15px', borderRadius: RADIUS.pill, border: 'none',
            background: canSave ? T.accent : T.raised, color: canSave ? T.onAccent : T.textTertiary,
            fontFamily: FF_BODY, fontWeight: 600, fontSize: 16, cursor: canSave ? 'pointer' : 'default',
            boxShadow: canSave ? T.e1 : 'none', WebkitTapHighlightColor: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, transition: 'background .18s, color .18s' }}>
          {saving && <span style={{ width: 17, height: 17, borderRadius: '50%', border: `2.4px solid ${T.onAccent}`,
            borderTopColor: 'transparent', display: 'inline-block',
            animation: prefersReducedMotion() ? 'none' : 'auraSpin .7s linear infinite' }} />}
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* success toast — cross-dissolve */}
      {savedToast && (
        <div role="status" style={{ position: 'absolute', left: 0, right: 0, bottom: 96, display: 'flex', justifyContent: 'center',
          pointerEvents: 'none', zIndex: 40 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 18px', borderRadius: RADIUS.pill,
            background: T.textPrimary, color: T.bg, fontFamily: FF_BODY, fontWeight: 600, fontSize: 14, boxShadow: T.e3,
            animation: prefersReducedMotion() ? 'auraFade .25s ease both' : 'auraToast 2.4s ease both' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4.5 4.5L19 6.5"/></svg>
            Profile saved
          </span>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   ACCOUNT MANAGEMENT — `account`. Apple-required data export + delete account.
   Resting screen stays NEUTRAL (no wine, no resting red); loud destructive-red
   lives only in the confirm dialog. default · export-sent · delete-confirm.
   Destructive actions ALWAYS confirm first, with the soft-delete grace explainer.
   ════════════════════════════════════════════════════════════════════════ */
const ACCOUNT_EMAIL = 'maya.chen@example.com';

function AccountScreen() {
  const T = useT();
  const d = useDev();
  const st = d.screenState || 'default';
  const [exportSent, setExportSent] = useState(st === 'export-sent');
  const [confirmOpen, setConfirmOpen] = useState(st === 'delete-confirm');
  const [deactivated, setDeactivated] = useState(false);

  useEffect(() => {
    setExportSent(st === 'export-sent');
    setConfirmOpen(st === 'delete-confirm');
    setDeactivated(false);
  }, [st]);

  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', background: T.bg }}>
      <TopBar label="Manage your data" />

      <div className="aura-noscroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 36px' }}>

        {/* Data export */}
        <ListGroup T={T} label="Your data"
          footnote={exportSent
            ? null
            : 'You can request a copy at any time. There’s no limit on how often.'}>
          <div style={{ padding: '14px 16px' }}>
            <div style={{ fontFamily: FF_BODY, fontWeight: 500, fontSize: 15, color: T.textPrimary, marginBottom: 3 }}>Data export</div>
            <div style={{ fontFamily: FF_BODY, fontSize: 12.5, lineHeight: 1.45, color: T.textTertiary, textWrap: 'pretty' }}>
              Download a copy of your conversations and memories.</div>
          </div>
          {exportSent ? (
            <div style={{ display: 'flex', gap: 11, padding: '14px 16px', background: T.raised }}>
              <span style={{ flex: 'none', width: 26, height: 26, borderRadius: '50%', display: 'grid', placeItems: 'center',
                marginTop: 1, background: T.sheet, border: `1px solid ${T.border}`, color: T.textSecondary }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l4.5 4.5L19 6.5"/></svg>
              </span>
              <span style={{ flex: 1, fontFamily: FF_BODY, fontSize: 13.5, lineHeight: 1.5, color: T.textSecondary, textWrap: 'pretty',
                animation: prefersReducedMotion() ? 'none' : 'auraFade .4s ease both' }}>
                We’re preparing your export. We’ll email a download link to{' '}
                <span style={{ color: T.textPrimary, fontWeight: 600 }}>{ACCOUNT_EMAIL}</span> when it’s ready.</span>
            </div>
          ) : (
            <ActionRow T={T} label="Request export" onActivate={() => setExportSent(true)} />
          )}
        </ListGroup>

        {/* Delete account — danger group, well separated, never a mistap from export */}
        <div style={{ marginTop: 14 }}>
          <div style={{ fontFamily: FF_BODY, fontWeight: 600, fontSize: 11.5, letterSpacing: '0.13em', textTransform: 'uppercase',
            color: T.textTertiary, margin: '0 4px 9px' }}>Delete account</div>
          <div style={{ background: T.sheet, border: `1px solid ${T.error}`, borderRadius: RADIUS.edit, overflow: 'hidden', boxShadow: T.e1 }}>
            <div style={{ padding: '14px 16px' }}>
              <div style={{ fontFamily: FF_BODY, fontSize: 12.5, lineHeight: 1.5, color: T.textTertiary, textWrap: 'pretty' }}>
                Permanently delete your account. You’ll have 30 days to change your mind.</div>
            </div>
            <button type="button" onClick={() => { setDeactivated(false); setConfirmOpen(true); }}
              onPointerDown={e => e.currentTarget.style.background = T.raised}
              onPointerUp={e => e.currentTarget.style.background = 'transparent'}
              onPointerLeave={e => e.currentTarget.style.background = 'transparent'}
              style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', borderTop: `1px solid ${T.divider}`, background: 'transparent', border: 'none', cursor: 'pointer',
                fontFamily: FF_BODY, fontWeight: 600, fontSize: 15, color: T.error, WebkitTapHighlightColor: 'transparent', transition: 'background .12s' }}>
              Delete account
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.error} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none', opacity: 0.7 }}><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
          {deactivated && (
            <div role="status" style={{ display: 'flex', gap: 9, margin: '12px 4px 0', fontFamily: FF_BODY, fontSize: 13, lineHeight: 1.5,
              color: T.textSecondary, textWrap: 'pretty', animation: prefersReducedMotion() ? 'none' : 'auraFade .4s ease both' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.textTertiary} strokeWidth="1.8" style={{ flex: 'none', marginTop: 2 }}><circle cx="12" cy="12" r="9"/><path d="M12 8v4l2.5 2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              <span>Your account is deactivated. Sign back in within 30 days to cancel the deletion.</span>
            </div>
          )}
        </div>
      </div>

      {/* destructive confirm — the one place loud red is correct; carries grace explainer */}
      {confirmOpen && (
        <ConfirmDialog T={T} title="Delete your account?"
          body="Your account is deactivated now and permanently deleted after 30 days. Sign back in within 30 days to cancel."
          confirmLabel="Delete account" cancelLabel="Cancel"
          onConfirm={() => { setConfirmOpen(false); setDeactivated(true); }}
          onCancel={() => setConfirmOpen(false)} />
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   NOTIFICATIONS — `notifs`. Transactional ONLY: a single push toggle. No
   marketing toggles, no category sprawl, no bell animation. The toggle flip is
   the only motion. On by default. Both themes.
   ════════════════════════════════════════════════════════════════════════ */

/* shared native-style toggle — soft flip, accent track when on */
function Toggle({ T, on, onChange, label }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      style={{ flex: 'none', width: 50, height: 30, borderRadius: 999, border: 'none', padding: 0, cursor: 'pointer',
        background: on ? T.accent : T.border, position: 'relative', WebkitTapHighlightColor: 'transparent',
        transition: prefersReducedMotion() ? 'none' : 'background .22s ease' }}>
      <span style={{ position: 'absolute', top: 3, left: on ? 23 : 3, width: 24, height: 24, borderRadius: '50%',
        background: '#FFFCF6', boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
        transition: prefersReducedMotion() ? 'none' : 'left .22s cubic-bezier(.3,1.3,.5,1)' }} />
    </button>
  );
}

function NotifsScreen() {
  const T = useT();
  const [on, setOn] = useState(true);  // on by default — matches the You-tab default

  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', background: T.bg }}>
      <TopBar label="Notifications" />
      <div className="aura-noscroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 36px' }}>
        <ListGroup T={T} label="Push"
          footnote="The only notification Aura sends. No promos, no nudges.">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px' }}>
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontFamily: FF_BODY, fontWeight: 600, fontSize: 15, color: T.textPrimary }}>Aurora replied</span>
              <span style={{ fontFamily: FF_BODY, fontSize: 12.5, lineHeight: 1.45, color: T.textSecondary, textWrap: 'pretty' }}>
                Get notified when your companion replies while you’re away.</span>
            </span>
            <Toggle T={T} on={on} onChange={setOn} label="Aurora replied notifications" />
          </div>
        </ListGroup>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SAFETY CENTER — `safety`. Grounding, never alarming. A calm explainer of how
   Aura keeps conversations safe (moderation + honest AI disclosure as quiet
   body text, not warning banners) + Chat's crisis support block REUSED verbatim
   (calm green token, never alarm-red). Stays still. Both themes.
   ════════════════════════════════════════════════════════════════════════ */
function SafetyScreen() {
  const T = useT();
  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', background: T.bg }}>
      <TopBar label="Safety center" />
      <div className="aura-noscroll" style={{ flex: 1, overflowY: 'auto', padding: '22px 18px 36px' }}>

        <h1 style={{ fontFamily: FF_DISPLAY, fontWeight: 600, fontSize: 26, lineHeight: 1.16, letterSpacing: '-0.015em',
          color: T.textPrimary, margin: '0 0 16px', maxWidth: '20ch', textWrap: 'pretty' }}>
          How Aura keeps conversations safe</h1>

        {/* calm explainer — quiet body text, not warning banners */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginBottom: 4 }}>
          <div>
            <h2 style={{ fontFamily: FF_BODY, fontWeight: 600, fontSize: 15.5, color: T.textPrimary, margin: '0 0 5px' }}>Gentle moderation</h2>
            <p style={{ fontFamily: FF_BODY, fontSize: 14.5, lineHeight: 1.6, color: T.textSecondary, margin: 0, maxWidth: '40ch', textWrap: 'pretty' }}>
              Aura watches for harmful content and steps in gently, never to judge, only to keep things safe.</p>
          </div>
          <div>
            <h2 style={{ fontFamily: FF_BODY, fontWeight: 600, fontSize: 15.5, color: T.textPrimary, margin: '0 0 5px' }}>Honest about being AI</h2>
            <p style={{ fontFamily: FF_BODY, fontSize: 14.5, lineHeight: 1.6, color: T.textSecondary, margin: 0, maxWidth: '40ch', textWrap: 'pretty' }}>
              Your companions are AI: supportive company, never a substitute for professional care.</p>
          </div>
        </div>

        {/* reused crisis support block — same warm green surface as Chat */}
        <div style={{ marginTop: 8 }}>
          <CrisisCard T={T} />
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   PRIVACY / LEGAL — `legal`. Layered privacy notice: a plain-language retention
   summary card ABOVE the formal text, then sectioned policy body in a calm
   reading layout (serif headings, relaxed measure). Ink-on-paper — no accent,
   no motion. Soft press on the Terms link only. Both themes.
   ════════════════════════════════════════════════════════════════════════ */
const PRIVACY_SECTIONS = [
  { h: 'What we collect', p: 'Your messages, the memories your companion saves, and basic account details like your name and email. We don’t collect data we don’t need, and we never sell it.' },
  { h: 'Why we keep it', p: 'Conversations and memories are stored so your companion can remember you between visits. That continuity is the point. Account details let us keep your subscription and sign-in working.' },
  { h: 'Who can see it', p: 'Your conversations are private to you. A small amount of content may be processed automatically to keep things safe (see the Safety center), but we don’t share your chats with advertisers or third parties.' },
  { h: 'Your controls', p: 'You can export a copy of everything, or delete your account, at any time from Privacy & Safety. Deletion is permanent after a 30-day grace period.' },
];

function LegalScreen() {
  const T = useT();
  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', background: T.bg }}>
      <TopBar label="Privacy policy" />
      <div className="aura-noscroll" style={{ flex: 1, overflowY: 'auto', padding: '22px 20px 40px' }}>

        {/* plain-language summary — the human layer, read first */}
        <div style={{ background: T.raised, border: `1px solid ${T.border}`, borderRadius: RADIUS.edit,
          padding: '16px 17px', marginBottom: 26 }}>
          <div style={{ fontFamily: FF_BODY, fontWeight: 600, fontSize: 11.5, letterSpacing: '0.13em', textTransform: 'uppercase',
            color: T.textTertiary, marginBottom: 8 }}>In plain terms</div>
          <p style={{ margin: 0, fontFamily: FF_BODY, fontSize: 15, lineHeight: 1.6, color: T.textPrimary, textWrap: 'pretty' }}>
            Your conversations are yours. We keep them so Aurora can remember you, and you can export or delete everything anytime.</p>
        </div>

        {/* formal policy — sectioned reading text, serif headings */}
        <div style={{ fontFamily: FF_BODY, fontSize: 11.5, letterSpacing: '0.04em', color: T.textTertiary, marginBottom: 18 }}>
          Last updated June 24, 2026</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {PRIVACY_SECTIONS.map(s => (
            <section key={s.h}>
              <h2 style={{ fontFamily: FF_DISPLAY, fontWeight: 600, fontSize: 19, lineHeight: 1.25, letterSpacing: '-0.005em',
                color: T.textPrimary, margin: '0 0 7px' }}>{s.h}</h2>
              <p style={{ margin: 0, fontFamily: FF_BODY, fontSize: 14.5, lineHeight: 1.62, color: T.textSecondary,
                maxWidth: '42ch', textWrap: 'pretty' }}>{s.p}</p>
            </section>
          ))}
        </div>

        {/* link out to full Terms */}
        <div style={{ marginTop: 30, paddingTop: 20, borderTop: `1px solid ${T.divider}` }}>
          <a href="OneOff.html"
            onPointerDown={e => e.currentTarget.style.background = T.raised}
            onPointerUp={e => e.currentTarget.style.background = 'transparent'}
            onPointerLeave={e => e.currentTarget.style.background = 'transparent'}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '13px 14px',
              margin: '0 -14px', borderRadius: RADIUS.tight + 2, textDecoration: 'none', WebkitTapHighlightColor: 'transparent',
              fontFamily: FF_BODY, fontWeight: 600, fontSize: 15, color: T.textPrimary, transition: 'background .12s' }}>
            Read the full Terms of Service
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.textTertiary} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={{ flex: 'none' }}><path d="M9 18l6-6-6-6"/></svg>
          </a>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   HELP / SUPPORT — `help`. Short FAQ: 4 expand-in-place disclosure rows in the
   shared list-group + a quiet Contact support footer. Neutral (no accent), calm
   height ease (no bounce), soft press. Both themes.
   ════════════════════════════════════════════════════════════════════════ */
const FAQ = [
  { q: 'How do I edit my profile or delete my account?',
    a: 'Open You → Edit profile to change your name or avatar color. To delete your account, go to You → Privacy & Safety → Delete account. It’s deactivated right away and permanently removed after a 30-day grace period.' },
  { q: 'How do I restore a purchase or manage my subscription?',
    a: 'On the Premium screen, tap Restore Purchases to recover an existing subscription. To change or cancel, use Manage in App Store. Billing is handled securely by the App Store, not inside Aura.' },
  { q: 'How does Aura keep conversations safe?',
    a: 'Aura watches for harmful content and steps in gently, and your companions are always honest about being AI: supportive company, never a substitute for professional care. The Safety center has crisis resources whenever you need them.' },
  { q: 'How do companions remember things, and can I edit what they know?',
    a: 'As you talk, your companion notes things that matter: where you live, what you’re working through, who’s close to you. Open Memory to see everything it remembers, and edit or remove any of it at any time. You’re always in control.' },
];

function FaqRow({ T, q, a, open, onToggle, isLast }) {
  const ref = useRef(null);
  const reduce = prefersReducedMotion();
  return (
    <div style={{ borderBottom: isLast ? 'none' : `1px solid ${T.divider}` }}>
      <button type="button" aria-expanded={open} onClick={onToggle}
        onPointerDown={e => e.currentTarget.style.background = T.raised}
        onPointerUp={e => e.currentTarget.style.background = 'transparent'}
        onPointerLeave={e => e.currentTarget.style.background = 'transparent'}
        style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 12, padding: '15px 16px',
          background: 'transparent', border: 'none', cursor: 'pointer', WebkitTapHighlightColor: 'transparent', transition: 'background .12s' }}>
        <span style={{ flex: 1, fontFamily: FF_BODY, fontWeight: 500, fontSize: 15, lineHeight: 1.4, color: T.textPrimary, textWrap: 'pretty' }}>{q}</span>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={T.textTertiary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ flex: 'none', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: reduce ? 'none' : 'transform .24s ease' }}><path d="M6 9l6 6 6-6"/></svg>
      </button>
      <div style={{ overflow: 'hidden', maxHeight: open ? (ref.current ? ref.current.scrollHeight + 4 : 400) : 0,
        transition: reduce ? 'none' : 'max-height .28s ease' }}>
        <p ref={ref} style={{ margin: 0, padding: '0 16px 16px', fontFamily: FF_BODY, fontSize: 14, lineHeight: 1.6,
          color: T.textSecondary, maxWidth: '44ch', textWrap: 'pretty' }}>{a}</p>
      </div>
    </div>
  );
}

function HelpScreen() {
  const T = useT();
  const [open, setOpen] = useState(null);
  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', background: T.bg }}>
      <TopBar label="Help" />
      <div className="aura-noscroll" style={{ flex: 1, overflowY: 'auto', padding: '20px 16px 36px' }}>

        <ListGroup T={T} label="Frequently asked">
          {FAQ.map((f, i) => (
            <FaqRow key={f.q} T={T} q={f.q} a={f.a} open={open === i}
              onToggle={() => setOpen(o => o === i ? null : i)} isLast={i === FAQ.length - 1} />
          ))}
        </ListGroup>

        {/* quiet contact support footer */}
        <div style={{ marginTop: 8, textAlign: 'center' }}>
          <p style={{ fontFamily: FF_BODY, fontSize: 13, lineHeight: 1.5, color: T.textTertiary, margin: '0 0 4px', textWrap: 'pretty' }}>
            Still need a hand?</p>
          <a href="OneOff.html"
            style={{ fontFamily: FF_BODY, fontWeight: 600, fontSize: 14, color: T.textSecondary, textDecoration: 'underline',
              textUnderlineOffset: 3, WebkitTapHighlightColor: 'transparent' }}>Contact support</a>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   SYSTEM-STATES KIT — `states`. A labeled reference board: each primitive shown
   in isolation per the rail toggle (empty · loading · error · offline · blocked),
   captioned as the canonical source the other screens pull from. Both themes.
   ════════════════════════════════════════════════════════════════════════ */
const STATE_META = {
  empty:   { name: 'EmptyState',     note: 'Warm mark + a human line + optional gentle CTA. Used by Memory.' },
  loading: { name: 'LoadingState',   note: 'Skeleton placeholders shaped like the real content — breathes slowly, never a spinner.' },
  error:   { name: 'ErrorState',     note: 'Calm “something went wrong” + a single Retry that says what to do next.' },
  offline: { name: 'Offline',        note: 'Warm, non-blocking banner. Auto-catches-up on reconnect — never red.' },
  blocked: { name: 'Blocked message', note: 'In-thread moderation. Softly held back, calm-neutral / green — never a red stamp.' },
};

function StatesScreen() {
  const T = useT();
  const d = useDev();
  const st = ['empty', 'loading', 'error', 'offline', 'blocked'].includes(d.screenState) ? d.screenState : 'empty';
  const meta = STATE_META[st];

  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', background: T.bg }}>
      <TopBar label="System-states kit" />

      {/* caption header — names the canonical primitive on view */}
      <div style={{ flex: 'none', padding: '14px 18px 12px', borderBottom: `1px solid ${T.divider}` }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 9, marginBottom: 4 }}>
          <span style={{ fontFamily: FF_DISPLAY, fontWeight: 600, fontSize: 18, color: T.textPrimary, letterSpacing: '-0.01em' }}>{meta.name}</span>
          <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: T.textTertiary,
            background: T.raised, border: `1px solid ${T.border}`, padding: '2px 7px', borderRadius: RADIUS.tight }}>{st}</span>
        </div>
        <p style={{ margin: 0, fontFamily: FF_BODY, fontSize: 12.5, lineHeight: 1.45, color: T.textSecondary, textWrap: 'pretty' }}>{meta.note}</p>
      </div>

      {/* the live primitive, in the surface its job implies */}
      {st === 'loading' ? (
        <div className="aura-noscroll" style={{ flex: 1, overflowY: 'auto' }}><LoadingState T={T} groups={3} /></div>
      ) : st === 'error' ? (
        <ErrorState T={T} title="Something went wrong"
          body="We couldn’t load this just now. Give it another try in a moment."
          onRetry={() => {}} />
      ) : st === 'empty' ? (
        <EmptyState T={T}
          mark={<svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-4.6-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.4-7 10-7 10Z"/></svg>}
          title="Nothing here yet"
          body="A warm line that explains the emptiness and points gently at what comes next." />
      ) : st === 'offline' ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '18px 16px' }} className="aura-noscroll">
          <OfflineBanner T={T} />
          <p style={{ fontFamily: FF_BODY, fontSize: 12.5, lineHeight: 1.5, color: T.textTertiary, margin: '14px 6px 0', textWrap: 'pretty' }}>
            Sits above content without blocking it — the screen stays usable and reconciles when the connection returns.</p>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 18px', display: 'flex', flexDirection: 'column' }} className="aura-noscroll">
          {/* a little thread context so the held-back turn reads correctly */}
          <div style={{ alignSelf: 'flex-start', maxWidth: '82%', padding: '11px 15px', marginTop: 14, background: T.sheet,
            borderRadius: '18px 18px 18px 6px', boxShadow: T.e1, fontFamily: FF_BODY, fontSize: 15.5, lineHeight: 1.56, color: T.textPrimary }}>
            I’m here — what’s on your mind?</div>
          <BlockedMessage T={T} />
        </div>
      )}
    </div>
  );
}

/* ── Shell: dev rail picks the active pushed screen ────────────────────────── */
function Shell() {
  const d = useDev();
  const [kbFocus, setKbFocus] = useState(false);
  const screen = SCREENS.find(s => s.id === d.screenId) || SCREENS[0];
  if (screen.id === 'chat') {
    return (
      <IOSDevice dark={d.theme === 'dark'} keyboard={kbFocus}>
        <ChatScreen onFocusChange={setKbFocus} />
      </IOSDevice>
    );
  }
  if (screen.id === 'create') {
    return (
      <IOSDevice dark={d.theme === 'dark'}>
        <CreateScreen />
      </IOSDevice>
    );
  }
  if (screen.id === 'memory') {
    return (
      <IOSDevice dark={d.theme === 'dark'}>
        <MemoryScreen />
      </IOSDevice>
    );
  }
  if (screen.id === 'paywall') {
    return (
      <IOSDevice dark={d.theme === 'dark'}>
        <PaywallScreen />
      </IOSDevice>
    );
  }
  // submgmt = "your subscription" for both tiers (Free shows plan + upgrade; Premium shows billing)
  if (screen.id === 'submgmt') {
    return (
      <IOSDevice dark={d.theme === 'dark'}>
        <SubMgmtScreen />
      </IOSDevice>
    );
  }
  if (screen.id === 'signin') {
    return (
      <IOSDevice dark={d.theme === 'dark'}>
        <SigninSecurityScreen />
      </IOSDevice>
    );
  }
  if (screen.id === 'editprofile') {
    const kb = d.screenState === 'focus' || d.screenState === 'error';
    return (
      <IOSDevice dark={d.theme === 'dark'} keyboard={kb}>
        <EditProfileScreen />
      </IOSDevice>
    );
  }
  if (screen.id === 'account') {
    return (
      <IOSDevice dark={d.theme === 'dark'}>
        <AccountScreen />
      </IOSDevice>
    );
  }
  if (screen.id === 'notifs') {
    return (
      <IOSDevice dark={d.theme === 'dark'}>
        <NotifsScreen />
      </IOSDevice>
    );
  }
  if (screen.id === 'safety') {
    return (
      <IOSDevice dark={d.theme === 'dark'}>
        <SafetyScreen />
      </IOSDevice>
    );
  }
  if (screen.id === 'legal') {
    return (
      <IOSDevice dark={d.theme === 'dark'}>
        <LegalScreen />
      </IOSDevice>
    );
  }
  if (screen.id === 'help') {
    return (
      <IOSDevice dark={d.theme === 'dark'}>
        <HelpScreen />
      </IOSDevice>
    );
  }
  if (screen.id === 'states') {
    return (
      <IOSDevice dark={d.theme === 'dark'}>
        <StatesScreen />
      </IOSDevice>
    );
  }
  return (
    <IOSDevice dark={d.theme === 'dark'}>
      <Stub screen={screen} />
    </IOSDevice>
  );
}

const _params = new URLSearchParams(window.location.search);
const _initialScreen = SCREENS.some(s => s.id === _params.get('screen')) ? _params.get('screen') : 'chat';

ReactDOM.createRoot(document.getElementById('root')).render(
  <DevProvider screens={SCREENS} initial={{ screenId: _initialScreen, theme: 'light', account: 'free', dataState: 'happy' }}>
    <DevStage><Shell /></DevStage>
  </DevProvider>
);
