import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useAlert } from "../../context/AlertContext";
import { I } from "../Shared";
import BillSummary from "./BillSummary";
import { assetUrl, sellerName } from "../../api/products";
import { formatMoney } from "../../utils/money";

export default function CartSidebar() {
  const { items, summary, isCartOpen, setIsCartOpen, removeFromCart, clearCart } = useCart();
  const alert = useAlert();
  const navigate = useNavigate();

  if (!isCartOpen) return null;

  const handleClear = async () => {
    const ok = await alert.confirm({
      title: "Clear cart?",
      message: `Remove all ${items.length} items from your cart?`,
      confirmText: "Clear cart",
      danger: true,
    });
    if (ok) await clearCart();
  };

  const goToCheckout = () => {
    setIsCartOpen(false);
    navigate("/checkout");
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
        onClick={() => setIsCartOpen(false)}
      />

      {/* Sidebar */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-black/95 backdrop-blur-xl border-l border-white/10 z-50 flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <div>
            <h2 className="text-xl font-black text-white">Your Cart</h2>
            <p className="text-sm text-gray-400">{items.length} {items.length === 1 ? "item" : "items"}</p>
          </div>
          <button
            onClick={() => setIsCartOpen(false)}
            className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          >
            <I name="X" size={20} />
          </button>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {items.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                <I name="CreditCard" size={32} className="text-gray-500" />
              </div>
              <p className="text-gray-400 font-medium">Your cart is empty</p>
              <p className="text-gray-600 text-sm mt-1">
                Add some awesome assets!
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item._id}
                className="flex gap-4 p-3 rounded-xl bg-white/5 border border-white/10"
              >
                {item.previewImageUrl ? (
                  <img
                    src={assetUrl(item.previewImageUrl)}
                    alt={item.title}
                    className="w-20 h-20 rounded-lg object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-lg bg-white/10 flex items-center justify-center text-gray-500">
                    <I name="Image" size={24} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-sm truncate">
                    {item.title}
                  </h3>
                  <p className="text-purple-400 text-xs font-medium mt-0.5">
                    {item.category}
                    {sellerName(item) && <span className="text-gray-500"> · by {sellerName(item)}</span>}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[11px] text-gray-500 flex items-center gap-1">
                      <I name="Download" size={12} /> Instant download
                    </span>
                    <span className="text-white font-bold">
                      {formatMoney(Math.round(item.price * 100), summary.currency)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => removeFromCart(item._id)}
                  aria-label={`Remove ${item.title}`}
                  className="self-start p-1.5 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
                >
                  <I name="X" size={16} />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="border-t border-white/10 px-6 py-5 space-y-4">
            <BillSummary {...summary} variant="dark" />
            <button
              onClick={goToCheckout}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold py-3.5 rounded-xl transition-all hover:shadow-lg hover:shadow-purple-500/30 active:scale-[0.98]"
            >
              <I name="Shield" size={16} /> Proceed to Checkout
            </button>
            <button
              onClick={handleClear}
              className="w-full text-sm text-gray-400 hover:text-red-400 transition-colors"
            >
              Clear Cart
            </button>
          </div>
        )}
      </div>
    </>
  );
}
