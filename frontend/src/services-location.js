import * as Location from "expo-location";
import { Platform } from "react-native";
function deadline(promise, ms) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(
        () =>
          reject(
            new Error(
              "Location took too long. Try again outside or enter the address manually.",
            ),
          ),
        ms,
      );
    }),
  ]).finally(() => clearTimeout(timer));
}
export async function currentShopLocation() {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (permission.status !== "granted")
    throw new Error(
      "Location permission was not granted. You can enter your pickup address manually or enable location in Settings.",
    );
  const position = await deadline(
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
    25000,
  );
  const { latitude, longitude, accuracy } = position.coords;
  let address = "",
    timeZone = null;
  if (Platform.OS !== "web") {
    try {
      const [place] = await deadline(
        Location.reverseGeocodeAsync({ latitude, longitude }),
        10000,
      );
      if (place) {
        address =
          place.formattedAddress ||
          [
            [place.streetNumber, place.street].filter(Boolean).join(" ") ||
              place.name,
            place.city,
            place.region,
            place.postalCode,
          ]
            .filter(Boolean)
            .join(", ");
        timeZone = place.timezone;
      }
    } catch {
      /* Coordinates remain usable when address lookup is unavailable. */
    }
  }
  return { latitude, longitude, accuracy, address, timeZone };
}
export const googleMapsUrl = (location, address) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location ? `${location.latitude},${location.longitude}` : address)}`;
