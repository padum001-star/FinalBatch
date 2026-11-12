const router = require("express").Router();
const { requireAuth } = require("../middleware/auth");
const chat = require("../messaging").createMessaging(require("../db"));
const { rateLimit } = require("express-rate-limit");
router.use(requireAuth);
const sendLimit = rateLimit({
  windowMs: 60000,
  limit: 30,
  keyGenerator: (req) => req.user.user_id,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many messages. Wait a minute and try again." },
});
router.get("/", async (req, res) => res.json(await chat.list(req.user)));
router.post("/", async (req, res) =>
  res.status(201).json(await chat.open(req.user, req.body || {})),
);
router.get("/:id/messages", async (req, res) =>
  res.json(await chat.history(req.user, req.params.id, req.query.before)),
);
router.post("/:id/messages", sendLimit, async (req, res) =>
  res
    .status(201)
    .json(await chat.send(req.user, req.params.id, req.body || {})),
);
module.exports = router;
