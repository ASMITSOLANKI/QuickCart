const paymentService = require("../Services/paymentService");

const createPaymentLink = async (req, res) => {
    try {
        const paymentLink = await paymentService.createPaymentLink(req.params.id, req.user._id);
        return res.status(200).json(paymentLink);
    } catch (error) {
        console.error("Could not create Razorpay payment link:", error);
        return res.status(error.statusCode || 500).json({
            message: error.statusCode ? error.message : "Could not start payment. Please try again.",
        });
    }
};

const verifyPaymentLinkCallback = async (req, res) => {
    try {
        const result = await paymentService.verifyPaymentLinkCallback(req.body);
        return res.status(200).json(result);
    } catch (error) {
        console.error("Could not verify Razorpay payment callback:", error.message);
        return res.status(error.statusCode || 500).json({
            message: error.statusCode ? error.message : "Could not verify payment. Please contact support.",
        });
    }
};

module.exports = { createPaymentLink, verifyPaymentLinkCallback };
