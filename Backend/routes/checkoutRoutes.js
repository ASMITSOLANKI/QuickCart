const express = require("express");
const Checkout = require("../models/Checkout");
const Cart = require("../models/Cart");
const Product = require("../models/Product");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// Build a checkout snapshot from the server-side cart and current catalog prices.
router.post("/", protect, async (req, res) => {
    const { shippingAddress } = req.body;
    const addressFields = ["firstName", "lastName", "address", "city", "postalCode", "country", "phone"];
    if (!shippingAddress || addressFields.some((field) => !String(shippingAddress[field] || "").trim())) {
        return res.status(400).json({ message: "Complete all shipping fields before continuing." });
    }

    try {
        const cart = await Cart.findOne({ user: req.user._id });
        if (!cart || !Array.isArray(cart.products) || cart.products.length === 0) {
            return res.status(400).json({ message: "Your cart is empty." });
        }

        const checkoutItems = [];
        for (const cartItem of cart.products) {
            const quantity = Number(cartItem.quantity);
            if (!Number.isInteger(quantity) || quantity < 1) {
                return res.status(400).json({ message: "The cart contains an invalid quantity." });
            }

            const product = await Product.findById(cartItem.productId);
            if (!product) {
                return res.status(400).json({ message: "A product in your cart is no longer available." });
            }
            if (quantity > product.countInStock) {
                return res.status(409).json({ message: `${product.name} does not have enough stock.` });
            }
            if (!product.sizes.includes(cartItem.size) || !product.colors.includes(cartItem.color)) {
                return res.status(400).json({ message: `The selected options for ${product.name} are no longer available.` });
            }

            checkoutItems.push({
                productId: product._id,
                name: product.name,
                image: product.images?.[0]?.url || cartItem.image,
                price: product.price,
                quantity,
                size: cartItem.size,
                color: cartItem.color,
            });
        }

        const totalPrice = checkoutItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const newCheckout = await Checkout.create({
            user: req.user._id,
            checkoutItems,
            shippingAddress: Object.fromEntries(addressFields.map((field) => [field, String(shippingAddress[field]).trim()])),
            paymentMethod: "Razorpay",
            currency: "INR",
            totalPrice: Number(totalPrice.toFixed(2)),
            paymentStatus: "Pending",
            isPaid: false,
        });

        return res.status(201).json(newCheckout);
    } catch (error) {
        console.error("Error creating checkout session", error);
        return res.status(500).json({ message: "Could not create checkout. Please try again." });
    }
});

module.exports = router;
