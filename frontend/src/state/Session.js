import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Platform, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { api } from './api';
const Context = createContext(null);
const storage = {
  get: () => Platform.OS === 'web' ? Promise.resolve(sessionStorage.getItem('finalbatch.token')) : SecureStore.getItemAsync('finalbatch.token'),
  set: token => Platform.OS === 'web' ? Promise.resolve(sessionStorage.setItem('finalbatch.token', token)) : SecureStore.setItemAsync('finalbatch.token', token),
  clear: () => Platform.OS === 'web' ? Promise.resolve(sessionStorage.removeItem('finalbatch.token')) : SecureStore.deleteItemAsync('finalbatch.token'),
};
export function SessionProvider({ children }) {
  const [token, setToken] = useState(null);
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);
  const [listings, setListings] = useState([]);
  const [places, setPlaces] = useState(new Set());
  const [loadError, setLoadError] = useState('');
  const [loadingListings, setLoadingListings] = useState(false);
  const pending = useRef(new Set());
  const currentToken = useRef(null);
  const signOut = useCallback(async () => {
    await storage.clear(); currentToken.current = null;
    setToken(null); setUser(null); setPlaces(new Set()); setListings([]); setLoadError('');
  }, []);
  const loadData = useCallback(async (accessToken) => {
    setLoadingListings(true);
    try {
      const [items, saved] = await Promise.all([api('/listings'), api('/favourites', { token: accessToken })]);
      if (currentToken.current !== accessToken) return;
      setListings(items); setPlaces(new Set(saved.placeIds)); setLoadError('');
    } catch (error) {
      if (currentToken.current !== accessToken) return;
      if (error.status === 401) { await signOut(); return; }
      setLoadError(error.message);
    } finally { if (currentToken.current === accessToken) setLoadingListings(false); }
  }, [signOut]);
  useEffect(() => {
    (async () => {
      try {
        const saved = await storage.get();
        if (saved) {
          const me = await api('/auth/me', { token: saved });
          currentToken.current = saved; setToken(saved); setUser(me); await loadData(saved);
        }
      } catch (error) { if (error.status === 401) await storage.clear(); }
      finally { setReady(true); }
    })();
  }, [loadData]);
  async function signIn(result) {
    await storage.set(result.token);
    currentToken.current = result.token;
    setToken(result.token); setUser(result.user); setPlaces(new Set());
    await loadData(result.token);
  }
  async function toggleFavourite(id) {
    const place = listings.find(item => item.id === id)?.vendorName;
    if (!token || !place || pending.current.has(place)) return;
    const accessToken = token;
    pending.current.add(place);
    const removing = places.has(place);
    try {
      await api(`/favourites/${encodeURIComponent(id)}`, { token, method: removing ? 'DELETE' : 'PUT' });
      if (currentToken.current !== accessToken) return;
      setPlaces(previous => { const next = new Set(previous); if (removing) next.delete(place); else next.add(place); return next; });
    } catch (error) {
      if (error.status === 401) await signOut();
      else Alert.alert('Could not update favourites', error.message);
    } finally { pending.current.delete(place); }
  }
  const favourites = new Set(listings.filter(item => places.has(item.vendorName)).map(item => item.id));
  return <Context.Provider value={{ user, ready, signIn, signOut, favourites, listings, toggleFavourite, loadError, loadingListings, retry: () => loadData(token) }}>{children}</Context.Provider>;
}
export const useSession = () => useContext(Context);
