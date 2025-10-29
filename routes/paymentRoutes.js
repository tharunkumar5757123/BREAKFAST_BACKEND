const express = require("express");
const {
  createCheckoutSession,
  verifyPayment,
  getReceipt,
} = require("../controllers/paymentControllers");

const router = express.Router();

router.post("/create-checkout-session", createCheckoutSession);
router.get("/verify/:sessionId", verifyPayment);
router.get("/receipt/:sessionId", getReceipt);

module.exports = router;
