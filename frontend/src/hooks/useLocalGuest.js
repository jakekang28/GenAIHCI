import { useEffect, useState } from 'react';


const GUEST_KEY = 'guestUser';
const SESSION_KEY = 'interview:sessionId';

export function useLocalGuest() {
  const [guest, setGuest] = useState(null);

  const loadGuestFromStorage = () => {
    // Try sessionStorage first (better tab isolation), then localStorage
    const sessionStorageData = sessionStorage.getItem(GUEST_KEY);
    const localStorageData = localStorage.getItem(GUEST_KEY);
    
    let raw = sessionStorageData || localStorageData;
    
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setGuest(parsed);
        
        // Ensure it's also in sessionStorage for this tab
        if (!sessionStorageData) {
          sessionStorage.setItem(GUEST_KEY, raw);
        }
        return;
      } catch (e) {
        console.warn('Failed to parse guestUser JSON:', e);
      }
    }
    
    // Fall back to separate keys format
    const guestUserId = localStorage.getItem('guestUserId');
    const guestName = localStorage.getItem('guestName');
    
    if (guestUserId && guestName) {
      const guestData = { guestUserId, guestName };
      setGuest(guestData);
      
      // Store in both sessionStorage (primary) and localStorage (backup)
      const jsonData = JSON.stringify(guestData);
      sessionStorage.setItem(GUEST_KEY, jsonData);
      localStorage.setItem(GUEST_KEY, jsonData);
    } else {
      setGuest(null);
    }
  };

  useEffect(() => {
    loadGuestFromStorage();
  }, []);

  // Listen for localStorage changes from other tabs/components
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === GUEST_KEY || e.key === 'guestUserId' || e.key === 'guestName') {
        setTimeout(loadGuestFromStorage, 100); // Small delay to ensure all keys are updated
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

 

  function clearGuest() {
    // Clear from both sessionStorage and localStorage
    sessionStorage.removeItem(GUEST_KEY);
    localStorage.removeItem(GUEST_KEY);
    localStorage.removeItem('guestUserId');
    localStorage.removeItem('guestName');
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

  const ensureGuest = (userId, userName) => {
    const guestData = { guestUserId: userId, guestName: userName };
    setGuest(guestData);
    
    // Store in both sessionStorage (primary for tab isolation) and localStorage (backup/compatibility)
    const jsonData = JSON.stringify(guestData);
    sessionStorage.setItem(GUEST_KEY, jsonData);
    localStorage.setItem(GUEST_KEY, jsonData);
    
    // Also store in the separate format for compatibility
    localStorage.setItem('guestUserId', userId);
    localStorage.setItem('guestName', userName);
  };

  return {
    guest,
    ensureGuest,
    clearGuest,
    getSessionId,
    setSessionId,
    clearSessionId,
  };
}