// The screen × state matrix for each prototype artifact, mirrored verbatim from the
// SCREENS/TABS arrays in the *-app.jsx files. Single source of truth for what the harness
// captures. `states: []` means a single-state screen (no per-screen state section in the rail).
//
//   onboarding ← docs/redesign/claude-design/onboarding-app.jsx  SCREENS (lines 25-34)
//   hometabs   ← docs/redesign/claude-design/hometabs-app.jsx     TABS    (lines 51-55)
//   oneoff     ← docs/redesign/claude-design/oneoff-app.jsx        SCREENS (lines 18-31)

export const ARTIFACTS = {
  onboarding: {
    file: 'Onboarding.html',
    themes: ['light', 'dark'],
    screens: [
      { id: 'welcome', label: 'Welcome', states: [] },
      { id: 'auth', label: 'Auth', states: ['signup', 'signin', 'forgot', 'verify', 'reset'] },
      { id: 'carousel', label: 'Intro carousel', states: ['slide1', 'slide2', 'slide3'] },
      { id: 'agegate', label: 'Age gate', states: ['default', 'under18'] },
      { id: 'disclosure', label: 'AI disclosure + Terms', states: [] },
      { id: 'profile', label: 'Profile setup', states: [] },
      { id: 'persona', label: 'Choose your companion', states: [] },
      { id: 'conversation', label: 'Conversation', states: ['default', 'typing', 'crisis', 'limit-reached'] },
    ],
  },

  hometabs: {
    file: 'HomeTabs.html',
    themes: ['light', 'dark'],
    screens: [
      { id: 'home', label: 'Home', states: ['happy', 'empty', 'loading', 'error'] },
      { id: 'companions', label: 'Companions', states: ['happy', 'empty', 'loading', 'error'] },
      { id: 'you', label: 'You', states: ['default'] },
    ],
  },

  oneoff: {
    file: 'OneOff.html',
    themes: ['light', 'dark'],
    screens: [
      { id: 'chat', label: 'Chat conversation', states: ['default', 'typing', 'crisis', 'limit', 'report', 'break'], companions: ['Aurora', 'Orion', 'Lyra'] },
      { id: 'create', label: 'Companion create/edit', states: ['create', 'edit'] },
      { id: 'memory', label: 'Memory', states: [] },
      { id: 'paywall', label: 'Paywall', states: [] },
      { id: 'submgmt', label: 'Subscription mgmt', states: [] },
      { id: 'editprofile', label: 'Edit profile', states: ['default', 'focus', 'error', 'saving'] },
      { id: 'signin', label: 'Sign-in & security', states: ['password', 'google', 'apple', 'apple-hidden'] },
      { id: 'account', label: 'Account management', states: ['default', 'export-sent', 'delete-confirm'] },
      { id: 'notifs', label: 'Notifications', states: ['default'] },
      { id: 'safety', label: 'Safety center', states: ['default'] },
      { id: 'legal', label: 'Privacy / legal', states: ['default'] },
      { id: 'help', label: 'Help / support', states: ['default'] },
      { id: 'states', label: 'System-states kit', states: ['empty', 'loading', 'error', 'offline', 'blocked'] },
    ],
  },
};

/** Flatten an artifact into one entry per (screen, state, theme) capture. */
export function expandMatrix(artifactKey) {
  const art = ARTIFACTS[artifactKey];
  if (!art) throw new Error(`Unknown artifact: ${artifactKey}. Known: ${Object.keys(ARTIFACTS).join(', ')}`);
  const entries = [];
  for (const screen of art.screens) {
    const states = screen.states.length ? screen.states : [null];
    for (const state of states) {
      for (const theme of art.themes) {
        entries.push({ screen: screen.id, label: screen.label, state, theme });
      }
    }
  }
  return { file: art.file, entries };
}
