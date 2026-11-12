import React, { useCallback, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  Linking,
} from "react-native";
import { Redirect, useFocusEffect } from "expo-router";
import DateTimeField from "../components/DateTimeField";
import { defaultWindow, applyPreset, localValue } from "../state/pickup-time";
import { currentShopLocation, googleMapsUrl } from "../services-location";
import { useReservationHistory } from "../state/useReservationHistory";
import { openConversation } from "../state/openConversation";
import { selectListingPhoto } from "../services-photo";
import { useSession } from "../state/Session";
import { api } from "../state/api";
import { useTheme } from "../design/Theme";
import { Page, Field, Button, Notice, price } from "../components/MarketUI";
const empty = {
  title: "",
  description: "",
  price: "",
  originalPrice: "",
  quantity: "1",
  category: "Bakery",
  pickupStart: "",
  pickupEnd: "",
};
export default function Vendor() {
  const { user } = useSession();
  return <VendorContent key={user?.id || "guest"} />;
}
function VendorContent() {
  const { user, token, retry, refreshUser, ready } = useSession();
  const { colors: c } = useTheme();
  const [vendor, setVendor] = useState(null),
    [profile, setProfile] = useState({
      businessName: "",
      address: "",
      phone: "",
      latitude: null,
      longitude: null,
    }),
    [form, setForm] = useState(() => ({ ...empty, ...defaultWindow() })),
    [photo, setPhoto] = useState(null),
    [uploadId, setUploadId] = useState(""),
    [items, setItems] = useState([]),
    [reservations, setReservations] = useState([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loaded, setLoaded] = useState(false);
  const [presets, setPresets] = useState([]),
    [presetName, setPresetName] = useState(""),
    [makeDefault, setMakeDefault] = useState(true),
    [timeZone, setTimeZone] = useState(
      () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    );
  const presetInitialized = useRef(false);
  const lock = useRef(false);
  const [closingId, setClosingId] = useState("");
  const load = useCallback(async () => {
    try {
      const v = await api("/vendors/me", { token });
      setVendor(v);
      if (v)
        setProfile({
          businessName: v.business_name,
          address: v.address,
          phone: v.phone || "",
          latitude: v.latitude === null ? null : Number(v.latitude),
          longitude: v.longitude === null ? null : Number(v.longitude),
        });
      const [l, r, p] = await Promise.all([
        api("/vendors/me/listings", { token }),
        api("/vendors/me/reservations", { token }),
        v ? api("/vendors/me/pickup-presets", { token }) : Promise.resolve([]),
      ]);
      setItems(l);
      setReservations(r);
      setPresets(p);
      if (v && !presetInitialized.current) {
        presetInitialized.current = true;
        const preferred = p.find((x) => x.is_default);
        if (preferred) {
          try {
            setForm((f) => ({ ...f, ...applyPreset(preferred) }));
            setTimeZone(preferred.time_zone);
          } catch {
            setNotice(
              "Your saved pickup time falls in a daylight-saving change. Choose another time.",
            );
          }
        }
      }
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoaded(true);
    }
  }, [token]);
  useFocusEffect(
    useCallback(() => {
      if (token) void load();
    }, [token, load]),
  );
  const refreshPickups = useCallback(async () => {
    try {
      setReservations(await api("/vendors/me/reservations", { token }));
    } catch (e) {
      setError(e.message);
    }
  }, [token]);
  const { items: pickupHistory, now: pickupNow } = useReservationHistory(
    reservations,
    refreshPickups,
  );
  async function savePreset() {
    await act(async () => {
      const start = localValue(form.pickupStart, timeZone),
        end = localValue(form.pickupEnd, timeZone);
      const dayDifference =
        (Date.parse(end.slice(0, 10) + "T12:00:00Z") -
          Date.parse(start.slice(0, 10) + "T12:00:00Z")) /
        86400000;
      if (
        dayDifference < 0 ||
        dayDifference > 1 ||
        +new Date(form.pickupEnd) <= +new Date(form.pickupStart)
      )
        throw new Error(
          "A preset must end after its start, on the same or following day.",
        );
      await api("/vendors/me/pickup-presets", {
        token,
        method: "POST",
        body: {
          name: presetName,
          startTime: start.slice(11),
          endTime: end.slice(11),
          endNextDay: dayDifference === 1,
          timeZone,
          isDefault: makeDefault,
        },
      });
      setPresets(await api("/vendors/me/pickup-presets", { token }));
      setPresetName("");
      setNotice("Pickup preset saved. It reuses the times, not the old date.");
    });
  }
  async function act(work) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (e) {
      setError(e.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function choosePhoto(source) {
    await act(async () => {
      const photo = await selectListingPhoto(source);
      if (!photo) return;
      const upload = await api("/media/uploads", {
        token,
        method: "POST",
        body: { contentType: photo.contentType, size: photo.blob.size },
      });
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 60000);
      try {
        const put = await fetch(upload.uploadUrl, {
          method: "PUT",
          headers: upload.headers,
          body: photo.blob,
          signal: controller.signal,
        });
        if (!put.ok)
          throw new Error("Photo upload failed. Choose the photo again.");
      } finally {
        clearTimeout(timer);
      }
      setPhoto(photo.uri);
      setUploadId(upload.uploadId);
      setNotice("Photo uploaded.");
    });
  }
  async function publish() {
    await act(async () => {
      if (!uploadId) throw new Error("Choose a real listing photo first.");
      const start = new Date(form.pickupStart),
        end = new Date(form.pickupEnd);
      if (!Number.isFinite(+start) || !Number.isFinite(+end))
        throw new Error("Choose both pickup dates and times.");
      await api("/listings", {
        token,
        method: "POST",
        body: {
          ...form,
          quantity: Number(form.quantity),
          pickupStart: start.toISOString(),
          pickupEnd: end.toISOString(),
          uploadId,
        },
      });
      const preferred = presets.find((p) => p.is_default);
      let nextWindow = defaultWindow();
      if (preferred) {
        try {
          nextWindow = applyPreset(preferred);
        } catch {
          /* A DST gap must not turn a successful publish into an error. */
        }
      }
      setForm({ ...empty, ...nextWindow });
      if (preferred) setTimeZone(preferred.time_zone);
      setPhoto(null);
      setUploadId("");
      setNotice("Your listing is published.");
      await load();
      await retry();
    });
  }
  const update = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  if (!ready)
    return (
      <Page title="Your batches">
        <Notice>Restoring your account…</Notice>
      </Page>
    );
  if (!user) return <Redirect href="/auth" />;
  return (
    <Page title="Your batches" subtitle="Good food deserves to be found." back>
      {error ? <Notice error>{error}</Notice> : null}
      {notice ? <Notice>{notice}</Notice> : null}
      {!loaded ? (
        <Notice>Loading your vendor profile…</Notice>
      ) : (
        <>
          <Text style={{ fontSize: 22, fontWeight: "700", color: c.ink }}>
            {vendor ? "Business details" : "Set up your business"}
          </Text>
          <Field
            label="Business name"
            value={profile.businessName}
            onChangeText={(v) => setProfile((p) => ({ ...p, businessName: v }))}
          />
          <Button
            title="Use my current location"
            secondary
            icon="location-outline"
            disabled={busy}
            onPress={() =>
              act(async () => {
                const location = await currentShopLocation();
                setProfile((p) => ({
                  ...p,
                  address: location.address,
                  latitude: location.latitude,
                  longitude: location.longitude,
                }));
                if (location.timeZone) setTimeZone(location.timeZone);
                setNotice(
                  location.address
                    ? "Location found. Check the shop address and map, then save business details."
                    : "Location pin found. Enter the pickup address, then save business details.",
                );
              })
            }
          />
          <Text style={{ color: c.muted, lineHeight: 20 }}>
            Use this while at your shop. Your location is requested only when
            you tap; the shop pin becomes public after you save it.
          </Text>
          {profile.latitude !== null ? (
            <Button
              title="Check shop pin in Google Maps"
              secondary
              icon="map-outline"
              onPress={() =>
                Linking.openURL(googleMapsUrl(profile, profile.address)).catch(
                  () => setError("Google Maps could not open."),
                )
              }
            />
          ) : null}
          <Field
            label="Pickup address"
            value={profile.address}
            onChangeText={(v) => setProfile((p) => ({ ...p, address: v }))}
          />
          {profile.latitude !== null ? (
            <Button
              title="Remove location pin"
              secondary
              disabled={busy}
              onPress={() =>
                setProfile((p) => ({ ...p, latitude: null, longitude: null }))
              }
            />
          ) : null}
          <Field
            label="Contact phone (optional)"
            keyboardType="phone-pad"
            value={profile.phone}
            onChangeText={(v) => setProfile((p) => ({ ...p, phone: v }))}
          />
          <Notice>
            Your business address, contact phone, and account email (
            {user.email}) will be visible on your listings. Posting creates a
            vendor account; it does not imply platform verification.
          </Notice>
          <Button
            title={vendor ? "Save business details" : "Create vendor profile"}
            busy={busy}
            onPress={() =>
              act(async () => {
                await api("/vendors/me", {
                  token,
                  method: "PUT",
                  body: profile,
                });
                await refreshUser();
                await load();
                setNotice("Business details saved.");
              })
            }
          />
          {vendor ? (
            <>
              <View
                style={{
                  height: 1,
                  backgroundColor: c.line,
                  marginVertical: 8,
                }}
              />
              <Text style={{ fontSize: 24, fontWeight: "700", color: c.ink }}>
                Publish a fresh batch
              </Text>
              {photo ? (
                <Image
                  source={{ uri: photo }}
                  style={{ width: "100%", aspectRatio: 1.4, borderRadius: 20 }}
                />
              ) : null}
              <Text style={{ fontWeight: "600", color: c.ink }}>
                Add a food photo
              </Text>
              <View style={{ gap: 8 }}>
                <Button
                  title="Take a photo"
                  secondary
                  icon="camera-outline"
                  disabled={busy}
                  onPress={() => choosePhoto("camera")}
                />
                <Button
                  title="Choose from gallery"
                  secondary
                  icon="images-outline"
                  disabled={busy}
                  onPress={() => choosePhoto("gallery")}
                />
                <Button
                  title="Choose from Files"
                  secondary
                  icon="folder-outline"
                  disabled={busy}
                  onPress={() => choosePhoto("files")}
                />
              </View>
              <Text style={{ fontSize: 13, color: c.muted }}>
                JPEG, PNG or WebP. Photos are resized for faster uploads.
              </Text>
              <Field
                label="What’s in this batch?"
                placeholder="Describe your actual item"
                value={form.title}
                onChangeText={(v) => update("title", v)}
              />
              <Field
                label="Description and allergens"
                multiline
                placeholder="Portion size, ingredients, allergens, and anything customers should know"
                value={form.description}
                onChangeText={(v) => update("description", v)}
              />
              <Text style={{ color: c.ink, fontWeight: "600" }}>Category</Text>
              <ScrollView horizontal contentContainerStyle={{ gap: 8 }}>
                {[
                  "Bakery",
                  "Café",
                  "Restaurant",
                  "Produce",
                  "Meals",
                  "Other",
                ].map((cat) => (
                  <Pressable
                    key={cat}
                    accessibilityRole="button"
                    accessibilityState={{ selected: form.category === cat }}
                    onPress={() => update("category", cat)}
                    style={{
                      padding: 12,
                      borderRadius: 20,
                      backgroundColor: form.category === cat ? c.green : c.tint,
                    }}
                  >
                    <Text
                      style={{
                        color: form.category === cat ? c.onGreen : c.ink,
                      }}
                    >
                      {cat}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={{ flexDirection: "row", gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Price per item ($)"
                    keyboardType="decimal-pad"
                    value={form.price}
                    onChangeText={(v) => update("price", v)}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Field
                    label="Original price ($, optional)"
                    keyboardType="decimal-pad"
                    value={form.originalPrice}
                    onChangeText={(v) => update("originalPrice", v)}
                  />
                </View>
              </View>
              <Field
                label="Quantity available"
                keyboardType="number-pad"
                value={form.quantity}
                onChangeText={(v) => update("quantity", v)}
              />
              <Text style={{ fontSize: 20, fontWeight: "700", color: c.ink }}>
                Pickup window
              </Text>
              <Text style={{ color: c.muted }}>
                Times shown in {timeZone.replace(/_/g, " ")}.
              </Text>
              {presets.map((p) => (
                <View
                  key={p.preset_id}
                  style={{
                    padding: 14,
                    borderRadius: 16,
                    backgroundColor: c.tint,
                    gap: 8,
                  }}
                >
                  <Button
                    title={`${p.name}${p.is_default ? " · default" : ""} · ${p.start_time.slice(0, 5)}–${p.end_time.slice(0, 5)}${p.end_next_day ? " next day" : ""}`}
                    secondary
                    disabled={busy}
                    onPress={() => {
                      try {
                        const date = localValue(
                            form.pickupStart,
                            p.time_zone,
                          ).slice(0, 10),
                          today = localValue(Date.now(), p.time_zone).slice(
                            0,
                            10,
                          );
                        setForm((f) => ({
                          ...f,
                          ...applyPreset(p, date === today ? undefined : date),
                        }));
                        setTimeZone(p.time_zone);
                        setNotice(
                          `${p.name} applied. Check the date before publishing.`,
                        );
                      } catch (e) {
                        setError(e.message);
                      }
                    }}
                  />
                  <Button
                    title={`Remove ${p.name} preset`}
                    secondary
                    disabled={busy}
                    onPress={() =>
                      act(async () => {
                        await api(`/vendors/me/pickup-presets/${p.preset_id}`, {
                          token,
                          method: "DELETE",
                        });
                        setPresets(
                          await api("/vendors/me/pickup-presets", { token }),
                        );
                      })
                    }
                  />
                </View>
              ))}
              <DateTimeField
                label="Pickup starts"
                value={form.pickupStart}
                timeZone={timeZone}
                disabled={busy}
                onChange={(v) => update("pickupStart", v)}
              />
              <DateTimeField
                label="Pickup ends"
                value={form.pickupEnd}
                timeZone={timeZone}
                disabled={busy}
                onChange={(v) => update("pickupEnd", v)}
              />
              <View
                style={{
                  padding: 16,
                  gap: 12,
                  backgroundColor: c.tint,
                  borderRadius: 18,
                }}
              >
                <Text style={{ fontWeight: "700", color: c.ink }}>
                  Use these times again
                </Text>
                <Field
                  label="Pickup preset name"
                  placeholder="Dinner pickups"
                  value={presetName}
                  onChangeText={setPresetName}
                  maxLength={40}
                />
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: makeDefault }}
                  onPress={() => setMakeDefault((v) => !v)}
                  style={{ minHeight: 44, justifyContent: "center" }}
                >
                  <Text style={{ color: c.ink }}>
                    {makeDefault ? "☑" : "☐"} Use by default for new batches
                  </Text>
                </Pressable>
                <Button
                  title="Save pickup preset"
                  secondary
                  disabled={busy || !presetName.trim()}
                  onPress={savePreset}
                />
                <Text style={{ color: c.muted, fontSize: 13 }}>
                  Save a daily time window. Using the same name updates that
                  preset.
                </Text>
              </View>
              <Button title="Publish listing" busy={busy} onPress={publish} />
              <Text
                style={{
                  fontSize: 23,
                  fontWeight: "700",
                  color: c.ink,
                  marginTop: 15,
                }}
              >
                Your listings
              </Text>
              {!items.length ? (
                <Notice>No published batches yet.</Notice>
              ) : (
                items.map((item) => (
                  <View
                    key={item.id}
                    style={{
                      backgroundColor: c.surface,
                      borderRadius: 18,
                      padding: 18,
                      gap: 10,
                    }}
                  >
                    <Text
                      style={{ fontSize: 17, fontWeight: "700", color: c.ink }}
                    >
                      {item.itemName}
                    </Text>
                    <Text style={{ color: c.muted }}>
                      {price(item.price)} · {item.quantity} available ·{" "}
                      {item.status === "expired"
                        ? "Pickup ended"
                        : item.status === "sold_out"
                          ? "Sold out"
                          : item.status === "removed"
                            ? "Removed by administrator"
                            : item.status}
                    </Text>
                    {item.removalReason ? (
                      <Notice>
                        Removed by an administrator: {item.removalReason}
                      </Notice>
                    ) : null}
                    {closingId === item.id ? (
                      <>
                        <Notice>
                          Stop new reservations? Existing pickups will remain.
                        </Notice>
                        <Button
                          title="Keep listing open"
                          secondary
                          onPress={() => setClosingId("")}
                        />
                      </>
                    ) : null}
                    {item.status === "active" || item.status === "sold_out" ? (
                      <Button
                        title={
                          closingId === item.id
                            ? "Confirm close listing"
                            : "Close listing"
                        }
                        secondary
                        disabled={busy}
                        onPress={() => {
                          if (closingId !== item.id) {
                            setClosingId(item.id);
                            return;
                          }
                          void act(async () => {
                            await api(`/listings/${item.id}/close`, {
                              token,
                              method: "POST",
                            });
                            await load();
                            await retry();
                            setClosingId("");
                          });
                        }}
                      />
                    ) : null}
                  </View>
                ))
              )}
              <Text
                style={{
                  fontSize: 23,
                  fontWeight: "700",
                  color: c.ink,
                  marginTop: 15,
                }}
              >
                Incoming pickups
              </Text>
              {!pickupHistory.length ? (
                <Notice>Customer reservations will appear here.</Notice>
              ) : (
                pickupHistory.map((r) => (
                  <View
                    key={r.reservation_id}
                    style={{
                      backgroundColor: c.surface,
                      borderRadius: 18,
                      padding: 18,
                      gap: 10,
                    }}
                  >
                    <Text
                      style={{ fontWeight: "700", color: c.ink, fontSize: 17 }}
                    >
                      {r.customer_name}: {r.quantity} × {r.item_name}
                    </Text>
                    <Text style={{ color: c.muted }}>
                      Reference {r.reservation_id.slice(0, 8)} ·{" "}
                      {r.status === "expired"
                        ? "Cancelled · pickup missed"
                        : r.status}
                    </Text>
                    {r.status === "reserved" &&
                    +new Date(r.pickup_window_end) <= pickupNow ? (
                      <Notice>
                        Pickup window ended. Collection is allowed until{" "}
                        {new Date(r.expires_at).toLocaleTimeString(undefined, {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                        .
                      </Notice>
                    ) : null}
                    <Button
                      title="Message customer"
                      secondary
                      icon="chatbubble-outline"
                      disabled={busy}
                      onPress={() =>
                        act(() =>
                          openConversation(token, {
                            reservationId: r.reservation_id,
                          }),
                        )
                      }
                    />
                    {r.status === "reserved" ? (
                      <Button
                        title="Mark collected"
                        secondary
                        disabled={busy}
                        onPress={() =>
                          act(async () => {
                            await api(
                              `/reservations/${r.reservation_id}/collect`,
                              { token, method: "POST" },
                            );
                            await load();
                          })
                        }
                      />
                    ) : null}
                  </View>
                ))
              )}
            </>
          ) : null}
        </>
      )}
    </Page>
  );
}
