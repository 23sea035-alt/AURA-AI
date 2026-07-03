// Per-companion composer draft that survives leaving the screen. The draft
// loads once on mount (unless an initial value like a Home starter template is
// supplied) and every change persists; emptying the field clears it.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';

export function useDraft(cid: string, initial = ''): [string, (v: string) => void] {
  const [value, setValue] = useState(initial);
  const loaded = useRef(false);

  useEffect(() => {
    if (!cid) return;
    AsyncStorage.getItem(`draft:${cid}`)
      .then((saved) => {
        if (saved && !initial) setValue((cur) => (cur ? cur : saved));
      })
      .catch(() => {})
      .finally(() => {
        loaded.current = true;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid]);

  useEffect(() => {
    if (!loaded.current || !cid) return;
    if (value) AsyncStorage.setItem(`draft:${cid}`, value).catch(() => {});
    else AsyncStorage.removeItem(`draft:${cid}`).catch(() => {});
  }, [value, cid]);

  return [value, setValue];
}
