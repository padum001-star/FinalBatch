import React, { useCallback, useState, useRef } from "react";
import { View, Text, Image, ActivityIndicator, Linking } from "react-native";
import {
  useLocalSearchParams,
  router,
  useFocusEffect,
  Redirect,
} from "expo-router";
import { useSession } from "../../state/Session";
import { api } from "../../state/api";
import { openConversation } from "../../state/openConversation";
import { googleMapsUrl } from "../../services-location";
import ReportListing from "../../components/ReportListing";
import { reserve } from "../../state/reserve";
import { useTheme } from "../../design/Theme";
import { Page, Button, Notice, price, pickup } from "../../components/MarketUI";
export default function Listing() {
  const { id } = useLocalSearchParams();
  const { token, user, retry, ready } = useSession();
  const { colors: c } = useTheme();
  const [item, setItem] = useState(null),
    [quantity, setQuantity] = useState(1),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [confirmed, setConfirmed] = useState(null);
  const lock = useRef(false);
  const load = useCallback(async () => {
    try {
      setError("");
      setItem(await api(`/listings/${encodeURIComponent(id)}`));
    } catch (e) {
      if (e.status === 404) setItem(null);
      setError(e.message);
    }
  }, [id]);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  async function book() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await reserve({
        userId: user.id,
        token,
        listingId: item.id,
        quantity,
      });
      setConfirmed(result);
      await retry();
      await load();
    } catch (e) {
      setError(
        e.message +
          " If the result is uncertain, retry to check the same reservation.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function contact(url) {
    try {
      await Linking.openURL(url);
    } catch {
      setError(
        "No app could open this contact method. Use the email or phone number shown here.",
      );
    }
  }
  if (!ready)
    return (
      <Page title="Listing">
        <ActivityIndicator color={c.green} />
      </Page>
    );
  if (!user) return <Redirect href="/auth" />;
  return (
    <Page title={item?.itemName || "Listing"} back>
      {error ? <Notice error>{error}</Notice> : null}
      {!item ? (
        <>
          {!error ? <ActivityIndicator color={c.green} /> : null}
          <Button title="Reload listing" secondary onPress={load} />
        </>
      ) : (
        <>
          {item.photoUrl ? (
            <Image
              source={{ uri: item.photoUrl }}
              accessibilityLabel={item.itemName}
              style={{
                width: "100%",
                aspectRatio: 1.2,
                borderRadius: 24,
                backgroundColor: c.tint,
              }}
            />
          ) : (
            <Notice>Photo unavailable.</Notice>
          )}
          <View style={{ gap: 7 }}>
            <Text style={{ fontSize: 20, fontWeight: "700", color: c.ink }}>
              {item.vendorName}
            </Text>
            <Text style={{ color: c.muted }}>{item.tag}</Text>
            <Text style={{ color: c.green, fontSize: 28, fontWeight: "700" }}>
              {price(item.price)}{" "}
              <Text style={{ fontSize: 14, color: c.muted }}>per item</Text>
            </Text>
          </View>
          <Text style={{ fontSize: 16, lineHeight: 25, color: c.ink }}>
            {item.description}
          </Text>
          {item.status !== "active" ? (
            <Notice>
              {item.status === "expired"
                ? "This pickup window has ended."
                : item.status === "sold_out"
                  ? "This batch is sold out."
                  : "This listing is closed."}
            </Notice>
          ) : null}
          <Notice>
            {pickup(item)}
            {"\n"}
            {item.address}
            {"\n"}
            {item.quantity} available
          </Notice>
          {confirmed ? (
            <>
              <Notice>
                Reservation{" "}
                {confirmed.status === "reserved"
                  ? "confirmed"
                  : confirmed.status}
                . {confirmed.quantity} item(s). No online payment has been
                taken.
              </Notice>
              <Button
                title="View reservations"
                onPress={() => router.push("/reservations")}
              />
            </>
          ) : item.ownerId === user.id ? (
            <Button
              title="Manage your listing"
              onPress={() => router.push("/vendor")}
            />
          ) : (
            <>
              <View
                style={{ flexDirection: "row", gap: 18, alignItems: "center" }}
              >
                <Button
                  title="−"
                  secondary
                  disabled={quantity <= 1 || busy}
                  onPress={() => setQuantity((q) => q - 1)}
                />
                <Text
                  accessibilityLabel={`Quantity ${quantity}`}
                  style={{ fontSize: 20, color: c.ink }}
                >
                  {quantity}
                </Text>
                <Button
                  title="+"
                  secondary
                  disabled={quantity >= Math.min(item.quantity, 100) || busy}
                  onPress={() => setQuantity((q) => q + 1)}
                />
              </View>
              <Button
                title={`Reserve · ${price(item.price * quantity)}`}
                busy={busy}
                disabled={
                  item.quantity < quantity ||
                  item.status !== "active" ||
                  new Date(item.pickupEnd) <= new Date()
                }
                onPress={book}
              />
              <Text style={{ color: c.muted, fontSize: 13 }}>
                Reserve for pickup. Online payment is not available yet.
              </Text>
            </>
          )}
          <Button
            title="View pickup in Google Maps"
            secondary
            icon="map-outline"
            onPress={() => contact(googleMapsUrl(item.location, item.address))}
          />
          <View
            style={{
              gap: 10,
              borderTopWidth: 1,
              borderTopColor: c.line,
              paddingTop: 20,
            }}
          >
            <Text style={{ fontSize: 19, color: c.ink, fontWeight: "700" }}>
              Contact the vendor
            </Text>
            <Text selectable style={{ color: c.muted }}>
              {item.contact.email}
              {item.contact.phone ? `\n${item.contact.phone}` : ""}
            </Text>
            {item.ownerId !== user.id ? (
              <Button
                title="Message vendor"
                icon="chatbubble-outline"
                disabled={busy}
                onPress={async () => {
                  if (lock.current) return;
                  lock.current = true;
                  setBusy(true);
                  try {
                    await openConversation(token, { listingId: item.id });
                  } catch (e) {
                    setError(e.message);
                  } finally {
                    lock.current = false;
                    setBusy(false);
                  }
                }}
              />
            ) : null}
            <Button
              secondary
              title="Email vendor"
              icon="mail-outline"
              onPress={() =>
                contact(
                  `mailto:${encodeURIComponent(item.contact.email)}?subject=${encodeURIComponent(`Pickup: ${item.itemName}`)}`,
                )
              }
            />
            {item.contact.phone ? (
              <Button
                secondary
                title="Call vendor"
                icon="call-outline"
                onPress={() =>
                  contact(`tel:${item.contact.phone.replace(/[^+\d]/g, "")}`)
                }
              />
            ) : null}
          </View>
          <ReportListing listingId={item.id} />
        </>
      )}
    </Page>
  );
}
