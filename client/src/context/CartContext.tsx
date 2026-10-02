import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Product } from "../api/products";
import {
  getCart, addCartItem, removeCartItem, clearCart as clearCartApi,
  EMPTY_SUMMARY, type CartResponse, type PriceSummary,
} from "../api/cart";
import { getLibrary } from "../api/orders";
import { ApiError, errorMessage } from "../api/http";
import { useAuth } from "./AuthContext";
import { useAlert } from "./AlertContext";

interface CartContextType {
  items: Product[];
  summary: PriceSummary;
  cartCount: number;
  ownedCount: number; // Products in the user's library
  isLoading: boolean;
  isInCart: (productId: string) => boolean;
  isOwned: (productId: string) => boolean;
  addToCart: (product: Product) => Promise<void>;
  removeFromCart: (productId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<CartResponse | null>;
  applyCart: (cart: CartResponse) => void; // Use a cart returned by the server (e.g. from a checkout 409)
  markPurchased: (productIds: string[]) => void;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// The cart lives on the server (per user, cross-device). This context mirrors it and
// tracks which products the user already owns so the UI can show "Owned" instead of "Add".
export function CartProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  const alert = useAlert();
  const [data, setData] = useState<{ token: string; cart: CartResponse; owned: Set<string> } | null>(null);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const showNotices = useCallback((cart: CartResponse) => {
    cart.notices.forEach((notice) => alert.warning(notice, { title: "Cart updated" }));
  }, [alert]);

  // Load cart + owned products whenever the logged-in user changes
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    Promise.all([getCart(token), getLibrary(token)])
      .then(([cart, library]) => {
        if (cancelled) return;
        setData({ token, cart, owned: new Set(library.map((i) => String(i.productId))) });
        showNotices(cart);
      })
      .catch(() => {
        if (!cancelled) setData({ token, cart: { items: [], summary: EMPTY_SUMMARY, notices: [] }, owned: new Set() });
      });
    return () => { cancelled = true; };
  }, [token, showNotices]);

  // Ignore data that belongs to a previous session
  const current = token && data?.token === token ? data : null;
  const items = useMemo(() => current?.cart.items ?? [], [current]);
  const owned = current?.owned;

  const applyCart = useCallback((cart: CartResponse) => {
    setData((prev) => (prev ? { ...prev, cart } : prev));
    showNotices(cart);
  }, [showNotices]);

  const isInCart = useCallback((id: string) => items.some((p) => p._id === id), [items]);
  const isOwned = useCallback((id: string) => !!owned?.has(id), [owned]);

  const markPurchased = useCallback((productIds: string[]) => {
    setData((prev) => {
      if (!prev) return prev;
      const ids = new Set(productIds);
      const remaining = prev.cart.items.filter((p) => !ids.has(p._id));
      return {
        ...prev,
        owned: new Set([...prev.owned, ...productIds]),
        // Server already cleared these; reflect it locally until the next refresh
        cart: { ...prev.cart, items: remaining, summary: remaining.length ? prev.cart.summary : EMPTY_SUMMARY },
      };
    });
  }, []);

  const addToCart = useCallback(async (product: Product) => {
    if (!token) return alert.info("Log in to add items to your cart.");
    if (isOwned(product._id)) return alert.info(`You already own "${product.title}". Find it in your Downloads.`);
    if (isInCart(product._id)) return setIsCartOpen(true);
    try {
      applyCart(await addCartItem(token, product._id));
      setIsCartOpen(true);
    } catch (err) {
      if (err instanceof ApiError && err.code === "ALREADY_OWNED") markPurchased([product._id]);
      alert.error(errorMessage(err), { title: "Couldn't add to cart" });
    }
  }, [token, alert, isOwned, isInCart, applyCart, markPurchased]);

  const removeFromCart = useCallback(async (productId: string) => {
    if (!token) return;
    try {
      applyCart(await removeCartItem(token, productId));
    } catch (err) {
      alert.error(errorMessage(err), { title: "Couldn't remove item" });
    }
  }, [token, alert, applyCart]);

  const clearCart = useCallback(async () => {
    if (!token) return;
    try {
      applyCart(await clearCartApi(token));
    } catch (err) {
      alert.error(errorMessage(err), { title: "Couldn't clear cart" });
    }
  }, [token, alert, applyCart]);

  const refreshCart = useCallback(async () => {
    if (!token) return null;
    try {
      const cart = await getCart(token);
      applyCart(cart);
      return cart;
    } catch (err) {
      alert.error(errorMessage(err), { title: "Couldn't load cart" });
      return null;
    }
  }, [token, alert, applyCart]);

  return (
    <CartContext.Provider
      value={{
        items,
        summary: current?.cart.summary ?? EMPTY_SUMMARY,
        cartCount: items.length,
        ownedCount: owned?.size ?? 0,
        isLoading: !!token && !current,
        isInCart,
        isOwned,
        addToCart,
        removeFromCart,
        clearCart,
        refreshCart,
        applyCart,
        markPurchased,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within CartProvider");
  return context;
}
