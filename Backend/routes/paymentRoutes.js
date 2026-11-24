const express = require("express");
const mongoose = require("mongoose");
const paymentController = require("../controller/paymentController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// The callback is public because Razorpay redirects the browser here. The
// controller verifies its signature and fetches payment state from Razorpay.
router.post("/verify", paymentController.verifyPaymentLinkCallback);

router.post("/:id", protect, (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ message: "Invalid checkout ID" });
    }
    next();
}, paymentController.createPaymentLink);

module.exports = router;
