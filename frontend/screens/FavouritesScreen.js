import React from "react";
import { useAvailableListings } from "../src/state/useAvailableListings";
import { View } from "react-native";
import { Page, ListingCard, Notice } from "../src/components/MarketUI";
export default function FavouritesScreen({
  favourites = new Set(),
  allListings = [],
  onToggleFavourite,
}) {
  const { items: availableListings } = useAvailableListings(allListings);
  const items = availableListings.filter((l) => favourites.has(l.id));
  return (
    <Page title="Your favourites" subtitle="Good places worth coming back to.">
      {!items.length ? (
        <Notice>
          Save a vendor with the heart on a listing. Their available batches
          will appear here.
        </Notice>
      ) : (
        items.map((item) => (
          <View key={item.id} style={{ marginBottom: 12 }}>
            <ListingCard wide item={item} saved onSave={onToggleFavourite} />
          </View>
        ))
      )}
    </Page>
  );
}
