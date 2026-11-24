import { useState } from "react";

const PaymentButton = ({ checkoutId }) => {
  const [paying, setPaying] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  const handlePayment = async () => {
    setPaymentError("");
    setPaying(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/payment/${checkoutId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("userToken")}`,
        },
      });
      const data = await response.json();
      if (!response.ok || !data.payment_link_url) {
        throw new Error(data.message || "Could not start payment. Please try again.");
      }

      window.location.assign(data.payment_link_url);
    } catch (error) {
      setPaymentError(error.message || "Payment initiation failed. Please try again.");
      setPaying(false);
    }
  };

  return (
    <div>
      {paymentError && <p role="alert" className="text-red-600 mb-2">{paymentError}</p>}
      <button
        type="button"
        className={`w-full bg-blue-600 text-white py-3 rounded ${paying ? "opacity-50 cursor-not-allowed" : ""}`}
        disabled={paying}
        onClick={handlePayment}
      >
        {paying ? "Redirecting to Razorpay..." : "Pay Now"}
      </button>
    </div>
  );
};

export default PaymentButton;
