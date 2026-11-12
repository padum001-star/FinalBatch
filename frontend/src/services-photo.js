import { Image } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
const inputTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];
export async function selectListingPhoto(source) {
  let result;
  if (source === "camera") {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted)
      throw new Error(
        "Allow camera access in your phone settings, or choose a photo from your gallery.",
      );
    result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });
  } else if (source === "files") {
    result = await DocumentPicker.getDocumentAsync({
      type: ["image/jpeg", "image/png", "image/webp"],
      copyToCacheDirectory: true,
      multiple: false,
    });
  } else
    result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.9,
    });
  if (result.canceled) return null;
  const asset = result.assets[0];
  if (asset.mimeType && !inputTypes.includes(asset.mimeType))
    throw new Error("Choose a JPEG, PNG or WebP photo.");
  if ((asset.size || asset.fileSize || 0) > 20 * 1024 * 1024)
    throw new Error("Choose a photo smaller than 20 MB.");
  try {
    const size = await new Promise((resolve, reject) =>
      Image.getSize(
        asset.uri,
        (width, height) => resolve({ width, height }),
        reject,
      ),
    );
    const context = ImageManipulator.manipulate(asset.uri);
    if (Math.max(size.width, size.height) > 1600)
      context.resize(
        size.width >= size.height ? { width: 1600 } : { height: 1600 },
      );
    const rendered = await context.renderAsync();
    const optimized = await rendered.saveAsync({
      format: SaveFormat.JPEG,
      compress: 0.8,
    });
    const blob = await (await fetch(optimized.uri)).blob();
    if (blob.size > 8 * 1024 * 1024)
      throw new Error(
        "The optimized photo is still too large. Choose a smaller photo.",
      );
    return { uri: optimized.uri, blob, contentType: "image/jpeg" };
  } catch (e) {
    throw new Error(
      e.message?.includes("too large")
        ? e.message
        : "This photo could not be opened. Choose a JPEG, PNG or WebP image.",
    );
  }
}
