import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchOrderDetails } from "../redux/slices/orderSlice";
import { clearCart } from "../redux/slices/cartSlice";

const OrderConfirmationPage = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const location = useLocation();
    const { orderDetails, loading, error } = useSelector((state) => state.orders);
    const [verificationLoading, setVerificationLoading] = useState(false);
    const [verificationError, setVerificationError] = useState("");
    const processedCallback = useRef("");

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const callback = {
            razorpay_payment_id: params.get("razorpay_payment_id"),
            razorpay_payment_link_id: params.get("razorpay_payment_link_id"),
            razorpay_payment_link_reference_id: params.get("razorpay_payment_link_reference_id"),
            razorpay_payment_link_status: params.get("razorpay_payment_link_status"),
            razorpay_signature: params.get("razorpay_signature"),
        };
        const hasCallback = Object.values(callback).some(Boolean);

        if (hasCallback) {
            if (Object.values(callback).some((value) => !value)) {
                setVerificationError("The payment callback is incomplete. Check your orders before trying again.");
                return;
            }
            if (processedCallback.current === location.search) return;
            processedCallback.current = location.search;
            setVerificationLoading(true);
            setVerificationError("");

            fetch(`${import.meta.env.VITE_BACKEND_URL}/api/payment/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(callback),
            })
                .then(async (response) => {
                    const data = await response.json();
                    if (!response.ok) throw new Error(data.message || "Payment could not be verified.");
                    return data;
                })
                .then(async ({ orderId }) => {
                    await dispatch(fetchOrderDetails(orderId)).unwrap();
                    dispatch(clearCart());
                    localStorage.removeItem("orderId");
                })
                .catch((verifyError) => {
                    setVerificationError(verifyError.message || "Payment could not be verified.");
                })
                .finally(() => setVerificationLoading(false));
            return;
        }

        const savedOrderId = localStorage.getItem("orderId");
        if (savedOrderId && !orderDetails) {
            dispatch(fetchOrderDetails(savedOrderId));
        } else if (!savedOrderId && !orderDetails) {
            navigate("/my-orders", { replace: true });
        }
    }, [dispatch, location.search, navigate, orderDetails]);

    if (verificationLoading || loading) {
        return <p className="max-w-4xl mx-auto p-6 text-center text-gray-500">Verifying payment and loading your order...</p>;
    }
    if (verificationError || error) {
        return (
            <div className="max-w-4xl mx-auto p-6 text-center">
                <h1 className="text-2xl font-semibold mb-3">We couldn’t confirm this payment</h1>
                <p role="alert" className="text-red-600">{verificationError || error}</p>
                <p className="mt-4 text-gray-600">Your order is created only after Razorpay confirms payment. Check My Orders for the latest status.</p>
                <button className="mt-5 underline" onClick={() => navigate("/my-orders")}>Go to My Orders</button>
            </div>
        );
    }
    if (!orderDetails) return <p className="max-w-4xl mx-auto p-6 text-center">Loading order details...</p>;

    const calculateEstimatedDelivery = (createdAt) => {
        const orderDate = new Date(createdAt);
        orderDate.setDate(orderDate.getDate() + 10);
        return orderDate.toLocaleDateString();
    };

    return (
        <div className="max-w-4xl mx-auto p-6 bg-white">
            <h1 className="text-4xl font-bold text-center text-emerald-700 mb-8">Payment confirmed</h1>
            <div className="p-6 rounded-lg border">
                <div className="flex justify-between mb-10">
                    <div>
                        <h2 className="text-xl font-semibold">Order ID: {orderDetails._id}</h2>
                        <p className="text-gray-500">Order date: {new Date(orderDetails.createdAt).toLocaleDateString()}</p>
                    </div>
                    <p className="text-emerald-700 text-sm">Estimated delivery: {calculateEstimatedDelivery(orderDetails.createdAt)}</p>
                </div>

                <div className="mb-10">
                    {orderDetails.orderItems.map((item) => (
                        <div key={`${item.productId}-${item.size}-${item.color}`} className="flex items-center mb-4">
                            <img src={item.image} alt={item.name} className="h-16 w-16 object-cover rounded-md mr-4" />
                            <div>
                                <h4 className="font-semibold">{item.name}</h4>
                                <p className="text-sm text-gray-500">{item.color} | {item.size}</p>
                            </div>
                            <div className="ml-auto text-right">
                                <p>₹{Number(item.price).toLocaleString("en-IN")}</p>
                                <p className="text-sm text-gray-500">Qty: {item.quantity}</p>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-8">
                    <div>
                        <h4 className="text-lg font-semibold mb-2">Payment</h4>
                        <p className="text-gray-600">Razorpay · Paid</p>
                        <p className="mt-3 font-semibold">Total: ₹{Number(orderDetails.totalPrice).toLocaleString("en-IN")}</p>
                    </div>
                    <div>
                        <h4 className="text-lg font-semibold mb-2">Delivery</h4>
                        <p className="text-gray-600">
                            {orderDetails.shippingAddress.address}<br />
                            {orderDetails.shippingAddress.city}, {orderDetails.shippingAddress.postalCode}, {orderDetails.shippingAddress.country}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderConfirmationPage;
