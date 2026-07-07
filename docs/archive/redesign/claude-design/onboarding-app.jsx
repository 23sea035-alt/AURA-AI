/* ════════════════════════════════════════════════════════════════════════
   Aura — Onboarding flow  ·  SCAFFOLD ONLY
   Every screen is a stub (title + purpose + current dev-state). Real screens
   get designed later with their own targeted prompts. This file keeps the
   plumbing: screen registry, Shell next/back wiring, auth mode switch,
   carousel step-advance, age-gate under-18 dead-end, and the dev rail.
   "Reading Nook" tokens (terracotta on paper cream) — warm + opaque surfaces.
   ════════════════════════════════════════════════════════════════════════ */
const { useState } = React;

/* ── tokens · single source of truth → tokens.js (window.AURA) ──────────── */
const { FONTS, TOKENS } = window.AURA;
const FF_DISPLAY = FONTS.display;
const FF_BODY = FONTS.body;
function useT() { const { theme } = useDev(); return TOKENS[theme === 'dark' ? 'dark' : 'light']; }

const SAFE_TOP = 60;

/* ── screen registry ───────────────────────────────────────────────────────
   Flow order (linear): Welcome → Auth → Carousel → Age gate → AI disclosure
   → Profile → Pick companion → Conversation.
   Welcome is a SINGLE value-prop page (no carousel). The 3-screen carousel is
   its own step, AFTER auth.
   ─────────────────────────────────────────────────────────────────────────── */
const SCREENS = [
  { id: 'welcome',     label: 'Welcome',              desc: 'Single value-prop page, shown before sign-up.' },
  { id: 'auth',        label: 'Auth',                 states: ['signup', 'signin', 'forgot', 'verify', 'reset'], desc: 'Account entry with swappable modes.' },
  { id: 'carousel',    label: 'Intro carousel',       states: ['slide1', 'slide2', 'slide3'], desc: 'A 3-screen intro, shown right after auth.' },
  { id: 'agegate',     label: 'Age gate',             states: ['default', 'under18'], desc: 'Confirm you are 18 or older to continue.' },
  { id: 'disclosure',  label: 'AI disclosure + Terms', desc: 'Honest “you’re talking to an AI” notice and Terms.' },
  { id: 'profile',     label: 'Profile setup',        desc: 'A name so your companion can say hello.' },
  { id: 'persona',     label: 'Choose your companion', desc: 'Pick the first companion to talk with.' },
  { id: 'conversation', label: 'Conversation',        states: ['default', 'typing', 'crisis', 'limit-reached'], desc: 'The core 1:1 chat — everything orbits this.' },
];

/* ── stub footer nav (keeps the linear flow traversable) ───────────────────── */
function NavLink({ children, onClick, disabled, align = 'left' }) {
  const T = useT();
  if (disabled) {
    return <span style={{ fontFamily: FF_BODY, fontWeight: 600, fontSize: 14.5, color: T.textTertiary, opacity: 0.8 }}>{children}</span>;
  }
  return (
    <button type="button" onClick={onClick}
      style={{ background: 'none', border: 'none', padding: '6px 2px', cursor: 'pointer',
        fontFamily: FF_BODY, fontWeight: 600, fontSize: 14.5, color: T.accent,
        textAlign: align, WebkitTapHighlightColor: 'transparent' }}>
      {children}
    </button>
  );
}

/* ── the one stub used by every screen ─────────────────────────────────────── */
function Stub({ screen, index, total, onBack, onNext, canBack, canNext, nextLabel, terminalNote }) {
  const T = useT();
  const d = useDev();
  const stateName = screen.states ? d.screenState : null;
  return (
    <div style={{ minHeight: '100%', background: T.bg, display: 'flex', flexDirection: 'column', padding: `${SAFE_TOP}px 28px 36px` }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
        <div style={{ fontFamily: FF_BODY, fontWeight: 600, fontSize: 11.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: T.textTertiary, marginBottom: 16 }}>
          {`Screen ${index + 1} of ${total}`}
        </div>
        <h1 style={{ fontFamily: FF_DISPLAY, fontWeight: 600, fontSize: 36, lineHeight: 1.08, color: T.textPrimary, margin: '0 0 14px', letterSpacing: 0.2 }}>
          {screen.label}
        </h1>
        <p style={{ fontFamily: FF_BODY, fontSize: 16, lineHeight: 1.55, color: T.textSecondary, margin: 0, maxWidth: '28ch', textWrap: 'pretty' }}>
          {screen.desc}
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 36, borderTop: `1px solid ${T.divider}`, paddingTop: 14 }}>
        {canBack ? <NavLink onClick={onBack}>‹ Back</NavLink> : <span />}
        {canNext ? <NavLink onClick={onNext} align="right">{nextLabel || 'Next'} ›</NavLink>
          : <span style={{ fontFamily: FF_BODY, fontWeight: 600, fontSize: 13, color: T.textTertiary }}>{terminalNote}</span>}
      </div>
    </div>
  );
}

/* ── Welcome · single pre-auth value-prop page ──────────────────────────────
   Word-led, vertically generous. Reading-order staggered entrance:
   mark → illustration → promise → supporting → buttons → caption.
   ─────────────────────────────────────────────────────────────────────────── */

// Warm tonal anchor — nested cradle arcs + a resting mark. Simple primitives,
// no glowing orb / floating blobs. Reads as warmth being held.
const MARK_WINE_D = "M0 0 C0.85207031 0.26651367 1.70414063 0.53302734 2.58203125 0.80761719 C56.58032148 17.70491707 105.13901296 49.47309469 132.9375 99.95092773 C144.87581171 122.97442271 150.11748681 147.23820308 150.25 173.0625 C150.2593457 174.31691895 150.26869141 175.57133789 150.27832031 176.86376953 C150.16264418 210.88589867 141.05121484 249.71764436 117 275 C116.28457031 275.79277344 115.56914063 276.58554687 114.83203125 277.40234375 C104.50640638 288.38588454 90.64582962 296.40659876 75.38818359 297.12255859 C61.02110051 297.52171143 48.34800554 297.2951788 35.1796875 291.015625 C32.98447834 289.99276769 30.77045292 289.15340849 28.5 288.3125 C16.15970544 283.37638217 4.81397614 276.33074402 -6.5 269.4375 C-16.09752723 263.60633737 -25.67433292 258.40488564 -36 254 C-37.00546875 253.53464844 -38.0109375 253.06929688 -39.046875 252.58984375 C-65.17584353 241.288028 -97.80357611 240.21435708 -125 248 C-125.76022461 248.21430664 -126.52044922 248.42861328 -127.30371094 248.64941406 C-159.59247898 258.0130205 -189.77561768 277.97253478 -210 305 C-210.39106934 305.5161084 -210.78213867 306.0322168 -211.18505859 306.56396484 C-238.06585737 342.216953 -252.51978793 384.24404536 -252.3125 428.875 C-252.31026428 430.07373749 -252.31026428 430.07373749 -252.3079834 431.29669189 C-252.24571475 449.99355004 -251.32957497 468.83987462 -245.67480469 486.78662109 C-244.84858148 489.49665713 -244.10207905 492.22506619 -243.3515625 494.95703125 C-234.87159728 525.35993814 -221.54051616 553.69074835 -207.6328125 581.9296875 C-207.15908707 582.8915799 -206.68536163 583.85347229 -206.19728088 584.84451294 C-205.71814743 585.81734222 -205.23901398 586.79017151 -204.74536133 587.79248047 C-187.55712097 622.6988988 -187.55712097 622.6988988 -181 640 C-180.71318359 640.73814941 -180.42636719 641.47629883 -180.13085938 642.23681641 C-175.38008411 654.52819573 -172.11018041 667.20828623 -169 680 C-168.82017578 680.70125 -168.64035156 681.4025 -168.45507812 682.125 C-165.16959895 695.62486773 -164.58650473 709.36217245 -164.625 723.1875 C-164.6262085 723.99637665 -164.62741699 724.8052533 -164.62866211 725.63864136 C-164.76272686 758.80536178 -174.35416565 786.35416565 -198.0234375 810.0234375 C-209.15594445 820.4043828 -222.91924903 825.88395026 -237 831 C-237.74209717 831.27102539 -238.48419434 831.54205078 -239.2487793 831.82128906 C-244.85423381 833.78508165 -250.4774375 835.04682881 -256.3125 836.125 C-257.17294922 836.29386719 -258.03339844 836.46273437 -258.91992188 836.63671875 C-312.13241694 846.67084922 -370.1802764 833.93872306 -414.74951172 803.58691406 C-421.13380165 799.08508237 -427.12774795 794.14568022 -433 789 C-433.64453125 788.43522949 -434.2890625 787.87045898 -434.953125 787.28857422 C-459.39821638 765.63633453 -476.92162224 739.09749605 -491.08691406 709.85253906 C-491.97467378 708.05138379 -492.90477906 706.27129447 -493.8359375 704.4921875 C-497.7974316 696.89788222 -500.83103725 689.31426558 -503.54296875 681.203125 C-504.57530072 678.13461226 -505.73839894 675.14681627 -506.96875 672.15234375 C-517.30330733 646.58316035 -522.2414958 618.48623703 -526.3125 591.3125 C-526.43569611 590.49394531 -526.55889221 589.67539062 -526.68582153 588.83203125 C-527.52033803 583.22902022 -528.28108035 577.6189322 -529 572 C-529.10064758 571.24157806 -529.20129517 570.48315613 -529.30499268 569.70175171 C-531.29055963 554.38938738 -531.3065475 539.1111284 -531.25390625 523.69006348 C-531.24742912 520.36952385 -531.26281902 517.04903792 -531.2734375 513.72851562 C-531.28236089 498.36994141 -530.63578261 483.26822292 -529 468 C-528.84040013 466.40598233 -528.68214931 464.81182888 -528.52539062 463.2175293 C-524.62885803 424.06825472 -517.29902527 385.90427504 -505.5 348.3125 C-505.12230469 347.09755859 -504.74460937 345.88261719 -504.35546875 344.63085938 C-497.71393135 323.34826961 -497.71393135 323.34826961 -495.125 317.8125 C-493.11052028 313.47423068 -491.56145569 309.01529843 -490 304.5 C-486.82692075 295.36978374 -483.00790922 286.87397678 -478.5625 278.28515625 C-477.28840983 275.60638168 -476.1705598 272.95358185 -475.08984375 270.1953125 C-473.14672582 265.27222598 -470.94232214 260.53804243 -468.5625 255.8125 C-468.13348389 254.96010742 -467.70446777 254.10771484 -467.26245117 253.22949219 C-451.40006994 222.07497371 -432.55702236 192.51120823 -411 165 C-409.8035281 163.41452738 -408.60707353 161.82904095 -407.41210938 160.24243164 C-394.06570498 142.61485407 -378.70842812 126.64052023 -363.125 111 C-362.24521484 110.11554199 -361.36542969 109.23108398 -360.45898438 108.31982422 C-355.46610693 103.33924916 -350.36659636 98.57370666 -345 94 C-343.87028014 93.01525553 -342.7413447 92.02961027 -341.61328125 91.04296875 C-333.9556553 84.39925647 -326.1449286 78.03908168 -318 72 C-316.98679687 71.24783203 -316.98679687 71.24783203 -315.953125 70.48046875 C-279.80536634 43.75973348 -240.57700735 21.66180236 -198 7 C-196.32804565 6.42113037 -196.32804565 6.42113037 -194.62231445 5.83056641 C-174.54834559 -1.00373539 -154.03345289 -5.87207665 -133.0625 -8.9375 C-132.03459854 -9.08989136 -132.03459854 -9.08989136 -130.9859314 -9.24536133 C-87.98102745 -15.52040477 -41.45374624 -13.49859384 0 0 Z ";
const MARK_HONEY_D = "M0 0 C1.64548828 0.433125 1.64548828 0.433125 3.32421875 0.875 C12.01912489 3.47534576 20.02168403 7.74306043 28 12 C28.61166016 12.32516602 29.22332031 12.65033203 29.85351562 12.98535156 C47.60358587 22.51995214 62.67678021 35.0279816 77.375 48.6875 C78.02903809 49.29295654 78.68307617 49.89841309 79.35693359 50.5222168 C83.87830503 54.77345788 87.97716408 59.27831271 92 64 C92.85722656 64.97582031 93.71445312 65.95164062 94.59765625 66.95703125 C116.53550994 92.3715654 136.79164646 122.55806105 148.05859375 154.36328125 C148.9422505 156.83825348 149.9541302 159.18140138 151.0625 161.5625 C153.01409493 165.84190093 154.46264234 170.23186922 155.875 174.71484375 C156.81309956 177.45422474 157.84316437 180.09674975 158.94140625 182.7734375 C160.91872865 187.67190833 162.50808155 192.6047941 163.9375 197.6875 C164.31926392 199.03980713 164.31926392 199.03980713 164.70874023 200.41943359 C167.59253118 210.85284365 169.85703161 221.393577 172 232 C172.21543457 233.03334473 172.43086914 234.06668945 172.65283203 235.13134766 C176.22206338 252.34717659 178.24523643 269.41057147 179.63525391 286.91235352 C179.86972308 289.70880157 180.17083957 292.48844126 180.51708984 295.27319336 C182.28719575 309.93318278 182.30722176 324.57852007 182.26074219 339.3215332 C182.24948767 342.92197395 182.25604833 346.52211438 182.2676115 350.12254429 C182.33953487 376.50707076 181.75514993 403.0734429 177.6875 429.1875 C177.46866071 430.65428356 177.24991288 432.12108076 177.03125 433.58789062 C175.38989127 444.3820698 173.31559321 455.0367947 170.60302734 465.61474609 C170.00968321 467.96169839 169.4634424 470.31552313 168.92578125 472.67578125 C162.75574143 498.90327728 151.12020093 530.86694395 127.29882812 546.08691406 C109.49459111 556.65638307 90.57322477 561.1295668 70.3125 564.1875 C69.20890137 564.35451416 68.10530273 564.52152832 66.96826172 564.69360352 C52.48485676 566.78030497 38.10446597 567.20575896 23.5 567.1875 C22.6042627 567.18689575 21.70852539 567.1862915 20.78564453 567.18566895 C-64.14092819 567.03113364 -64.14092819 567.03113364 -88.8828125 543.27734375 C-99.83276012 531.49907906 -103.38810585 515.67510735 -103.3125 500.0625 C-103.31121094 498.92425781 -103.30992187 497.78601563 -103.30859375 496.61328125 C-103.22263826 488.80852264 -102.54283483 481.22871267 -101.5 473.5 C-97.4793701 442.76383808 -99.65092979 411.86277921 -108 382 C-108.34237241 380.60150704 -108.67937998 379.20169252 -109.01171875 377.80078125 C-116.26746499 347.73751063 -129.35231129 319.78916786 -142.47109985 291.93838501 C-170.24303777 232.97589898 -170.24303777 232.97589898 -176.52978516 203.22119141 C-176.83186912 201.79421328 -177.1432708 200.36915841 -177.46630859 198.94677734 C-182.53035585 176.19962452 -181.95070946 149.7280122 -177 127 C-176.86609863 126.33693848 -176.73219727 125.67387695 -176.59423828 124.99072266 C-168.07656985 83.31093178 -143.37487047 43.52587527 -107.8190918 19.75024414 C-105.88773929 18.48658311 -103.94668356 17.23987973 -102 16 C-100.98292969 15.34257812 -99.96585938 14.68515625 -98.91796875 14.0078125 C-69.3242793 -4.20991698 -33.48669359 -9.18567152 0 0 Z ";

// Aura logo mark. Colors and shapes are fixed (brand). Animation lives in CSS
// on #wine / #honey (see Onboarding.html): honey settles first, wine sweeps over
// to shelter it. The cream gap between shapes is the warm screen bg showing through.
function AuraAnchor({ size = 196, animate = true }) {
  // animate=true gives the groups the #wine/#honey ids the CSS keyframes target (the hero
  // entrance on Welcome); animate=false renders a static mark (e.g. the small auth header logo).
  return (
    <svg width={size} height={size} viewBox="0 0 1254 1254" fill="none" aria-hidden="true"
      style={{ display: 'block', overflow: 'visible' }}>
      <g id={animate ? 'wine' : undefined}><path d={MARK_WINE_D} fill="#8F4150" transform="translate(810,214)" /></g>
      <g id={animate ? 'honey' : undefined}><path d={MARK_HONEY_D} fill="#BD6B45" transform="translate(765,490)" /></g>
    </svg>
  );
}

function Welcome({ onGetStarted, onSignIn }) {
  const T = useT();
  const fade = (delay) => ({ animationDelay: `${delay}s` });
  return (
    <div style={{ minHeight: '100%', background: T.bg, display: 'flex', flexDirection: 'column',
      padding: `${SAFE_TOP}px 24px 28px` }}>

      {/* wordmark — quiet, near top */}
      <div className="aura-enter" style={{ ...fade(0.04), display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9 }}>
        <span className="aura-pulse" style={{ width: 11, height: 11, borderRadius: '50%', background: T.accent, display: 'inline-block' }} />
        <span style={{ fontFamily: FF_DISPLAY, fontWeight: 600, fontSize: 21, letterSpacing: '0.01em', color: T.textPrimary }}>Aura</span>
      </div>

      {/* illustration anchor — focal middle */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
        <div className="aura-enter" style={{ ...fade(0.18), animationDuration: '.7s' }}>
          <AuraAnchor />
        </div>
      </div>

      {/* promise + supporting line */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <h1 className="aura-enter" style={{ ...fade(0.26), fontFamily: FF_DISPLAY, fontWeight: 600,
          fontSize: 38, lineHeight: 1.08, letterSpacing: '-0.02em', color: T.textPrimary,
          margin: '0 0 14px', textWrap: 'balance' }}>
          A companion who<br />remembers you.
        </h1>
        <p className="aura-enter" style={{ ...fade(0.34), fontFamily: FF_BODY, fontWeight: 400,
          fontSize: 17, lineHeight: 1.55, color: T.textSecondary, margin: '0 auto', maxWidth: '26ch',
          textWrap: 'pretty' }}>
          Someone to talk to who carries your story forward, quietly and at your pace.
        </p>
      </div>

      {/* actions — bottom-anchored above safe area */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <button type="button" onClick={onGetStarted} className="aura-enter aura-press"
          style={{ ...fade(0.42), width: '100%', border: 'none', cursor: 'pointer',
            background: T.accent, color: T.onAccent, borderRadius: 12, padding: '16px 20px',
            fontFamily: FF_BODY, fontWeight: 600, fontSize: 17, letterSpacing: '0.005em',
            boxShadow: T.e1, WebkitTapHighlightColor: 'transparent',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          Get started
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ marginTop: 1 }}>
            <path d="M3 8h9M9 4.5L12.5 8 9 11.5" stroke={T.onAccent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button type="button" onClick={onSignIn} className="aura-enter"
          style={{ ...fade(0.5), width: '100%', background: 'none', border: 'none', cursor: 'pointer',
            color: T.textSecondary, padding: '12px 16px', fontFamily: FF_BODY, fontWeight: 600,
            fontSize: 15, WebkitTapHighlightColor: 'transparent' }}>
          I already have an account
        </button>
      </div>

      {/* age note — smallest caption */}
      <div className="aura-enter" style={{ ...fade(0.56), textAlign: 'center', marginTop: 16,
        fontFamily: FF_BODY, fontWeight: 500, fontSize: 12, color: T.textTertiary }}>
        For adults 18+
      </div>
    </div>
  );
}

/* ── Auth · one structural surface, body swaps per mode ─────────────────────
   modes: signup · signin · forgot · verify · reset. Frame/social/footer stay;
   only the field block cross-fades. CTA carries idle → loading → done.
   ─────────────────────────────────────────────────────────────────────────── */
const { useState: useStateA, useEffect: useEffectA, useRef: useRefA } = React;

function AuthField({ T, label, type = 'text', value, onChange, placeholder, reveal, onReveal, revealed, autoFocus }) {
  const [focus, setFocus] = useStateA(false);
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontFamily: FF_BODY, fontWeight: 600, fontSize: 12.5,
        color: focus ? T.accent : T.textSecondary, marginBottom: 7, letterSpacing: '0.005em',
        transition: REDUCED ? 'none' : 'color .15s' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', background: T.sheet,
        border: `1px solid ${focus ? T.accent : T.border}`, borderRadius: 8,
        padding: '0 12px', transform: focus && !REDUCED ? 'translateY(-1px)' : 'none',
        boxShadow: focus ? T.e1 : 'none',
        transition: REDUCED ? 'border-color 0s, box-shadow 0s' : 'border-color .15s, transform .15s, box-shadow .15s' }}>
        <input
          type={reveal && revealed ? 'text' : type}
          value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          autoFocus={autoFocus}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
            padding: '13px 0', fontFamily: FF_BODY, fontWeight: 400, fontSize: 16, color: T.textPrimary,
            WebkitTapHighlightColor: 'transparent' }} />
        {reveal && (
          <button type="button" onClick={onReveal} aria-label={revealed ? 'Hide password' : 'Show password'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '6px 0 6px 8px',
              display: 'flex', color: T.textTertiary, WebkitTapHighlightColor: 'transparent' }}>
            {revealed ? (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9.9 4.24A9.1 9.1 0 0 1 12 4c6.5 0 10 7 10 7a18 18 0 0 1-3.16 4.19M6.6 6.6A18 18 0 0 0 2 11s3.5 7 10 7a9 9 0 0 0 4.4-1.1"/><path d="M1 1l22 22"/></svg>
            )}
          </button>
        )}
      </div>
    </label>
  );
}

function SocialRow({ T, onSelect, verb = 'Continue' }) {
  const btn = (label, glyph) => (
    <button type="button" className="aura-press" onClick={onSelect}
      style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        background: T.raised, border: `1px solid ${T.border}`, borderRadius: 8, padding: '13px 14px',
        cursor: 'pointer', fontFamily: FF_BODY, fontWeight: 600, fontSize: 15.5, color: T.textPrimary,
        WebkitTapHighlightColor: 'transparent' }}>
      {glyph}{label}
    </button>
  );
  const apple = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={T.textPrimary}><path d="M17.05 12.04c-.02-2.05 1.68-3.04 1.76-3.09-.96-1.4-2.45-1.6-2.98-1.62-1.27-.13-2.48.75-3.12.75-.64 0-1.64-.73-2.7-.71-1.39.02-2.67.81-3.38 2.05-1.44 2.5-.37 6.2 1.04 8.23.69.99 1.51 2.1 2.58 2.06 1.04-.04 1.43-.67 2.69-.67 1.25 0 1.61.67 2.7.65 1.12-.02 1.82-1.01 2.5-2.01.79-1.15 1.11-2.27 1.13-2.33-.02-.01-2.17-.83-2.2-3.29zM15 6.3c.57-.69.95-1.65.85-2.6-.82.03-1.81.54-2.4 1.23-.53.61-.99 1.59-.87 2.52.91.07 1.85-.46 2.42-1.15z"/></svg>
  );
  const google = (
    <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
  );
  return <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{btn(`${verb} with Apple`, apple)}{btn(`${verb} with Google`, google)}</div>;
}

const AUTH_COPY = {
  signup:  { title: 'Create your account',   cta: 'Create account',   sub: 'Set up your account to meet your companion.' },
  signin:  { title: 'Welcome back',           cta: 'Sign in',          sub: 'Pick up right where you left off.' },
  forgot:  { title: 'Reset your password',    cta: 'Send reset code' },
  verify:  { title: 'Check your email',       cta: 'Verify' },
  reset:   { title: 'Set a new password',     cta: 'Update password',  sub: 'Choose a new password for your account.' },
};

function Auth({ mode, setMode, onDone, onWelcome }) {
  const T = useT();
  const [email, setEmail] = useStateA('');
  const [pw, setPw] = useStateA('');
  const [pw2, setPw2] = useStateA('');
  const [revealed, setRevealed] = useStateA(false);
  const [agree, setAgree] = useStateA(false);   // signup terms checkbox (soft gate)
  const [nudge, setNudge] = useStateA(false);   // inline "please agree" nudge
  const [code, setCode] = useStateA(['', '', '', '', '', '']);
  const [status, setStatus] = useStateA('idle'); // idle | loading | done
  const [timer, setTimer] = useStateA(0);
  const codeRefs = useRefA([]);
  const copy = AUTH_COPY[mode] || AUTH_COPY.signup;

  // reset transient state when the mode changes
  useEffectA(() => { setStatus('idle'); setNudge(false); }, [mode]);
  // resend countdown on the verify step
  useEffectA(() => {
    if (mode === 'verify') setTimer(30);
  }, [mode]);
  useEffectA(() => {
    if (timer <= 0) return;
    const id = setTimeout(() => setTimer((t) => t - 1), 1000);
    return () => clearTimeout(id);
  }, [timer]);

  const matchOk = mode !== 'reset' || pw2.length === 0 || pw === pw2;
  const canSubmit = (() => {
    if (status !== 'idle') return false;
    if (mode === 'signup') return email && pw;
    if (mode === 'signin') return email && pw;
    if (mode === 'forgot') return email;
    if (mode === 'verify') return code.every((c) => c !== '');
    if (mode === 'reset')  return pw && pw2 && pw === pw2;
    return false;
  })();

  // soft consent gate (signup): the SSO buttons + CTA stay visually enabled,
  // but a tap while unchecked nudges instead of starting the flow.
  const gate = (proceed) => {
    if (mode === 'signup' && !agree) { setNudge(true); return; }
    setNudge(false);
    proceed();
  };

  const submit = () => {
    if (mode === 'signup' && !agree) { setNudge(true); return; }
    if (!canSubmit) return;
    setNudge(false);
    setStatus('loading');
    setTimeout(() => {
      setStatus('done');
      setTimeout(() => {
        if (mode === 'signup') setMode('verify');
        else if (mode === 'forgot') setMode('verify');
        else if (mode === 'verify') onDone();      // → carousel
        else if (mode === 'reset') setMode('signin');
        else if (mode === 'signin') onDone();
        else setStatus('idle');
      }, 620);
    }, 1100);
  };

  const setCodeAt = (i, v) => {
    if (!/^\d?$/.test(v)) return;
    const next = code.slice(); next[i] = v; setCode(next);
    if (v && i < 5) codeRefs.current[i + 1]?.focus();
  };

  const linkBtn = (label, onClick, color) => (
    <button type="button" onClick={onClick}
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        fontFamily: FF_BODY, fontWeight: 600, fontSize: 13.5, color: color || T.accent,
        WebkitTapHighlightColor: 'transparent' }}>{label}</button>
  );

  // ── per-mode body ──────────────────────────────────────────────────────────
  let body;
  if (mode === 'verify') {
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <p style={{ fontFamily: FF_BODY, fontSize: 14.5, lineHeight: 1.55, color: T.textSecondary, margin: 0 }}>
          Enter the 6-digit code we sent to <span style={{ color: T.textPrimary, fontWeight: 600 }}>{email || 'your email'}</span>.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
          {code.map((c, i) => (
            <input key={i} ref={(el) => (codeRefs.current[i] = el)} inputMode="numeric" maxLength={1} value={c}
              onChange={(e) => setCodeAt(i, e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Backspace' && !c && i > 0) codeRefs.current[i - 1]?.focus(); }}
              style={{ width: 46, height: 56, textAlign: 'center', border: `1px solid ${c ? T.accent : T.border}`,
                borderRadius: 8, background: T.sheet, fontFamily: FF_DISPLAY, fontWeight: 600, fontSize: 24,
                color: T.textPrimary, outline: 'none' }} />
          ))}
        </div>
        <div style={{ fontFamily: FF_BODY, fontSize: 13.5, color: T.textSecondary }}>
          <button type="button" disabled={timer > 0} onClick={() => setTimer(30)}
            style={{ background: 'none', border: 'none', padding: 0,
              cursor: timer > 0 ? 'default' : 'pointer', fontFamily: FF_BODY, fontWeight: 600, fontSize: 13.5,
              color: timer > 0 ? T.textTertiary : T.accent, WebkitTapHighlightColor: 'transparent' }}>
            {timer > 0 ? `Resend in ${timer}s` : 'Resend code'}
          </button>
        </div>
      </div>
    );
  } else if (mode === 'reset') {
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <AuthField T={T} label="New password" type="password" value={pw} onChange={setPw}
          placeholder="At least 8 characters" reveal revealed={revealed} onReveal={() => setRevealed(!revealed)} autoFocus />
        <AuthField T={T} label="Confirm password" type="password" value={pw2} onChange={setPw2}
          placeholder="Re-enter password" reveal revealed={revealed} onReveal={() => setRevealed(!revealed)} />
        {!matchOk && (
          <div style={{ fontFamily: FF_BODY, fontSize: 13, color: T.error }}>Passwords don’t match yet.</div>
        )}
      </div>
    );
  } else if (mode === 'forgot') {
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <AuthField T={T} label="Email" type="email" value={email} onChange={setEmail}
          placeholder="you@email.com" autoFocus />
        <p style={{ fontFamily: FF_BODY, fontSize: 13.5, lineHeight: 1.55, color: T.textSecondary, margin: 0 }}>
          We’ll email you a 6-digit code to reset your password.
        </p>
      </div>
    );
  } else {
    // signup + signin
    body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <AuthField T={T} label="Email" type="email" value={email} onChange={setEmail}
          placeholder="you@email.com" autoFocus />
        <AuthField T={T} label="Password" type="password" value={pw} onChange={setPw}
          placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
          reveal revealed={revealed} onReveal={() => setRevealed(!revealed)} />
        {mode === 'signin' && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: -2 }}>
            {linkBtn('Forgot password?', () => setMode('forgot'))}
          </div>
        )}
      </div>
    );
  }

  const ctaContent = status === 'loading'
    ? <span className="aura-spin" style={{ width: 18, height: 18, borderRadius: '50%',
        border: `2px solid ${T.onAccent}`, borderTopColor: 'transparent', display: 'inline-block' }} />
    : status === 'done'
      ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.onAccent} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6"/></svg>
      : copy.cta;

  const showSocial = mode === 'signup' || mode === 'signin';
  const showLogo = mode === 'signup' || mode === 'signin';
  const handleBack = () => {
    if (mode === 'signup' || mode === 'signin') onWelcome();
    else if (mode === 'verify') setMode('signup');
    else setMode('signin');
  };

  return (
    <div style={{ minHeight: '100%', background: T.bg, display: 'flex', flexDirection: 'column',
      padding: `${SAFE_TOP + 2}px 24px 28px` }}>

      {/* nav row — shared bare BackChevron on EVERY mode (top-left) */}
      <div style={{ height: 44, display: 'flex', alignItems: 'center', marginBottom: 18 }}>
        <BackChevron T={T} onClick={handleBack} />
      </div>

      {/* ONE cohesive, top-anchored column: (logo) → title + subline → body →
          footer toggle. Snug spacing; leftover space trails below as calm
          whitespace (nothing pinned to the bottom edge). The logo slot keeps a
          fixed height in every mode so the title never jumps when modes switch.
          NOTE (real build): on field focus this column lifts so the active
          field clears the keyboard, settling back on blur; reduce-motion keeps
          the field visible without an animated lift. */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* logo slot — fixed height (keeps the title from jumping across modes); the real
            brand mark on signin/signup only, static (no hero animation on a utility screen). */}
        <div style={{ height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {showLogo && <AuraAnchor size={44} animate={false} />}
        </div>

        {/* title + quiet subline */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h1 style={{ fontFamily: FF_DISPLAY, fontWeight: 600, fontSize: 30, lineHeight: 1.1,
            letterSpacing: '-0.015em', color: T.textPrimary, margin: 0 }}>{copy.title}</h1>
          {copy.sub && (
            <p style={{ margin: 0, fontFamily: FF_BODY, fontWeight: 400, fontSize: 14.5, lineHeight: 1.45,
              color: T.textSecondary }}>{copy.sub}</p>
          )}
        </div>

        {/* SSO first — lead with the easiest path */}
        {showSocial && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <SocialRow T={T} onSelect={() => gate(onDone)} verb={mode === 'signup' ? 'Sign up' : 'Continue'} />

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 1, background: T.border }} />
              <span style={{ fontFamily: FF_BODY, fontWeight: 500, fontSize: 12, color: T.textTertiary }}>or</span>
              <div style={{ flex: 1, height: 1, background: T.border }} />
            </div>
          </div>
        )}

        {/* swapping block — fields + CTA cross-fade per mode */}
        <div key={mode} className="aura-fade" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {body}
          {/* signup consent — soft gate directly above the Create account CTA */}
          {mode === 'signup' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <label style={{ display: 'flex', gap: 10, alignItems: 'flex-start', cursor: 'pointer' }}>
                <button type="button" role="checkbox" aria-checked={agree}
                  onClick={() => { setAgree((v) => { const nv = !v; if (nv) setNudge(false); return nv; }); }}
                  style={{ width: 20, height: 20, flex: 'none', marginTop: 1, borderRadius: 5, cursor: 'pointer',
                    border: `1.5px solid ${agree ? T.accent : (nudge ? T.accent : T.textSecondary)}`,
                    background: agree ? T.accent : T.sheet,
                    boxShadow: nudge && !agree ? `0 0 0 3px ${T.accentTint}` : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
                    WebkitTapHighlightColor: 'transparent', transition: 'all .15s' }}>
                  {agree && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.onAccent} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6"/></svg>}
                </button>
                <span style={{ fontFamily: FF_BODY, fontSize: 13, lineHeight: 1.5, color: T.textSecondary }} onClick={(e) => e.preventDefault()}>
                  I agree to the {linkBtn('Terms of Service')} &amp; {linkBtn('Privacy Policy')}.
                </span>
              </label>
              {nudge && !agree && (
                <p style={{ margin: 0, paddingLeft: 30, fontFamily: FF_BODY, fontWeight: 500, fontSize: 12.5,
                  lineHeight: 1.4, color: T.accent }}>Please agree to the Terms &amp; Privacy Policy to continue.</p>
              )}
            </div>
          )}
          <button type="button" onClick={submit} disabled={mode !== 'signup' && !canSubmit} className="aura-press"
            style={{ width: '100%', border: 'none', borderRadius: 12, padding: '15px 20px',
              background: status === 'done' ? T.success : T.accent, color: T.onAccent,
              opacity: (mode === 'signup' || canSubmit || status !== 'idle') ? 1 : 0.5,
              cursor: 'pointer', fontFamily: FF_BODY, fontWeight: 600, fontSize: 16.5,
              minHeight: 52, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: T.e1, transition: 'background .25s, opacity .15s', WebkitTapHighlightColor: 'transparent' }}>
            {ctaContent}
          </button>
        </div>

        {/* footer toggle — last item in the column, directly under CTA */}
        {(mode === 'signup' || mode === 'signin') && (
          <div style={{ textAlign: 'center', fontFamily: FF_BODY, fontSize: 14, color: T.textSecondary }}>
            {mode === 'signup'
              ? <>Already have an account? {linkBtn('Sign in', () => setMode('signin'))}</>
              : <>New to Aura? {linkBtn('Create an account', () => setMode('signup'))}</>}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Carousel · post-auth 3-screen stories-style intro ──────────────────────
   Slim segmented bar (accent fill — the one place a thin accent earns it),
   one warm illustration + one feeling per slide. Swipe-tracks the finger,
   honors direction, NEVER auto-advances. Reduce-motion → cross-dissolve.
   ─────────────────────────────────────────────────────────────────────────── */
const { useState: useStateC, useRef: useRefC, useCallback: useCallbackC } = React;
const REDUCED = typeof window !== 'undefined' && window.matchMedia
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* Slide 1 hero — "every conversation connected, nothing lost". A single continuous,
   thick, warm RIBBON/thread (gouache weight, flat tonal fill, no outline) enters softly
   from the left, meanders GENTLY and roughly level, and fades off the right (ongoing —
   picks up where you left off). A FEW small conversation bubbles ride ON the thread at
   organic, uneven spots + varied heights — each a little conversation, linked. On land the
   ribbon draws L→R (slow, decelerating) and each bubble settles onto it in sequence as the
   draw-tip passes. Reduce-motion → whole, already linked. No Library Wine here.
   [Mini bubbles share slides 2 & 3's bubble register; the shared component lands at the RN port.] */
// wider, level meander with a clear central low point; ends run off both edges
const THREAD_D = 'M -22 96 C 48 72, 94 72, 142 104 C 176 126, 200 126, 236 100 C 282 70, 318 84, 346 94';
// the ribbon draws on L→R: a held breath, then a slow, decelerating trace (long faded tail)
const DRAW = 'ribbon-draw 1.8s cubic-bezier(.22,1,.16,1) .5s both';

function ThreadArt({ T, playKey, active }) {
  const dark = T.mode === 'dark';
  const sand  = T.avatar;                              // warm clay/sand ribbon
  const shade = dark ? '#5E3D30' : '#C08F6F';          // tonal shadow underneath the ribbon
  const sheen = dark ? 'rgba(244,236,223,0.16)' : 'rgba(255,252,246,0.55)';
  const animate = active && !REDUCED;

  // small conversation bubbles riding the thread — cream/sand, same register as slides 2 & 3
  const bubStops  = dark ? ['#3B3025', '#2C2319'] : ['#EFE0C6', '#E0CCA4']; // deepened for light-bg contrast
  const floodC    = dark ? '#000000' : '#785434';
  const lineC     = dark ? 'rgba(244,236,223,0.18)' : 'rgba(120,84,52,0.18)';

  // soft completion haptic as the last conversation settles onto the thread
  React.useEffect(() => {
    if (!active) return;
    const buzz = () => { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(8); };
    const t = setTimeout(buzz, REDUCED ? 80 : 2500);
    return () => clearTimeout(t);
  }, [active, playKey]);

  const dash = animate ? { strokeDasharray: 100, strokeDashoffset: 100, animation: DRAW } : {};
  // each conversation eases onto the thread as the draw-tip passes its spot (staggered settle)
  const settle = (delay) => (animate ? { animation: `bubble-settle .7s cubic-bezier(.16,1,.3,1) ${delay} both` } : {});
  // each conversation = ONE continuous SVG bubble silhouette whose bottom pulls into a real
  // integrated tail (same technique as slides 2 & 3 — no CSS rotated-square "diamond")
  const Mini = ({ id, left, top, tailLeft, delay }) => (
    <div style={{ position: 'absolute', left, top, ...settle(delay) }}>
      <svg width="56" height="44" viewBox="0 0 56 44" fill="none" aria-hidden="true"
        style={{ overflow: 'visible', transform: tailLeft ? 'none' : 'scaleX(-1)' }}>
        <defs>
          <linearGradient id={`mb-${id}`} x1="0" y1="0" x2="0.25" y2="1">
            <stop offset="0" stopColor={bubStops[0]} /><stop offset="1" stopColor={bubStops[1]} />
          </linearGradient>
          <filter id={`mbs-${id}`} x="-40%" y="-40%" width="180%" height="200%">
            <feDropShadow dx="0" dy="4" stdDeviation="3.5" floodColor={floodC} floodOpacity={dark ? 0.36 : 0.16} />
          </filter>
        </defs>
        <path d="M 15,4 L 41,4 Q 50,4 50,13 L 50,21 Q 50,30 41,30 L 29,30 C 25,30 22,35 18,38 C 21,34 22,32 24,30 L 15,30 Q 6,30 6,21 L 6,13 Q 6,4 15,4 Z"
          fill={`url(#mb-${id})`} filter={`url(#mbs-${id})`} />
        <rect x="16" y="14.5" width="23" height="3.6" rx="1.8" fill={lineC} />
      </svg>
    </div>
  );

  return (
    <div key={playKey} style={{ position: 'relative', width: 320, height: 200 }}>
      <svg width="320" height="200" viewBox="0 0 320 200" fill="none" aria-hidden="true"
        style={{ display: 'block',
          WebkitMaskImage: 'linear-gradient(90deg, transparent 0, #000 14%, #000 86%, transparent 100%)',
          maskImage: 'linear-gradient(90deg, transparent 0, #000 14%, #000 86%, transparent 100%)' }}>
        <path d={THREAD_D} transform="translate(0,5)" stroke={shade} strokeWidth="24"
          strokeLinecap="round" fill="none" opacity="0.5" pathLength="100" style={dash} />
        <path d={THREAD_D} stroke={sand} strokeWidth="24"
          strokeLinecap="round" fill="none" pathLength="100" style={dash} />
        <path d={THREAD_D} transform="translate(0,-5)" stroke={sheen} strokeWidth="6"
          strokeLinecap="round" fill="none" pathLength="100" style={dash} />
      </svg>
      {/* a few conversations linked along the thread — uneven spacing + varied heights (ride the hills/dips),
          NOT evenly spaced and NOT growing small→large (would read as a graph) */}
      <Mini id={`a-${playKey}`} left={58}  top={38} tailLeft={true}  delay=".9s" />
      <Mini id={`b-${playKey}`} left={134} top={82} tailLeft={false} delay="1.3s" />
      <Mini id={`c-${playKey}`} left={218} top={58} tailLeft={true}  delay="1.7s" />
    </div>
  );
}

/* Slide 2 hero — "a calm, private place to talk". A warm CALL-AND-RESPONSE: two
   soft filled chat bubbles with tails (the tails are what make them read as talk,
   not blobs). Companion bubble upper-left in warm sand paper; YOUR bubble lower-
   right in soft clay/terracotta — two distinct warm voices, NO Library Wine here
   (wine stays on the progress bar + Continue CTA). Same surface family as slides
   1 & 3: flat tonal fill, soft drop shade + a gentle top trim highlight, no outline,
   no line-art, no UI chrome. Privacy reads through emptiness + intimacy: just the
   two, close and cozy in open warm space, never caged in a container.
   Motion: companion eases in first (fade-up + small settle), a warm beat later your
   reply eases in — soft completion haptic as it lands. Reduce-motion → both whole,
   already nestled (slides cross-dissolve), haptic still fires. */
function ChatArt({ T, playKey, active }) {
  const dark = T.mode === 'dark';
  // two distinct WARM tones — companion = sand paper, you = soft clay/terracotta.
  // Each fill is a soft tonal gradient (light crown → deeper base), same painted
  // surface as slide 1's ribbon — not a flat UI card.
  const themGrad = dark
    ? 'linear-gradient(162deg, #3B3025 0%, #2C2319 100%)'
    : 'linear-gradient(162deg, #F8EFE0 0%, #EBDBC2 100%)';
  // warm CLAY (muted terracotta) — softened to sit in the cream bubble's family
  const youGrad = dark
    ? 'linear-gradient(162deg, #80584A 0%, #69463A 100%)'
    : 'linear-gradient(162deg, #DAAB8C 0%, #C79172 100%)';
  const themLine = dark ? 'rgba(244,236,223,0.15)' : 'rgba(120,84,52,0.15)';
  const youLine  = dark ? 'rgba(244,236,223,0.20)' : 'rgba(255,252,246,0.50)';
  // softened, warmer drop + gentle top trim highlight (the painted-edge sheen)
  const dropThem = dark ? '0 10px 22px rgba(0,0,0,0.34)' : '0 10px 22px rgba(120,84,52,0.12)';
  const dropYou  = dark ? '0 10px 22px rgba(0,0,0,0.34)' : '0 10px 22px rgba(120,84,52,0.13)';
  const trimThem = dark ? 'inset 0 2px 1px rgba(244,236,223,0.09)' : 'inset 0 2px 1px rgba(255,252,246,0.72)';
  const trimYou  = dark ? 'inset 0 2px 1px rgba(244,236,223,0.16)' : 'inset 0 2px 1px rgba(255,252,246,0.46)';
  const animate = active && !REDUCED;

  // soft completion haptic as YOUR reply lands (the exchange completing)
  React.useEffect(() => {
    if (!active) return;
    const buzz = () => { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(8); };
    const t = setTimeout(buzz, REDUCED ? 80 : 1500);
    return () => clearTimeout(t);
  }, [active, playKey]);

  // each bubble: opacity + small translate/scale settle, staggered for call-and-response
  const settle = (delay) => (animate
    ? { animation: `bubble-settle .8s cubic-bezier(.16,1,.3,1) ${delay} both` }
    : {});

  const softLine = (w, c) => (
    <div style={{ height: 7, width: w, borderRadius: 4, background: c }} />
  );

  // gradient stops (light crown → deeper base) + shadow flood, per voice
  // companion bubble deepened in light mode so it reads against the cream bg (#F4ECE0):
  // its old lightest stop (#F8EFE0) was lighter than the ground, so the top dissolved.
  const themStops = dark ? ['#3B3025', '#2C2319'] : ['#EFE0C6', '#E0CCA4'];
  const youStops  = dark ? ['#80584A', '#69463A'] : ['#DAAB8C', '#C79172'];
  const floodC    = dark ? '#000000' : '#785434';

  // Each bubble is ONE continuous SVG silhouette: the rounded body's outline pulls
  // out into a small, soft, tapering tail at one corner — same fill gradient, same
  // unified drop-shadow, same top trim highlight flowing onto the tail. Not a
  // separate nub. Companion tail ↙ (bottom-left), your tail ↘ (bottom-right).
  const Bubble = ({ id, w, h, left, top, rotate, stops, bodyPath, vbW, vbH, delay, children }) => (
    <div style={{ position: 'absolute', left, top, width: w, height: h, ...settle(delay) }}>
      <div style={{ width: '100%', height: '100%', position: 'relative', transform: `rotate(${rotate}deg)` }}>
        <svg width={vbW} height={vbH} viewBox={`0 0 ${vbW} ${vbH}`} fill="none" aria-hidden="true"
          style={{ position: 'absolute', left: -12, top: -12, overflow: 'visible', pointerEvents: 'none' }}>
          <defs>
            <linearGradient id={`bg-${id}`} x1="0" y1="0" x2="0.3" y2="1">
              <stop offset="0" stopColor={stops[0]} />
              <stop offset="1" stopColor={stops[1]} />
            </linearGradient>
            <filter id={`sh-${id}`} x="-40%" y="-30%" width="180%" height="190%">
              <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor={floodC}
                floodOpacity={dark ? 0.34 : 0.14} />
            </filter>
          </defs>
          <path d={bodyPath} fill={`url(#bg-${id})`} filter={`url(#sh-${id})`} />
        </svg>
        <div style={{ position: 'relative', height: '100%', padding: '0 24px',
          display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 }}>
          {children}
        </div>
      </div>
    </div>
  );

  return (
    <div key={playKey} style={{ position: 'relative', width: 320, height: 200 }}>
      {/* companion — upper-left, warm sand paper; tail dips ↙ from the bottom-left */}
      <Bubble id={`them-${playKey}`} w={152} h={80} left={28} top={38} rotate={-1.4}
        stops={themStops} vbW={176} vbH={132}
        bodyPath={'M 42,12 L 134,12 Q 164,12 164,42 L 164,62 Q 164,92 134,92 L 80,92 C 66,92 54,106 44,118 C 40,106 40,98 46,92 L 42,92 Q 12,92 12,62 L 12,42 Q 12,12 42,12 Z'}
        delay=".15s">
        {softLine(80, themLine)}
        {softLine(52, themLine)}
      </Bubble>
      {/* your reply — lower-right, soft clay; tail dips ↘ from the bottom-right */}
      <Bubble id={`you-${playKey}`} w={120} h={64} left={162} top={100} rotate={1.6}
        stops={youStops} vbW={144} vbH={120}
        bodyPath={'M 38,12 L 106,12 Q 132,12 132,38 L 132,50 Q 132,76 106,76 C 116,86 120,94 122,104 C 110,96 100,84 90,76 L 38,76 Q 12,76 12,50 L 12,38 Q 12,12 38,12 Z'}
        delay=".55s">
        {softLine(58, youLine)}
      </Bubble>
    </div>
  );
}

/* Slide 3 hero — "here whenever you need." ONE steady companion bubble (warm sand,
   the SAME register as slide 2's companion bubble) present through day & night: a small
   soft SUN flanks the upper-left, a warm CRESCENT MOON the upper-right. The bubble is the
   constant hero; the sun/moon are small, secondary context. NO radiating rays/arcs (not a
   wifi/signal motif), NO Library Wine (wine stays on the bar + Continue), NO cold blue —
   warm in both themes (it inverts naturally in dark). Motion: the bubble eases in + settles
   steady, then the sun + moon softly fade in flanking it (calmest slide; dead-still after,
   which the spec permits). Reduce-motion → all whole, already in place.
   [The bubble render mirrors slide 2's companion bubble; at the RN port both collapse into
   the shared <WarmBubble> component.] */
function PresenceArt({ T, playKey, active }) {
  const dark = T.mode === 'dark';
  const animate = active && !REDUCED;
  // bubble — companion / warm-sand tone, identical to slide 2's "them"
  const stops  = dark ? ['#3B3025', '#2C2319'] : ['#EFE0C6', '#E0CCA4']; // deepened for light-bg contrast (see slide 2)
  const lineC  = dark ? 'rgba(244,236,223,0.15)' : 'rgba(120,84,52,0.15)';
  const floodC = dark ? '#000000' : '#785434';
  // sun (muted gold/amber disc) + moon (warm taupe crescent) — warm in BOTH themes
  const sunGrad   = dark ? 'radial-gradient(120% 120% at 36% 30%, #DEA64C, #C2883A)'
                         : 'radial-gradient(120% 120% at 36% 30%, #EDC074, #D6A24E)';
  const sunShadow = dark ? '0 4px 12px rgba(0,0,0,0.42), inset 0 1.5px 1px rgba(255,244,214,0.28)'
                         : '0 5px 14px rgba(150,110,40,0.26), inset 0 1.5px 1px rgba(255,250,235,0.55)';
  const moonStops = dark ? ['#9A7560', '#7C5A47'] : ['#C99E80', '#AE7F62'];
  const starC     = dark ? '#E6C68C' : '#D6A24E';

  // soft completion haptic as the day/night cue settles
  React.useEffect(() => {
    if (!active) return;
    const buzz = () => { if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(8); };
    const t = setTimeout(buzz, REDUCED ? 80 : 1200);
    return () => clearTimeout(t);
  }, [active, playKey]);

  const softLine = (w) => <div style={{ height: 7, width: w, borderRadius: 4, background: lineC }} />;
  const bubbleSettle = animate ? { animation: 'bubble-settle .8s cubic-bezier(.16,1,.3,1) .15s both' } : {};
  const sunAnim  = animate ? { animation: 'aura-fadein .6s ease .6s both, aura-sink 9s ease-in-out 1.3s infinite' } : {};
  const moonAnim = animate ? { animation: 'aura-fadein .6s ease .72s both, aura-float 9s ease-in-out 1.3s infinite' } : {};

  return (
    <div key={playKey} style={{ position: 'relative', width: 320, height: 200 }}>
      {/* SUN — upper-left, soft muted-gold disc (no rays) */}
      <div style={{ position: 'absolute', left: 44, top: 50, width: 34, height: 34, borderRadius: '50%',
        background: sunGrad, boxShadow: sunShadow, ...sunAnim }} />
      {/* MOON — upper-right, warm taupe crescent (no rays) + a tiny star */}
      <div style={{ position: 'absolute', left: 246, top: 46, width: 34, height: 34, ...moonAnim }}>
        <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true" style={{ overflow: 'visible' }}>
          <defs>
            <mask id={`mm-${playKey}`}>
              <rect width="34" height="34" fill="black" />
              <circle cx="17" cy="17" r="15.5" fill="white" />
              <circle cx="23" cy="11.5" r="13" fill="black" />
            </mask>
            <linearGradient id={`mg-${playKey}`} x1="0" y1="0" x2="0.4" y2="1">
              <stop offset="0" stopColor={moonStops[0]} /><stop offset="1" stopColor={moonStops[1]} />
            </linearGradient>
            <filter id={`ms-${playKey}`} x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor={floodC} floodOpacity={dark ? 0.4 : 0.18} />
            </filter>
          </defs>
          <g filter={`url(#ms-${playKey})`}>
            <rect width="34" height="34" fill={`url(#mg-${playKey})`} mask={`url(#mm-${playKey})`} />
          </g>
        </svg>
        <div style={{ position: 'absolute', right: -3, top: 0, width: 4.5, height: 4.5, borderRadius: '50%', background: starC, opacity: 0.9 }} />
      </div>
      {/* BUBBLE — centered, the steady constant (companion sand tone, tail ↙ bottom-left) */}
      <div style={{ position: 'absolute', left: 84, top: 80, width: 152, height: 80, ...bubbleSettle }}>
        <div style={{ width: '100%', height: '100%', position: 'relative', transform: 'rotate(-1deg)' }}>
          <svg width="176" height="132" viewBox="0 0 176 132" fill="none" aria-hidden="true"
            style={{ position: 'absolute', left: -12, top: -12, overflow: 'visible', pointerEvents: 'none' }}>
            <defs>
              <linearGradient id={`pb-${playKey}`} x1="0" y1="0" x2="0.3" y2="1">
                <stop offset="0" stopColor={stops[0]} /><stop offset="1" stopColor={stops[1]} />
              </linearGradient>
              <filter id={`pbsh-${playKey}`} x="-40%" y="-30%" width="180%" height="190%">
                <feDropShadow dx="0" dy="8" stdDeviation="7" floodColor={floodC} floodOpacity={dark ? 0.34 : 0.14} />
              </filter>
            </defs>
            <path d={'M 42,12 L 134,12 Q 164,12 164,42 L 164,62 Q 164,92 134,92 L 80,92 C 66,92 54,106 44,118 C 40,106 40,98 46,92 L 42,92 Q 12,92 12,62 L 12,42 Q 12,12 42,12 Z'}
              fill={`url(#pb-${playKey})`} filter={`url(#pbsh-${playKey})`} />
          </svg>
          <div style={{ position: 'relative', height: '100%', padding: '0 24px',
            display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 }}>
            {softLine(82)}
            {softLine(54)}
          </div>
        </div>
      </div>
    </div>
  );
}

const SLIDES = [
  { line: 'Meet a companion who remembers you.', sub: 'Every conversation picks up where you left off, nothing to repeat.' },
  { line: 'A calm, private place to talk.',       sub: 'No judgment, no performance. What you share stays yours.' },
  { line: 'Here whenever you need.',              sub: 'Around day or night, and always honest that you’re talking to an AI.' },
];

function Carousel({ index, setIndex, onDone }) {
  const T = useT();
  const [drag, setDrag] = useStateC(0);          // live px offset while dragging
  const [dragging, setDragging] = useStateC(false);
  const [land, setLand] = useStateC(0);          // bumps each time a slide lands → replays its hero motion
  React.useEffect(() => { setLand((n) => n + 1); }, [index]);
  const start = useRefC(null);
  const W = 402 - 48;                            // slide width (frame minus inset)

  const go = (i) => {
    if (i < 0) return;
    if (i > 2) { onDone(); return; }
    setIndex(i);
  };

  const onDown = (e) => { if (REDUCED) return; start.current = e.clientX; setDragging(true); };
  const onMove = (e) => {
    if (start.current == null) return;
    let d = e.clientX - start.current;
    if ((index === 0 && d > 0) || (index === 2 && d < 0)) d *= 0.3;  // edge resistance
    setDrag(d);
  };
  const onUp = () => {
    if (start.current == null) return;
    const d = drag; start.current = null; setDragging(false); setDrag(0);
    if (d < -56) go(index + 1);
    else if (d > 56) go(index - 1);
  };

  const seg = (i) => (
    <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, overflow: 'hidden', background: T.border }}>
      <div style={{ height: '100%', borderRadius: 2, background: T.accent,
        width: i <= index ? '100%' : '0%', transition: 'width .35s ease' }} />
    </div>
  );

  const slideInner = (s, i) => {
    const active = i === index;
    const fade = (delay) => (active && !REDUCED
      ? { animation: `aura-rise-sm .5s cubic-bezier(.2,.7,.2,1) ${delay} both` } : {});
    return (
    <div key={active ? `a${i}-${land}` : `s${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', height: '100%', padding: '0 4px' }}>
      {/* Fixed-height illustration zone (= tallest art) so the headline baseline stays put
          across slides instead of jumping when a shorter illustration is centered. */}
      <div style={{ height: 200, marginBottom: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {i === 0
          ? <ThreadArt T={T} active={index === 0} playKey={land} />
          : i === 1
          ? <ChatArt T={T} active={index === 1} playKey={land} />
          : <PresenceArt T={T} active={index === 2} playKey={land} />}
      </div>
      <h1 style={{ fontFamily: FF_DISPLAY, fontWeight: 600, fontSize: 30, lineHeight: 1.12,
        letterSpacing: '-0.015em', color: T.textPrimary, margin: '0 0 14px', maxWidth: '15ch', textWrap: 'balance',
        ...fade('.02s') }}>
        {s.line}
      </h1>
      <p style={{ fontFamily: FF_BODY, fontWeight: 400, fontSize: 16, lineHeight: 1.55,
        color: T.textSecondary, margin: 0, maxWidth: '26ch', textWrap: 'pretty', ...fade('.12s') }}>{s.sub}</p>
    </div>
    );
  };

  return (
    <div style={{ minHeight: '100%', background: T.bg, display: 'flex', flexDirection: 'column',
      padding: `${SAFE_TOP + 4}px 24px 28px` }}>

      {/* segmented progress bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>{[0, 1, 2].map(seg)}</div>

      {/* slide canvas */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden', touchAction: 'pan-y' }}
        onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onPointerLeave={() => { if (dragging) onUp(); }}>
        {REDUCED ? (
          <div key={index} className="aura-fade" style={{ position: 'absolute', inset: 0 }}>{slideInner(SLIDES[index], index)}</div>
        ) : (
          <div style={{ display: 'flex', height: '100%', width: `${3 * W}px`,
            transform: `translateX(${-index * W + drag}px)`,
            transition: dragging ? 'none' : 'transform .42s cubic-bezier(.22,.8,.32,1)' }}>
            {SLIDES.map((s, i) => (
              <div key={i} style={{ width: `${W}px`, height: '100%', flex: 'none' }}>{slideInner(s, i)}</div>
            ))}
          </div>
        )}
      </div>

      {/* bottom row — Skip (left) · Continue (right, primary). Accent stays on the bar only. */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
        <button type="button" onClick={onDone} className="aura-press"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '12px 4px',
            fontFamily: FF_BODY, fontWeight: 600, fontSize: 15, color: T.textSecondary,
            WebkitTapHighlightColor: 'transparent' }}>Skip</button>
        <button type="button" onClick={() => go(index + 1)} className="aura-press"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '12px 4px',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            fontFamily: FF_BODY, fontWeight: 700, fontSize: 16, color: T.textPrimary,
            WebkitTapHighlightColor: 'transparent' }}>
          {index === 2 ? 'Continue' : 'Continue'}
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h9M9 4.5L12.5 8 9 11.5" stroke={T.textPrimary} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ── Age gate · the first gate after auth ───────────────────────────────────
   One question, one action. A native-feeling DOB wheel (structural hairline
   field — never a soft-shadow card), an honest 18+ line, and a single wine
   Continue. under18 = a calm, non-shaming, fail-closed dead-end (no path
   forward). Inline validation eases Continue disabled→enabled; the dead-end
   arrives as a soft dissolve, never an alarm.
   ─────────────────────────────────────────────────────────────────────────── */
const { useState: useStateG, useEffect: useEffectG, useRef: useRefG } = React;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const YEARS = Array.from({ length: 2026 - 1924 + 1 }, (_, i) => 2026 - i); // 2026…1924 descending
const TODAY = { y: 2026, m: 5, d: 23 }; // June 23, 2026 (system "now")

function daysInMonth(year, monthIdx) { return new Date(year, monthIdx + 1, 0).getDate(); }
function ageFrom(y, m, d) {
  let a = TODAY.y - y;
  if (TODAY.m < m || (TODAY.m === m && TODAY.d < d)) a -= 1;
  return a;
}

// One scroll-snap wheel column (template mechanics — 38px rows, 76px spacers,
// 5 visible, center band reads selection). Always displayed; Aura-toned.
function Wheel({ items, index, onChange, T }) {
  const ref = useRefG(null);
  const settle = useRefG(null);
  const ITEM = 38;
  useEffectG(() => {
    const el = ref.current; if (!el) return;
    if (Math.abs(el.scrollTop - index * ITEM) > 1) el.scrollTop = index * ITEM;
  }, [index, items.length]);

  const onScroll = () => {
    const el = ref.current; if (!el) return;
    const i = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ITEM)));
    if (i !== index) onChange(i);
    clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      const snap = Math.round(el.scrollTop / ITEM) * ITEM;
      if (Math.abs(el.scrollTop - snap) > 0.5) el.scrollTo({ top: snap, behavior: REDUCED ? 'auto' : 'smooth' });
    }, 110);
  };

  return (
    <div ref={ref} onScroll={onScroll}
      style={{ flex: 1, height: 190, overflowY: 'auto', scrollSnapType: 'y mandatory',
        textAlign: 'center', scrollbarWidth: 'none', msOverflowStyle: 'none',
        WebkitOverflowScrolling: 'touch' }}>
      <div style={{ height: 76 }} />
      {items.map((it, i) => (
        <div key={i} onClick={() => ref.current?.scrollTo({ top: i * ITEM, behavior: REDUCED ? 'auto' : 'smooth' })}
          style={{ height: 38, lineHeight: '38px', scrollSnapAlign: 'center', cursor: 'pointer',
            fontFamily: FF_BODY, fontSize: 18, fontWeight: 600, fontVariantNumeric: 'tabular-nums',
            letterSpacing: '0.01em', color: i === index ? T.textPrimary : T.textTertiary,
            opacity: i === index ? 1 : 0.5, transition: 'color .15s ease, opacity .15s ease',
            WebkitTapHighlightColor: 'transparent' }}>{it}</div>
      ))}
      <div style={{ height: 76 }} />
    </div>
  );
}

function DOBPicker({ value, onChange, T }) {
  const { y, m, d } = value;
  const yi = YEARS.indexOf(y);
  const dim = daysInMonth(y, m);
  const days = Array.from({ length: dim }, (_, i) => i + 1);

  const set = (patch) => {
    const next = { y, m, d, ...patch };
    const maxD = daysInMonth(next.y, next.m);
    if (next.d > maxD) next.d = maxD;
    onChange(next);
  };

  return (
    <div style={{ display: 'flex', gap: 8, position: 'relative', height: 190 }}>
      {/* center selection band — tight radius, hairline edge + faint wine wash */}
      <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, top: 76, height: 38,
        borderRadius: 10, background: 'rgba(143,65,80,0.06)', border: `1px solid ${T.border}`,
        pointerEvents: 'none' }} />
      <Wheel T={T} items={MONTHS} index={m} onChange={(i) => set({ m: i })} />
      <Wheel T={T} items={days} index={d - 1} onChange={(i) => set({ d: i + 1 })} />
      <Wheel T={T} items={YEARS} index={yi < 0 ? 0 : yi} onChange={(i) => set({ y: YEARS[i] })} />
    </div>
  );
}

function AgeGate({ failed, onFail, onDone }) {
  const T = useT();
  const [dob, setDob] = useStateG({ y: 2004, m: 5, d: 15 }); // valid 18+ default
  const age = ageFrom(dob.y, dob.m, dob.d);
  const ok = age >= 18;

  // ── fail-closed dead-end (dev-toggled OR resolved-under-18 on submit) ──────
  if (failed) {
    return (
      <div style={{ minHeight: '100%', background: T.bg, display: 'flex', flexDirection: 'column',
        padding: `${SAFE_TOP}px 28px 40px` }}>
        <div className={REDUCED ? undefined : 'aura-fade'}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', textAlign: 'center' }}>
          {/* a quiet resting mark — calm, not a lock or alarm */}
          <div style={{ width: 14, height: 14, borderRadius: '50%', background: T.textTertiary,
            opacity: 0.5, marginBottom: 30 }} />
          <h1 style={{ fontFamily: FF_DISPLAY, fontWeight: 600, fontSize: 30, lineHeight: 1.16,
            letterSpacing: '-0.015em', color: T.textPrimary, margin: '0 0 16px', maxWidth: '15ch',
            textWrap: 'balance' }}>
            You need to be 18 to use Aura.
          </h1>
          <p style={{ fontFamily: FF_BODY, fontWeight: 400, fontSize: 16.5, lineHeight: 1.6,
            color: T.textSecondary, margin: 0, maxWidth: '24ch', textWrap: 'pretty' }}>
            Thanks for stopping by.
          </p>
        </div>
      </div>
    );
  }

  // ── default · the single-question gate ────────────────────────────────────
  return (
    <div style={{ minHeight: '100%', background: T.bg, display: 'flex', flexDirection: 'column',
      padding: `${SAFE_TOP}px 24px 28px` }}>

      {/* question + honest line */}
      <div className="aura-enter" style={{ animationDelay: '0.04s', marginBottom: 28 }}>
        <h1 style={{ fontFamily: FF_DISPLAY, fontWeight: 600, fontSize: 32, lineHeight: 1.1,
          letterSpacing: '-0.018em', color: T.textPrimary, margin: '0 0 12px' }}>
          How old are you?
        </h1>
        <p style={{ fontFamily: FF_BODY, fontWeight: 400, fontSize: 15.5, lineHeight: 1.55,
          color: T.textSecondary, margin: 0, maxWidth: '32ch', textWrap: 'pretty' }}>
          Aura is for adults. You must be 18 or older to continue.
        </p>
      </div>

      {/* DOB picker — the sole focal control, bottom-weighted layout */}
      <div className="aura-enter" style={{ animationDelay: '0.12s', flex: 1, display: 'flex',
        flexDirection: 'column', justifyContent: 'center', minHeight: 0 }}>
        <DOBPicker value={dob} onChange={setDob} T={T} />
      </div>

      {/* single primary — wine when valid, eases disabled→enabled as DOB resolves */}
      <div style={{ marginTop: 24 }}>
        <button type="button" onClick={() => (ok ? onDone() : onFail())} disabled={!ok}
          className="aura-press"
          style={{ width: '100%', border: 'none', borderRadius: RADIUS_SOFT, padding: '16px 20px',
            background: T.accent, color: T.onAccent, opacity: ok ? 1 : 0.42,
            cursor: ok ? 'pointer' : 'default', fontFamily: FF_BODY, fontWeight: 600, fontSize: 17,
            minHeight: 54, boxShadow: ok ? T.e1 : 'none',
            transition: 'opacity .4s cubic-bezier(.2,.7,.2,1), box-shadow .4s',
            WebkitTapHighlightColor: 'transparent' }}>
          Continue
        </button>
      </div>
    </div>
  );
}

const RADIUS_SOFT = (window.AURA.RADIUS && window.AURA.RADIUS.soft) || 12;

/* ── AI disclosure + Terms · the honesty moment ─────────────────────────────
   Warm, human, not a legal wall. Three intimate raised cards (tonal fill +
   soft shadow, NO outline) say it plainly; the crisis card uses the calm
   grounding-green safety token, never alarm-red. A genuinely-disabled
   Continue gates on an un-pre-checked consent box. No dark patterns.
   ─────────────────────────────────────────────────────────────────────────── */
const DISCLOSURES = [
  {
    key: 'ai',
    head: 'Aurora is an AI',
    body: 'A supportive companion, not a real person, and not a substitute for professional care.',
    glyph: (c) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
        <circle cx="12" cy="12" r="3.4" fill={c} stroke="none" />
      </svg>
    ),
  },
  {
    key: 'crisis',
    head: 'If you’re ever in crisis',
    crisis: true,
    glyph: (c) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
      </svg>
    ),
  },
  {
    key: 'privacy',
    head: 'Your conversations are private',
    body: 'What you share stays yours. Export or delete it any time.',
    glyph: (c) => (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4.5" y="10.5" width="15" height="10" rx="2.5" />
        <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
        <circle cx="12" cy="15.2" r="1.3" fill={c} stroke="none" />
      </svg>
    ),
  },
];

function DisclosureCard({ item, T }) {
  // Doctrine §6: no accent-tinted icon tiles. The AI card uses the same calm neutral
  // treatment as privacy; only the crisis card keeps a (semantic) grounding-green tile.
  // Wine accent is reserved for genuine emphasis (the primary CTA), not card/icon chrome.
  const tint = item.crisis ? T.crisisBg : T.raised;
  const chipBg = item.crisis ? T.crisis : T.bg;
  const chipGlyph = item.crisis ? T.crisisBg : T.textSecondary;
  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', background: tint,
      borderRadius: RADIUS_CARD, padding: '16px 16px', boxShadow: T.e1 }}>
      <div style={{ flex: 'none', width: 40, height: 40, borderRadius: 12, background: chipBg,
        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {item.glyph(chipGlyph)}
      </div>
      <div style={{ minWidth: 0, paddingTop: 1 }}>
        <div style={{ fontFamily: FF_BODY, fontWeight: 600, fontSize: 15.5, lineHeight: 1.3,
          color: item.crisis ? T.crisisText : T.textPrimary, marginBottom: 4 }}>{item.head}</div>
        {item.crisis ? (
          <div style={{ fontFamily: FF_BODY, fontWeight: 400, fontSize: 14, lineHeight: 1.55,
            color: T.crisisText2, textWrap: 'pretty' }}>
            Aura shares real resources like <span style={{ fontWeight: 700, color: T.crisisText }}>988</span>, and you can always reach them.
          </div>
        ) : (
          <div style={{ fontFamily: FF_BODY, fontWeight: 400, fontSize: 14, lineHeight: 1.55,
            color: T.textSecondary, textWrap: 'pretty' }}>{item.body}</div>
        )}
      </div>
    </div>
  );
}

function Disclosure({ onContinue }) {
  const T = useT();
  const [agree, setAgree] = useStateG(false);
  const linkBtn = (label) => (
    <button type="button" style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer',
      fontFamily: FF_BODY, fontWeight: 600, fontSize: 13.5, color: T.accent,
      textDecoration: 'underline', textUnderlineOffset: 2, WebkitTapHighlightColor: 'transparent' }}>{label}</button>
  );
  return (
    <div style={{ minHeight: '100%', background: T.bg, display: 'flex', flexDirection: 'column',
      padding: `${SAFE_TOP}px 24px 28px` }}>

      <h1 className="aura-enter" style={{ animationDelay: '0.04s', fontFamily: FF_DISPLAY, fontWeight: 600,
        fontSize: 32, lineHeight: 1.1, letterSpacing: '-0.018em', color: T.textPrimary, margin: '0 0 24px' }}>
        A few things to know.
      </h1>

      <div className={REDUCED ? undefined : 'aura-stagger'}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {DISCLOSURES.map((item) => <DisclosureCard key={item.key} item={item} T={T} />)}
      </div>

      {/* consent — not pre-checked; genuinely gates Continue */}
      <label className="aura-enter" style={{ animationDelay: '0.3s', display: 'flex', gap: 12,
        alignItems: 'flex-start', cursor: 'pointer', margin: '22px 0 16px' }}>
        <button type="button" role="checkbox" aria-checked={agree} onClick={() => setAgree(!agree)}
          style={{ width: 22, height: 22, flex: 'none', marginTop: 1, borderRadius: 6, cursor: 'pointer',
            border: `1.5px solid ${agree ? T.accent : T.textSecondary}`, background: agree ? T.accent : T.sheet,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0,
            WebkitTapHighlightColor: 'transparent', transition: 'all .15s' }}>
          {agree && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.onAccent} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6" /></svg>}
        </button>
        <span style={{ fontFamily: FF_BODY, fontSize: 14, lineHeight: 1.5, color: T.textSecondary }}
          onClick={(e) => { if (e.target.tagName === 'BUTTON') e.preventDefault(); }}>
          I understand my companion is an AI, not a real person or a substitute for professional care.
        </span>
      </label>

      <button type="button" onClick={() => agree && onContinue()} disabled={!agree} className="aura-press"
        style={{ width: '100%', border: 'none', borderRadius: RADIUS_SOFT, padding: '16px 20px',
          background: T.accent, color: T.onAccent, opacity: agree ? 1 : 0.42,
          cursor: agree ? 'pointer' : 'default', fontFamily: FF_BODY, fontWeight: 600, fontSize: 17,
          minHeight: 54, boxShadow: agree ? T.e1 : 'none',
          transition: 'opacity .35s cubic-bezier(.2,.7,.2,1), box-shadow .35s',
          WebkitTapHighlightColor: 'transparent' }}>
        Continue
      </button>
    </div>
  );
}

const RADIUS_CARD = (window.AURA.RADIUS && window.AURA.RADIUS.card) || 16;

/* ── Profile setup · "just your name" ───────────────────────────────────────
   Light, welcoming, short. Two crisp hairline fields (first + last), tight
   radius, labels above. Wine focus ring is the one accent. Continue gates on
   a non-empty first name; inline error says what to do. No demographics, no
   avatar hero, no card around utility inputs. Utility-still motion.
   ─────────────────────────────────────────────────────────────────────────── */
function ProfileField({ T, label, value, onChange, placeholder, autoFocus, error, onBlur }) {
  const [focus, setFocus] = useStateG(false);
  const ring = error ? T.error : (focus ? T.accent : T.border);
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontFamily: FF_BODY, fontWeight: 600, fontSize: 12.5,
        color: T.textSecondary, marginBottom: 7 }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', background: T.sheet,
        border: `1px solid ${ring}`, borderRadius: RADIUS_EDIT2,
        boxShadow: focus && !error ? `0 0 0 3px ${T.accentTint}` : 'none',
        transition: 'border-color .15s, box-shadow .15s' }}>
        <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
          autoFocus={autoFocus} autoCapitalize="words"
          onFocus={() => setFocus(true)} onBlur={() => { setFocus(false); onBlur && onBlur(); }}
          style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent',
            padding: '14px 14px', fontFamily: FF_BODY, fontWeight: 400, fontSize: 16, color: T.textPrimary,
            WebkitTapHighlightColor: 'transparent' }} />
      </div>
      {error && (
        <div style={{ fontFamily: FF_BODY, fontWeight: 500, fontSize: 12.5, color: T.error,
          marginTop: 7 }}>{error}</div>
      )}
    </label>
  );
}

function Profile({ onContinue }) {
  const T = useT();
  const [first, setFirst] = useStateG('');
  const [last, setLast] = useStateG('');
  const [touched, setTouched] = useStateG(false);
  const [submitted, setSubmitted] = useStateG(false);
  const firstEmpty = first.trim().length === 0;
  const showErr = firstEmpty && (touched || submitted);
  const ok = !firstEmpty;

  const submit = () => { if (!ok) { setSubmitted(true); return; } onContinue(); };

  return (
    <div style={{ minHeight: '100%', background: T.bg, display: 'flex', flexDirection: 'column',
      padding: `${SAFE_TOP}px 24px 28px` }}>

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: FF_DISPLAY, fontWeight: 600, fontSize: 31, lineHeight: 1.12,
          letterSpacing: '-0.018em', color: T.textPrimary, margin: '0 0 12px', textWrap: 'balance' }}>
          What should your companion call you?
        </h1>
        <p style={{ fontFamily: FF_BODY, fontWeight: 400, fontSize: 15.5, lineHeight: 1.55,
          color: T.textSecondary, margin: 0, maxWidth: '30ch', textWrap: 'pretty' }}>
          First name is what your companion will use.
        </p>
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <ProfileField T={T} label="First name" value={first} onChange={setFirst}
          placeholder="Your first name" autoFocus error={showErr ? 'First name can’t be empty' : null}
          onBlur={() => setTouched(true)} />
        <ProfileField T={T} label="Last name" value={last} onChange={setLast}
          placeholder="Optional" />
      </div>

      <button type="button" onClick={submit} disabled={!ok} className="aura-press"
        style={{ width: '100%', border: 'none', borderRadius: RADIUS_SOFT, padding: '16px 20px',
          marginTop: 24, background: T.accent, color: T.onAccent, opacity: ok ? 1 : 0.42,
          cursor: ok ? 'pointer' : 'default', fontFamily: FF_BODY, fontWeight: 600, fontSize: 17,
          minHeight: 54, boxShadow: ok ? T.e1 : 'none',
          transition: 'opacity .35s cubic-bezier(.2,.7,.2,1), box-shadow .35s',
          WebkitTapHighlightColor: 'transparent' }}>
        Continue
      </button>
    </div>
  );
}

const RADIUS_EDIT2 = (window.AURA.RADIUS && window.AURA.RADIUS.edit) || 8;

/* ── Choose your companion · CHOOSE, not build ──────────────────────────────
   Three warm stacked cards (Aurora · Orion · Lyra). Personality lives in the
   voice line + avatar register, never a per-persona color — all on the same
   warm system. Aurora softly pre-highlighted (wine ring + accent tint + lift);
   unselected cards quietly recede. CTA names the choice. No builder, no upload.
   ─────────────────────────────────────────────────────────────────────────── */
// Curated character portraits (background removed) on a tonal disc.
function PersonaAvatar({ which, T, size = 52 }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden',
      background: T.avatar, flex: 'none' }}>
      <img src={`brand/avatars/${which}.png`} alt="" draggable="false"
        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 8%',
          display: 'block' }} />
    </div>
  );
}

const PERSONAS = [
  { key: 'aurora', name: 'Aurora', line: 'Warm and gentle, a soft place to land.' },
  { key: 'orion',  name: 'Orion',  line: 'Steady and grounded, a calm anchor.' },
  { key: 'lyra',   name: 'Lyra',   line: 'Bright and playful, lifts the mood.' },
];

function Persona({ onContinue }) {
  const T = useT();
  const [sel, setSel] = useStateG('aurora');
  const chosen = PERSONAS.find((p) => p.key === sel) || PERSONAS[0];

  return (
    <div style={{ minHeight: '100%', background: T.bg, display: 'flex', flexDirection: 'column',
      padding: `${SAFE_TOP}px 24px 28px` }}>

      <div style={{ marginBottom: 22 }}>
        <h1 style={{ fontFamily: FF_DISPLAY, fontWeight: 600, fontSize: 30, lineHeight: 1.12,
          letterSpacing: '-0.018em', color: T.textPrimary, margin: '0 0 10px', textWrap: 'balance' }}>
          Who would you like to talk with?
        </h1>
        <p style={{ fontFamily: FF_BODY, fontWeight: 400, fontSize: 15.5, lineHeight: 1.5,
          color: T.textSecondary, margin: 0 }}>
          You can always meet the others later.
        </p>
      </div>

      <div className={REDUCED ? undefined : 'aura-stagger'}
        style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {PERSONAS.map((p) => {
          const on = p.key === sel;
          return (
            <button key={p.key} type="button" onClick={() => setSel(p.key)} className="aura-press"
              style={{ display: 'flex', alignItems: 'center', gap: 14, textAlign: 'left', width: '100%',
                cursor: 'pointer', background: on ? T.accentTint : T.raised, border: 'none',
                borderRadius: RADIUS_CARD, padding: '15px 16px',
                boxShadow: on ? T.e2 : T.e1, // §2: intimate cards lift with soft shadow, no outline; selection reads via tonal fill + check
                opacity: on ? 1 : 0.78, filter: on ? 'none' : 'saturate(0.85)',
                transform: REDUCED ? 'none' : (on ? 'translateY(-1px)' : 'none'),
                transition: 'background .25s, box-shadow .3s, opacity .25s, filter .25s, transform .3s',
                WebkitTapHighlightColor: 'transparent' }}>
              <div style={{ flex: 'none' }}><PersonaAvatar which={p.key} T={T} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: FF_DISPLAY, fontWeight: 600, fontSize: 19, lineHeight: 1.2,
                  color: T.textPrimary, marginBottom: 3 }}>{p.name}</div>
                <div style={{ fontFamily: FF_BODY, fontWeight: 400, fontSize: 13.5, lineHeight: 1.45,
                  color: T.textSecondary, textWrap: 'pretty' }}>{p.line}</div>
              </div>
              {/* selection check — wine, only on the chosen one */}
              <div style={{ flex: 'none', width: 22, height: 22, borderRadius: '50%',
                border: on ? 'none' : `1.5px solid ${T.border}`, background: on ? T.accent : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s' }}>
                {on && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.onAccent} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12l5 5L20 6" /></svg>}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ textAlign: 'center', fontFamily: FF_BODY, fontWeight: 500, fontSize: 12.5,
        color: T.textTertiary, margin: '18px 0 14px' }}>
        Personalities can be tuned with Premium.
      </div>

      <button type="button" onClick={onContinue} className="aura-press"
        style={{ width: '100%', border: 'none', borderRadius: RADIUS_SOFT, padding: '16px 20px',
          background: T.accent, color: T.onAccent, cursor: 'pointer',
          fontFamily: FF_BODY, fontWeight: 600, fontSize: 16.5, minHeight: 54, boxShadow: T.e1,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          WebkitTapHighlightColor: 'transparent' }}>
        <span key={chosen.name} className={REDUCED ? undefined : 'aura-fade'}>Start chatting with {chosen.name}</span>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M3 8h9M9 4.5L12.5 8 9 11.5" stroke={T.onAccent} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
    </div>
  );
}

/* ── Conversation · the onboarding payoff (and the reusable chat kit) ────────
   Lands in real chat, not a dashboard. Builds the components the Chat one-off
   reuses: header (avatar + name + honest "AI companion" marker), warm two-
   sided bubbles, a calm typing reveal, and the structural input dock.
   ─────────────────────────────────────────────────────────────────────────── */
const GREETING = 'Hi Maya, I’m really glad you’re here. There’s no script and no rush. What’s on your mind today?';

function BackChevron({ T, onClick, href, label = 'Back' }) {
  const [press, setPress] = React.useState(false);
  const icon = (
    <svg width="24" height="24" viewBox="0 0 256 256" fill={T.textPrimary} aria-hidden="true"><path d="M165.66,202.34a8,8,0,0,1-11.32,11.32l-80-80a8,8,0,0,1,0-11.32l80-80a8,8,0,0,1,11.32,11.32L91.31,128Z"></path></svg>
  );
  const common = {
    'aria-label': label,
    onPointerDown: () => { setPress(true); if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(8); },
    onPointerUp: () => setPress(false),
    onPointerLeave: () => setPress(false),
    style: { width: 44, height: 44, marginLeft: -10, flex: 'none', display: 'grid', placeItems: 'center',
      background: 'transparent', border: 'none', padding: 0, cursor: 'pointer', textDecoration: 'none',
      transform: press ? 'scale(0.9)' : 'scale(1)', transition: 'transform .12s', WebkitTapHighlightColor: 'transparent' },
  };
  return href
    ? <a href={href} {...common}>{icon}</a>
    : <button type="button" onClick={onClick} {...common}>{icon}</button>;
}

/* keyframes for the chat kit (one-time inject) — mirrors the OneOff chat. */
if (typeof document !== 'undefined' && !document.getElementById('aura-chatkit-anim')) {
  const s = document.createElement('style');
  s.id = 'aura-chatkit-anim';
  s.textContent = `
    @keyframes auraRise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
    @keyframes auraFade{from{opacity:0}to{opacity:1}}
    @keyframes auraDot{0%,60%,100%{transform:translateY(0);opacity:.45}30%{transform:translateY(-4px);opacity:1}}
    @media (prefers-reduced-motion: reduce){
      [style*="auraRise"]{animation:auraFade .25s ease both !important}
    }`;
  document.head.appendChild(s);
}

/* ── header — back · avatar (header only) · name + honest "AI companion" ───── */
function ChatHeader({ T, name = 'Aurora' }) {
  return (
    <div style={{ flex: 'none', padding: '54px 12px 12px', background: T.bg, borderBottom: `1px solid ${T.divider}`,
      boxShadow: T.e1, display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 30 }}>
      <BackChevron T={T} />
      <div style={{ borderRadius: '50%', boxShadow: T.e1 }}>
        <PersonaAvatar which="aurora" T={T} size={38} />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <span style={{ fontFamily: FF_DISPLAY, fontWeight: 600, fontSize: 19, lineHeight: 1.1, color: T.textPrimary,
          letterSpacing: '-0.01em' }}>{name}</span>
        <span style={{ fontFamily: FF_BODY, fontWeight: 500, fontSize: 11.5, lineHeight: 1, color: T.textTertiary,
          letterSpacing: '0.01em' }}>AI companion</span>
      </div>
      <button type="button" aria-label="Conversation options"
        style={{ width: 38, height: 38, flex: 'none', borderRadius: '50%', display: 'grid', placeItems: 'center',
          background: 'transparent', border: 'none', color: T.textSecondary, cursor: 'pointer',
          WebkitTapHighlightColor: 'transparent' }}>
        <svg width="22" height="6" viewBox="0 0 22 6"><circle cx="3" cy="3" r="2.5" fill="currentColor" /><circle cx="11" cy="3" r="2.5" fill="currentColor" /><circle cx="19" cy="3" r="2.5" fill="currentColor" /></svg>
      </button>
    </div>
  );
}

/* ── one-time AI disclosure banner (pinned above thread) ───────────────────── */
function DisclosureBanner({ T, onDismiss }) {
  return (
    <div role="note" style={{ display: 'flex', alignItems: 'flex-start', gap: 10, margin: '4px 16px 14px',
      padding: '11px 13px', background: T.raised, borderRadius: RADIUS_CARD, border: `1px solid ${T.border}` }}>
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={T.textTertiary} strokeWidth="1.8" style={{ flex: 'none', marginTop: 1 }}>
        <circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" strokeLinecap="round" /></svg>
      <span style={{ flex: 1, fontFamily: FF_BODY, fontSize: 12.5, lineHeight: 1.46, color: T.textSecondary, textWrap: 'pretty' }}>
        Aurora is an AI companion. She’s here for support, not a substitute for professional care.</span>
      <button type="button" aria-label="Dismiss" onClick={onDismiss}
        style={{ flex: 'none', width: 22, height: 22, marginTop: -1, borderRadius: '50%', display: 'grid', placeItems: 'center',
          background: 'transparent', border: 'none', color: T.textTertiary, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
      </button>
    </div>
  );
}

/* ── bubble · intimate surface, soft, no outline ───────────────────────────── */
function Bubble({ T, role, children, gap = 18, enter = true }) {
  const me = role === 'me';
  return (
    <div style={{ display: 'flex', justifyContent: me ? 'flex-end' : 'flex-start', marginTop: gap,
      animation: enter && !REDUCED ? 'auraRise .42s cubic-bezier(.22,.8,.32,1) both' : 'none' }}>
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
  const [shown, setShown] = useStateG('');
  const [thinking, setThinking] = useStateG(true);
  useEffectG(() => {
    let cancelled = false;
    if (REDUCED) { setThinking(false); setShown(full); onDone && onDone(); return; }
    const groups = full.match(/[^ ]+ ?/g) || [full];      // word/clause groups
    const chunks = [];
    for (let i = 0; i < groups.length; i += 2) chunks.push(groups.slice(i, i + 2).join(''));
    const t0 = setTimeout(() => {                          // a beat of "thinking" first
      if (cancelled) return;
      setThinking(false);
      let i = 0, acc = '';
      const tick = () => {
        if (cancelled) return;
        acc += chunks[i]; setShown(acc); i++;
        if (i < chunks.length) {
          const ease = 1 + (i / chunks.length) * 1.4;      // decelerate so it lands
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
          {[0, 1, 2].map((i) => (
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
  return (
    <div role="group" aria-label="Crisis support resources" style={{ marginTop: 16, padding: '16px 16px 15px',
      background: T.crisisBg, borderRadius: RADIUS_CARD, animation: REDUCED ? 'none' : 'auraFade 1.1s ease both' }}>
      <p style={{ margin: '0 0 13px', fontFamily: FF_BODY, fontSize: 14.5, lineHeight: 1.5, color: T.crisisText, textWrap: 'pretty' }}>
        If you’re thinking about harming yourself, please reach out. People want to help.</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontFamily: FF_BODY, fontSize: 13.5, lineHeight: 1.5, color: T.crisisText2 }}>
          <strong style={{ color: T.crisisText, fontWeight: 600 }}>Call or text 988</strong>, the Suicide &amp; Crisis Lifeline (US, 24/7)</div>
        <div style={{ fontFamily: FF_BODY, fontSize: 13.5, lineHeight: 1.5, color: T.crisisText2 }}>
          <strong style={{ color: T.crisisText, fontWeight: 600 }}>Text HOME to 741741</strong>, the Crisis Text Line</div>
      </div>
      <p style={{ margin: '12px 0 0', fontFamily: FF_BODY, fontSize: 12.5, lineHeight: 1.5, color: T.crisisText2 }}>
        You can keep talking with Aurora too. She’s here.</p>
    </div>
  );
}

/* ── limit · gentle inline end-of-thread care card ─────────────────────────── */
function LimitCard({ T }) {
  return (
    <div style={{ marginTop: 18, padding: '18px 18px 16px', background: T.raised, borderRadius: RADIUS_CARD,
      border: `1px solid ${T.border}`, textAlign: 'center', animation: REDUCED ? 'none' : 'auraFade .9s ease both' }}>
      <div style={{ fontFamily: FF_DISPLAY, fontWeight: 600, fontSize: 18, lineHeight: 1.2, color: T.textPrimary, marginBottom: 7 }}>
        That’s it for today</div>
      <p style={{ margin: 0, fontFamily: FF_BODY, fontSize: 14, lineHeight: 1.5, color: T.textSecondary, textWrap: 'pretty' }}>
        You’ve reached today’s free messages. Aurora will be here tomorrow, or go unlimited with Premium.</p>
    </div>
  );
}

/* ── input dock · structural surface (warm hairline, send when non-empty) ──── */
function InputDock({ T, value, onChange, onSend, disabled, onFocus, onBlur }) {
  const [focused, setFocused] = useStateG(false);
  const hasText = value.trim().length > 0;
  return (
    <div style={{ flex: 'none', background: T.bg, padding: focused ? '10px 12px 10px' : '10px 12px 40px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 8, padding: '8px 8px 8px 14px',
          background: disabled ? T.raised : T.sheet, border: `1px solid ${T.border}`, borderRadius: 20,
          opacity: disabled ? 0.6 : 1 }}>
          <textarea value={value} disabled={disabled} rows={1} aria-label="Message Aurora" placeholder="Message Aurora"
            onFocus={() => { setFocused(true); onFocus && onFocus(); }} onBlur={() => { setFocused(false); onBlur && onBlur(); }}
            onChange={(e) => onChange(e.target.value)}
            onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px'; }}
            style={{ flex: 1, minWidth: 0, resize: 'none', border: 'none', outline: 'none', background: 'transparent', maxHeight: 96,
              fontFamily: FF_BODY, fontSize: 15.5, lineHeight: 1.45, color: T.textPrimary, padding: '4px 0', WebkitTapHighlightColor: 'transparent' }} />
        </div>
        <button type="button" aria-label="Send" disabled={disabled || !hasText} onClick={onSend} className="aura-press"
          style={{ flex: 'none', width: 40, height: 40, borderRadius: '50%', display: 'grid', placeItems: 'center',
            background: hasText && !disabled ? T.accent : T.raised, color: hasText && !disabled ? T.onAccent : T.textTertiary,
            border: hasText && !disabled ? 'none' : `1px solid ${T.border}`, cursor: hasText && !disabled ? 'pointer' : 'default',
            boxShadow: hasText && !disabled ? T.e1 : 'none', WebkitTapHighlightColor: 'transparent', transition: 'background .15s, color .15s' }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
        </button>
      </div>
    </div>
  );
}

function Conversation({ state, onFocusChange }) {
  const T = useT();
  const isTyping = state === 'typing';
  const isCrisis = state === 'crisis';
  const isLimit = state === 'limit-reached';
  const [typingDone, setTypingDone] = useStateG(false);
  const [banner, setBanner] = useStateG(true);
  const [draft, setDraft] = useStateG('');
  const [sent, setSent] = useStateG([]);
  const scrollRef = useRefG(null);

  useEffectG(() => { setTypingDone(false); }, [state]);
  useEffectG(() => { const el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, [state, typingDone, sent.length, banner]);

  const send = () => { if (!draft.trim()) return; setSent((s) => [...s, draft.trim()]); setDraft(''); };

  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', background: T.bg }}>
      <ChatHeader T={T} />

      <div ref={scrollRef} className="aura-noscroll" style={{ flex: 1, overflowY: 'auto', padding: '14px 16px 8px', display: 'flex', flexDirection: 'column' }}>
        {banner && <DisclosureBanner T={T} onDismiss={() => setBanner(false)} />}

        <div style={{ alignSelf: 'center', fontFamily: FF_DISPLAY, fontWeight: 500, fontSize: 13, color: T.textTertiary,
          letterSpacing: '0.02em', margin: '0 0 4px' }}>Today</div>

        {isTyping
          ? <TypingBubble T={T} full={GREETING} onDone={() => setTypingDone(true)} />
          : <Bubble T={T} role="them" enter={false}>{GREETING}</Bubble>}

        {isCrisis && <CrisisCard T={T} />}

        {sent.map((m, i) => <Bubble key={i} T={T} role="me" gap={4}>{m}</Bubble>)}

        {isLimit && <LimitCard T={T} />}

        <div style={{ height: 4 }} />
      </div>

      <InputDock T={T} value={draft} onChange={setDraft} onSend={send} disabled={isLimit}
        onFocus={() => onFocusChange && onFocusChange(true)} onBlur={() => onFocusChange && onFocusChange(false)} />
    </div>
  );
}

/* ── Shell: flow wiring + the branch logic the registry implies ─────────────── */
const CAROUSEL_SLIDES = ['slide1', 'slide2', 'slide3'];

function Shell() {
  const d = useDev();
  const [kbFocus, setKbFocus] = useState(false);
  const order = SCREENS.map(s => s.id);
  const idx = order.indexOf(d.screenId);
  const screen = SCREENS[idx] || SCREENS[0];

  const goNext = () => { if (idx < order.length - 1) d.setScreenId(order[idx + 1]); };
  const goBack = () => { if (idx > 0) d.setScreenId(order[idx - 1]); };

  // carousel step-advance: Next walks slide1→2→3, then leaves the carousel
  const isCarousel = screen.id === 'carousel';
  const onLastSlide = !isCarousel || d.screenState === CAROUSEL_SLIDES[CAROUSEL_SLIDES.length - 1];
  // age-gate under-18 dead-end: no forward path
  const isUnder18 = screen.id === 'agegate' && d.screenState === 'under18';

  const handleNext = () => {
    if (isCarousel && !onLastSlide) {
      const i = CAROUSEL_SLIDES.indexOf(d.screenState);
      d.setScreenState(CAROUSEL_SLIDES[Math.min(i + 1, CAROUSEL_SLIDES.length - 1)]);
    } else {
      goNext();
    }
  };

  const isLastScreen = idx === order.length - 1;
  const canNext = !isUnder18 && !(isLastScreen && onLastSlide);
  const canBack = idx > 0;
  const nextLabel = isCarousel && !onLastSlide ? 'Next slide' : 'Next';
  const terminalNote = isUnder18 ? 'Under-18 dead-end' : 'End of flow';

  return (
    <IOSDevice dark={d.theme === 'dark'} keyboard={screen.id === 'conversation' && kbFocus}>
      {screen.id === 'welcome' ? (
        <Welcome
          onGetStarted={() => d.setScreenId('auth')}
          onSignIn={() => { d.setScreenId('auth'); setTimeout(() => d.setScreenState('signin'), 0); }}
        />
      ) : screen.id === 'auth' ? (
        <Auth
          mode={d.screenState || 'signup'}
          setMode={(m) => d.setScreenState(m)}
          onDone={() => d.setScreenId('carousel')}
          onWelcome={() => d.setScreenId('welcome')}
        />
      ) : screen.id === 'carousel' ? (
        <Carousel
          index={Math.max(0, CAROUSEL_SLIDES.indexOf(d.screenState || 'slide1'))}
          setIndex={(i) => d.setScreenState(CAROUSEL_SLIDES[Math.min(Math.max(i, 0), 2)])}
          onDone={() => d.setScreenId('agegate')}
        />
      ) : screen.id === 'agegate' ? (
        <AgeGate
          failed={d.screenState === 'under18'}
          onFail={() => d.setScreenState('under18')}
          onDone={() => d.setScreenId('disclosure')}
        />
      ) : screen.id === 'disclosure' ? (
        <Disclosure onContinue={() => d.setScreenId('profile')} />
      ) : screen.id === 'profile' ? (
        <Profile onContinue={() => d.setScreenId('persona')} />
      ) : screen.id === 'persona' ? (
        <Persona onContinue={() => d.setScreenId('conversation')} />
      ) : screen.id === 'conversation' ? (
        <Conversation state={d.screenState || 'default'} onFocusChange={setKbFocus} />
      ) : (
        <Stub
        screen={screen}
        index={idx}
        total={order.length}
        onBack={goBack}
        onNext={handleNext}
        canBack={canBack}
        canNext={canNext}
        nextLabel={nextLabel}
        terminalNote={terminalNote}
      />
      )}
    </IOSDevice>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <DevProvider screens={SCREENS} initial={{ screenId: 'welcome', theme: 'light', account: 'free', dataState: 'happy' }}>
    <DevStage><Shell /></DevStage>
  </DevProvider>
);
