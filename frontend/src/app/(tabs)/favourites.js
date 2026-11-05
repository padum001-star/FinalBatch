import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import FavouritesScreen from '../../../screens/FavouritesScreen';
import { useSession } from '../../state/Session';
export default function Favourites() {
  const { favourites, listings, toggleFavourite, loadError, loadingListings, retry } = useSession();
  if (loadingListings) return <ActivityIndicator style={{ flex: 1 }} />;
  if (loadError) return <TouchableOpacity onPress={retry} style={{ flex: 1, justifyContent: 'center', padding: 24 }}><Text accessibilityRole="alert">{loadError} Tap to retry.</Text></TouchableOpacity>;
  return <FavouritesScreen favourites={favourites} allListings={listings} onToggleFavourite={toggleFavourite} />;
}
