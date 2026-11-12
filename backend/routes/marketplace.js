const router = require("express").Router();
const { requireAuth, requireAdmin } = require("../middleware/auth");
const { createMarketplace } = require("../marketplace");
const market = createMarketplace(require("../db"), require("../media"));
const moderation = require("../moderation").createModeration(
  require("../db"),
  market,
  require("../media"),
);
const vendorSettings = require("../vendor-settings").createVendorSettings(
  require("../db"),
  market,
);
router.get("/listings", async (req, res) => res.json(await market.list()));
router.get("/listings/:id", async (req, res) =>
  res.json(await market.get(req.params.id)),
);
router.use(requireAuth);
router.post("/listings/:id/report", async (req, res) =>
  res
    .status(201)
    .json(await moderation.report(req.user, req.params.id, req.body || {})),
);
router.get("/admin/listings", requireAdmin, async (req, res) =>
  res.json(await moderation.list(req.user)),
);
router.post("/admin/listings/:id/remove", requireAdmin, async (req, res) =>
  res.json(await moderation.remove(req.user, req.params.id, req.body || {})),
);
router.post(
  "/admin/listings/:id/dismiss-reports",
  requireAdmin,
  async (req, res) =>
    res.json(await moderation.dismiss(req.user, req.params.id, req.body || {})),
);
router.get("/vendors/me", async (req, res) =>
  res.json(await market.vendor(req.user)),
);
router.put("/vendors/me", async (req, res) =>
  res.json(await market.saveVendor(req.user, req.body || {})),
);
router.get("/vendors/me/listings", async (req, res) =>
  res.json(await market.ownListings(req.user)),
);
router.get("/vendors/me/reservations", async (req, res) =>
  res.json(await market.reservations(req.user, true)),
);
router.get("/vendors/me/pickup-presets", async (req, res) =>
  res.json(await vendorSettings.list(req.user)),
);
router.post("/vendors/me/pickup-presets", async (req, res) =>
  res.status(201).json(await vendorSettings.save(req.user, req.body || {})),
);
router.delete("/vendors/me/pickup-presets/:id", async (req, res) => {
  await vendorSettings.remove(req.user, req.params.id);
  res.sendStatus(204);
});
router.post("/media/uploads", async (req, res) =>
  res.status(201).json(await market.upload(req.user, req.body || {})),
);
router.post("/listings", async (req, res) =>
  res.status(201).json(await market.publish(req.user, req.body || {})),
);
router.post("/listings/:id/close", async (req, res) => {
  await market.close(req.user, req.params.id);
  res.sendStatus(204);
});
router.get("/reservations", async (req, res) =>
  res.json(await market.reservations(req.user)),
);
router.post("/reservations", async (req, res) =>
  res.status(201).json(await market.reserve(req.user, req.body || {})),
);
router.post("/reservations/:id/:action", async (req, res) =>
  res.json(
    await market.changeReservation(req.user, req.params.id, req.params.action),
  ),
);
module.exports = router;
