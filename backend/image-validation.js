const { imageSize } = require("image-size");
const { fail } = require("./marketplace");
function validateImage(bytes, expectedType) {
  let data;
  try {
    data = imageSize(bytes);
  } catch {
    fail(400, "This file is not a readable JPEG, PNG or WebP photo.");
  }
  const type = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" }[
    data.type
  ];
  if (!type || type !== expectedType)
    fail(
      400,
      "The file contents do not match its image type. Choose a JPEG, PNG or WebP photo.",
    );
  if (
    !data.width ||
    !data.height ||
    data.width > 12000 ||
    data.height > 12000 ||
    data.width * data.height > 40000000
  )
    fail(400, "This photo is too large. Choose a smaller image.");
  return { width: data.width, height: data.height };
}
module.exports = { validateImage };
