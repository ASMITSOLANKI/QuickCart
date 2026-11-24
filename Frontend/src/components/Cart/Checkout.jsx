import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useDispatch, useSelector } from "react-redux";
import { createCheckout } from "../../redux/slices/checkoutSlice";

import PaymentButton from "../Common/PaymentButton";

// const cart = {
//   products: [
//         {
//             name:"T-Shirt",
//             size:"M",
//             color:"Red",
//             price:150,
//             image:"https://picsum.photos/200?random=1",
//         },
//         {
//             name:"Jeans",
//             size:"L",
//             color:"Blue",
//             price:75,
//             image:"https://picsum.photos/200?random=2",
//         }
//     ],
//     totalPrice: 215,
// };




const Checkout = () => {

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const {cart, loading, error} = useSelector((state) => state.cart);
  const {user} = useSelector((state) => state.auth);
  const {checkout: checkoutDetails, error: checkoutError} = useSelector((state) => state.checkout);
  const summaryItems = checkoutDetails?.checkoutItems || cart?.products || [];
  const summaryTotal = checkoutDetails?.totalPrice ?? cart?.totalPrice ?? 0;

  const [checkoutId, setCheckoutId] = useState(null);
  const [creatingCheckout, setCreatingCheckout] = useState(false);
  const [createCheckoutError, setCreateCheckoutError] = useState("");
  const [shippingAddress, setShippingAddress] = useState({
    firstName: "",
    lastName: "",
    address:"",
    city:"",
    postalCode:"",
    country:"",
    phone:"",
  });

  // Ensure cart is loaded before proceeding
  useEffect(() => {
    if(!cart || !cart.products || cart.products.length === 0){
      navigate("/");
    }
  }, [cart, navigate]);

  const handleCreateCheckout = async (e) => {
    e.preventDefault();
    setCreatingCheckout(true);
    setCreateCheckoutError("");
    try {
      const checkout = await dispatch(createCheckout({shippingAddress})).unwrap();
      setCheckoutId(checkout._id);
    } catch (error) {
      setCreateCheckoutError(error.message || "Could not prepare checkout.");
    } finally {
      setCreatingCheckout(false);
    }
  };   

  if(loading) return <p>Loading cart ...</p>;
  if(error) return <p>Error: {error}</p>;
  if(!cart || !cart.products || cart.products.length===0){
    return <p>Your cart is empty</p>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto py-10 px-6 tracking-tighter">
      {/* Left Section */}
      <div className="bg-white rounded-lg p-6">
        <h2 className="text-2xl uppercase mb-6">Checkout</h2>
        <form onSubmit={handleCreateCheckout} >
          <h3 className="text-lg mb-4">Contact Details</h3>
          <div className="mb-4">
            <label className="block text-gray-700">Email</label>
            <input type="email" 
            value={user ? user.email : ""}
            className="w-full p-2 border rounded bg-gray-50"
            disabled
            />
          </div>
          <h3 className="text-lg mb-4">Delivery</h3>
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="blcok text-gray-700">First Name</label>
              <input type="text" 
              value={shippingAddress.firstName}
              onChange={(e)=> 
              setShippingAddress({...shippingAddress,firstName: e.target.value})}
              className="w-full p-2 border rounded"
              required
              />
            </div>
            <div>
              <label className="blcok text-gray-700">Last Name</label>
              <input type="text" 
              value={shippingAddress.lastName}
              onChange={(e)=> 
              setShippingAddress({...shippingAddress,lastName: e.target.value})}
              className="w-full p-2 border rounded"
              required
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700">Address</label>
            <input type="text" 
              value={shippingAddress.address}
              onChange={(e)=> 
              setShippingAddress({...shippingAddress,address: e.target.value})}
              className="w-full p-2 border rounded"
              required
              /> 
          </div>
          <div className="mb-4 grid grid-cols-2 gap-4">
            <div>
              <label className="blcok text-gray-700">City</label>
              <input type="text" 
              value={shippingAddress.city}
              onChange={(e)=> 
              setShippingAddress({...shippingAddress,city: e.target.value})}
              className="w-full p-2 border rounded"
              required
              />
            </div>
            <div>
              <label className="blcok text-gray-700">Postal Code</label>
              <input type="text" 
              value={shippingAddress.postalCode}
              onChange={(e)=> 
              setShippingAddress({...shippingAddress,postalCode: e.target.value})}
              className="w-full p-2 border rounded"
              required
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-gray-700">Country</label>
            <input type="text" 
              value={shippingAddress.country}
              onChange={(e)=> 
              setShippingAddress({...shippingAddress,country: e.target.value})}
              className="w-full p-2 border rounded"
              required
              /> 
          </div>
          <div className="mb-4">
            <label className="block text-gray-700">Phone</label>
            <input type="tel" 
              value={shippingAddress.phone}
              onChange={(e)=> 
              setShippingAddress({...shippingAddress,phone: e.target.value})}
              className="w-full p-2 border rounded"
              required
              /> 
          </div>
          <div className="mt-6">
            {createCheckoutError && <p role="alert" className="text-red-600 mb-3">{createCheckoutError}</p>}
            {checkoutError && !createCheckoutError && <p role="alert" className="text-red-600 mb-3">{checkoutError}</p>}
            {!checkoutId ? (
              <button type="submit" disabled={creatingCheckout} className="w-full bg-black text-white py-3 rounded disabled:opacity-50">
                  {creatingCheckout ? "Preparing checkout..." : "Continue to payment"}</button>
            ) : (
              <div>
                <h3 className="text-lg mb-4">Pay with Razorpay</h3>
                <PaymentButton checkoutId={checkoutId} />
              </div>
            )}
          </div>
        </form>
      </div>
      {/* Right Section */}
      <div className="bg-gray-50 p-6 rounded-lg">
        <h3 className="text-lg mb-4">Order Summary</h3>
        <div className="border-t py-4 mb-4">
          {summaryItems.map((product, index) => (
            <div
            key={`${product.productId}-${product.size}-${product.color}-${index}`}
            className="flex items-start justify-between py-2 border-b">
              <div className="flex items-start">
                <img src={product.image} alt={product.name} 
                className="w-20 h-24 object-cover mr-4"/>
                <div>
                  <h3 className="text-md">{product.name}</h3>
                  <p className="text-gray-500">Size:{product.size}</p>
                  <p className="text-gray-500">Color: {product.color}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl">₹{Number(product.price).toLocaleString("en-IN")}</p>
                <p className="text-sm text-gray-500">Qty: {product.quantity}</p>
                <p className="text-sm">₹{(Number(product.price) * Number(product.quantity)).toLocaleString("en-IN")}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center text-lg mb-4">
          <p>subtotal</p>
          <p>₹{Number(summaryTotal).toLocaleString("en-IN")}</p>
        </div>
        <div className="flex justify-between items-center text-lg">
          <p>Shipping</p>
          <p>Free</p>
        </div>
        <div className="flex justify-between items-center text-lg mt-4 border-t pt-4">
          <p>Total</p>
          <p>₹{Number(summaryTotal).toLocaleString("en-IN")}</p>
        </div>
      </div>
    </div>
  )
}

export default Checkout
