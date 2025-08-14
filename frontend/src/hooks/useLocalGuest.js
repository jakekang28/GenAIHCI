import { useEffect, useState } from 'react';


const GUEST_KEY = 'guestUser';
const SESSION_KEY = 'interview:sessionId';

export function useLocalGuest() {
  const [guest, setGuest] = useState(null);

  useEffect(() => {
    const raw = localStorage.getItem(GUEST_KEY);
    if (raw) {
      try {
        setGuest(JSON.parse(raw));
      } catch {}
    }
  }, []);

 

  function clearGuest() {
    localStorage.removeItem(GUEST_KEY);
    setGuest(null);
  }

  function getSessionId() {
    return localStorage.getItem(SESSION_KEY) || '';
  }

  function setSessionId(sessionId) {
    localStorage.setItem(SESSION_KEY, sessionId);
  }

  function clearSessionId() {
    localStorage.removeItem(SESSION_KEY);
  }

  return {
    guest,
    clearGuest,
    getSessionId,
    setSessionId,
    clearSessionId,
  };
}