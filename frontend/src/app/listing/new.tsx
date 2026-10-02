import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { FormField } from '@/components/form-field';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CATEGORIES } from '@/constants/categories';
import { AccentColors, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { createListing, uploadListingImage } from '@/lib/api/listings';

const MAX_PHOTOS = 4;

export default function NewListingScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0].id);
  const [originalPrice, setOriginalPrice] = useState('');
  const [discountedPrice, setDiscountedPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [hoursUntilExpires, setHoursUntilExpires] = useState('4');
  const [pickupNotes, setPickupNotes] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS - photos.length,
    });
    if (!result.canceled) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)].slice(0, MAX_PHOTOS));
    }
  }

  function removePhoto(uri: string) {
    setPhotos((prev) => prev.filter((p) => p !== uri));
  }

  async function handleSubmit() {
    if (!profile) return;
    setError(null);

    const original = Number(originalPrice);
    const discounted = Number(discountedPrice);
    const qty = Number(quantity);
    const hours = Number(hoursUntilExpires);

    if (!title.trim()) return setError('Give the listing a title.');
    if (!Number.isFinite(original) || original < 0) return setError('Enter a valid original price.');
    if (!Number.isFinite(discounted) || discounted < 0) return setError('Enter a valid discounted price.');
    if (discounted > original) return setError('Discounted price should be less than the original price.');
    if (!Number.isInteger(qty) || qty < 1) return setError('Enter a valid quantity.');
    if (!Number.isFinite(hours) || hours <= 0) return setError('Enter how many hours until this expires.');

    setSubmitting(true);
    try {
      const imageUrls: string[] = [];
      for (const uri of photos) {
        imageUrls.push(await uploadListingImage(profile.id, uri));
      }

      const expiresAt = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();

      await createListing({
        business_id: profile.id,
        title: title.trim(),
        description: description.trim() || null,
        category,
        original_price: original,
        discounted_price: discounted,
        quantity_total: qty,
        expires_at: expiresAt,
        pickup_notes: pickupNotes.trim() || null,
        image_urls: imageUrls,
      });

      router.replace('/(tabs)/my-listings');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create listing');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.flex} contentContainerStyle={styles.content}>
      <ThemedView style={styles.form}>
        <ThemedText type="smallBold">Photos</ThemedText>
        <View style={styles.photoRow}>
          {photos.map((uri) => (
            <Pressable key={uri} onPress={() => removePhoto(uri)} style={styles.photoThumbWrapper}>
              <Image source={{ uri }} style={styles.photoThumb} contentFit="cover" />
              <View style={styles.photoRemoveBadge}>
                <ThemedText type="small" style={styles.photoRemoveText}>
                  ✕
                </ThemedText>
              </View>
            </Pressable>
          ))}
          {photos.length < MAX_PHOTOS && (
            <Pressable onPress={handlePickImage}>
              <ThemedView type="backgroundElement" style={[styles.photoThumb, styles.addPhoto]}>
                <ThemedText type="title" themeColor="textSecondary">
                  +
                </ThemedText>
              </ThemedView>
            </Pressable>
          )}
        </View>

        <FormField label="Title" value={title} onChangeText={setTitle} placeholder="e.g. Sourdough loaves" />
        <FormField
          label="Description (optional)"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
        />

        <ThemedText type="smallBold">Category</ThemedText>
        <View style={styles.chipRow}>
          {CATEGORIES.map((c) => (
            <Pressable key={c.id} onPress={() => setCategory(c.id)}>
              <ThemedView type={category === c.id ? 'backgroundSelected' : 'backgroundElement'} style={styles.chip}>
                <ThemedText type="small" themeColor={category === c.id ? 'text' : 'textSecondary'}>
                  {c.label}
                </ThemedText>
              </ThemedView>
            </Pressable>
          ))}
        </View>

        <View style={styles.row}>
          <FormField
            label="Original price"
            value={originalPrice}
            onChangeText={setOriginalPrice}
            keyboardType="decimal-pad"
            placeholder="8.00"
            style={styles.flex}
          />
          <FormField
            label="Discounted price"
            value={discountedPrice}
            onChangeText={setDiscountedPrice}
            keyboardType="decimal-pad"
            placeholder="3.00"
            style={styles.flex}
          />
        </View>

        <View style={styles.row}>
          <FormField
            label="Quantity available"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="number-pad"
            style={styles.flex}
          />
          <FormField
            label="Expires in (hours)"
            value={hoursUntilExpires}
            onChangeText={setHoursUntilExpires}
            keyboardType="number-pad"
            style={styles.flex}
          />
        </View>

        <FormField
          label="Pickup notes (optional)"
          value={pickupNotes}
          onChangeText={setPickupNotes}
          placeholder="e.g. Pickup between 5–7pm at the counter"
          multiline
          numberOfLines={2}
        />

        {error && (
          <ThemedText type="small" style={{ color: AccentColors.danger }}>
            {error}
          </ThemedText>
        )}

        <AppButton label="Publish listing" onPress={handleSubmit} loading={submitting} />
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.four, paddingBottom: Spacing.six },
  form: { gap: Spacing.three },
  row: { flexDirection: 'row', gap: Spacing.three },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  chip: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one, borderRadius: Spacing.five },
  photoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  photoThumbWrapper: { position: 'relative' },
  photoThumb: { width: 80, height: 80, borderRadius: Spacing.two },
  addPhoto: { alignItems: 'center', justifyContent: 'center' },
  photoRemoveBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: AccentColors.danger,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoRemoveText: { color: '#ffffff' },
});
