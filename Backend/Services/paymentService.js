const crypto = require("crypto");
const razorpay = require("../config/razorpayClient");
const Checkout = require("../models/Checkout");
const Order = require("../models/Order");
const Cart = require("../models/Cart");

const createPaymentLink = async (checkoutId, userId) => {
    const checkout = await Checkout.findOne({ _id: checkoutId, user: userId }).populate("user");
    if (!checkout) {
        const error = new Error("Checkout not found");
        error.statusCode = 404;
        throw error;
    }
    if (checkout.isPaid || checkout.isFinalized) {
        const error = new Error("This checkout has already been paid.");
        error.statusCode = 409;
        throw error;
    }

    if (checkout.paymentLinkId && checkout.paymentLinkUrl) {
        try {
            const existingLink = await razorpay.paymentLink.fetch(checkout.paymentLinkId);
            if (existingLink.status === "created") {
                return { paymentLinkId: existingLink.id, payment_link_url: existingLink.short_url };
            }
        } catch (error) {
            console.warn("Could not reuse previous Razorpay payment link:", error.message);
        }
    }

    const referenceId = crypto.randomUUID();
    const customerName = [checkout.shippingAddress.firstName, checkout.shippingAddress.lastName]
        .filter(Boolean)
        .join(" ") || checkout.user.name;
    const paymentLink = await razorpay.paymentLink.create({
        amount: Math.round(checkout.totalPrice * 100),
        currency: checkout.currency || "INR",
        accept_partial: false,
        reference_id: referenceId,
        description: `QuickBasket checkout ${checkout._id}`,
        customer: {
            name: customerName,
            contact: checkout.shippingAddress.phone,
            email: checkout.user.email,
        },
        notify: { sms: true, email: true },
        reminder_enable: false,
        callback_url: `${process.env.FRONTEND_URL || "http://127.0.0.1:5173"}/order-confirmation`,
        callback_method: "get",
    });

    checkout.paymentLinkId = paymentLink.id;
    checkout.paymentLinkReferenceId = paymentLink.reference_id || referenceId;
    checkout.paymentLinkUrl = paymentLink.short_url;
    await checkout.save();

    return { paymentLinkId: paymentLink.id, payment_link_url: paymentLink.short_url };
};

const verifyPaymentLinkCallback = async (callback) => {
    const {
        razorpay_payment_id: paymentId,
        razorpay_payment_link_id: paymentLinkId,
        razorpay_payment_link_reference_id: referenceId,
        razorpay_payment_link_status: linkStatus,
        razorpay_signature: signature,
    } = callback;

    if (!paymentId || !paymentLinkId || !referenceId || !linkStatus || !signature) {
        const error = new Error("Payment callback is missing required fields.");
        error.statusCode = 400;
        throw error;
    }

    const payload = [paymentLinkId, referenceId, linkStatus, paymentId].join("|");
    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(payload)
        .digest("hex");
    const expected = Buffer.from(expectedSignature, "hex");
    const received = Buffer.from(signature, "hex");
    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
        const error = new Error("Razorpay payment signature is invalid.");
        error.statusCode = 400;
        throw error;
    }
    if (linkStatus !== "paid") {
        const error = new Error("Payment has not been completed.");
        error.statusCode = 402;
        throw error;
    }

    const checkout = await Checkout.findOne({
        paymentLinkId,
        paymentLinkReferenceId: referenceId,
    });
    if (!checkout) {
        const error = new Error("Checkout not found for this payment link.");
        error.statusCode = 404;
        throw error;
    }

    // Confirm callback claims against Razorpay's API before recording payment.
    const [paymentLink, payment] = await Promise.all([
        razorpay.paymentLink.fetch(paymentLinkId),
        razorpay.payments.fetch(paymentId),
    ]);
    const expectedAmount = Math.round(checkout.totalPrice * 100);
    if (
        paymentLink.status !== "paid" ||
        paymentLink.reference_id !== referenceId ||
        paymentLink.amount !== expectedAmount ||
        Number(paymentLink.amount_paid) !== expectedAmount ||
        payment.status !== "captured" ||
        payment.amount !== expectedAmount
    ) {
        const error = new Error("Razorpay payment could not be confirmed.");
        error.statusCode = 402;
        throw error;
    }

    let order = await Order.findOne({ checkout: checkout._id });
    if (!order) {
        try {
            order = await Order.create({
                checkout: checkout._id,
                user: checkout.user,
                orderItems: checkout.checkoutItems,
                shippingAddress: checkout.shippingAddress,
                paymentMethod: "Razorpay",
                totalPrice: checkout.totalPrice,
                currency: checkout.currency || "INR",
                isPaid: true,
                paidAt: new Date(),
                isDelivered: false,
                paymentStatus: "paid",
                paymentDetails: { paymentId, paymentLinkId, status: payment.status },
                status: "Processing",
            });
        } catch (error) {
            if (error.code !== 11000) throw error;
            order = await Order.findOne({ checkout: checkout._id });
            if (!order) throw error;
        }
    }

    checkout.isPaid = true;
    checkout.paymentStatus = "paid";
    checkout.paymentDetails = { paymentId, paymentLinkId, status: payment.status };
    checkout.paidAt = checkout.paidAt || new Date();
    checkout.isFinalized = true;
    checkout.finalizedAt = checkout.finalizedAt || new Date();
    checkout.orderId = order._id;
    await checkout.save();
    await Cart.findOneAndDelete({ user: checkout.user });

    return { orderId: order._id, paymentStatus: "paid" };
};

module.exports = { createPaymentLink, verifyPaymentLinkCallback };
