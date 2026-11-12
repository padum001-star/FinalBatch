const router = require("express").Router();
const pool = require("../db");
const { requireAuth } = require("../middleware/auth");
const { uuid } = require("../marketplace");
router.use(requireAuth);
router.get("/", async (req, res) => {
  const { rows } = await pool.query(
    "SELECT place_id FROM saved_places WHERE user_id=$1 ORDER BY created_at DESC",
    [req.user.user_id],
  );
  res.json({ placeIds: rows.map((r) => r.place_id) });
});
async function placeId(id) {
  const {
    rows: [row],
  } = await pool.query(
    "SELECT vendor_id FROM listings WHERE listing_id=$1 AND published_by_vendor",
    [uuid(id)],
  );
  return row?.vendor_id;
}
router.put("/:listingId", async (req, res) => {
  const id = await placeId(req.params.listingId);
  if (!id) return res.status(404).json({ error: "Listing not found." });
  await pool.query(
    "INSERT INTO saved_places(user_id,place_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
    [req.user.user_id, id],
  );
  res.sendStatus(204);
});
router.delete("/:listingId", async (req, res) => {
  const id = await placeId(req.params.listingId);
  if (!id) return res.status(404).json({ error: "Listing not found." });
  await pool.query(
    "DELETE FROM saved_places WHERE user_id=$1 AND place_id=$2",
    [req.user.user_id, id],
  );
  res.sendStatus(204);
});
module.exports = router;
