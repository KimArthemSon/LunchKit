import { useState } from "react";
import type { MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { I } from "../Shared";
import type { Product } from "../../api/products";

interface Props {
  product: Product;
  size?: "sm" | "lg";
  onDone?: () => void; // e.g. close a modal after acting
}

// Add / In cart / Owned — one button that knows the product's state for this user
export default function AddToCartButton({ product, size = "sm", onDone }: Props) {
  const { addToCart, isInCart, isOwned, setIsCartOpen } = useCart();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const owned = isOwned(product._id);
  const inCart = isInCart(product._id);

  const handleClick = async (e: MouseEvent) => {
    e.stopPropagation();
    if (owned) {
      navigate("/library");
    } else if (inCart) {
      setIsCartOpen(true);
    } else {
      setBusy(true);
      await addToCart(product);
      setBusy(false);
    }
    onDone?.();
  };

  const sizing = size === "lg" ? "px-6 py-3 rounded-full text-base" : "px-4 py-2 rounded-full text-sm";
  const style = owned
    ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
    : inCart
      ? "bg-white text-stone-900 border border-stone-300 hover:border-stone-900"
      : "bg-stone-900 hover:bg-stone-700 text-white";

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      // Only animate the press: state colours (Add → Owned) must switch instantly, not fade
      className={`flex items-center gap-1.5 font-medium transition-transform active:scale-95 disabled:opacity-60 ${sizing} ${style}`}
    >
      <I name={owned ? "Download" : inCart ? "Check" : "CreditCard"} size={size === "lg" ? 16 : 14} />
      {owned ? "Owned" : inCart ? "In cart" : busy ? "Adding..." : size === "lg" ? "Add to Cart" : "Add"}
    </button>
  );
}
