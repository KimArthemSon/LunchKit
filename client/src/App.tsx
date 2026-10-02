import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Shared";
import { CartProvider } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";
import { AlertProvider } from "./context/AlertContext";
import { GuestOnly, RequireAuth } from "./components/RouteGuards";

// Public & Customer Pages
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import Dashboard from "./pages/customer/Dashboard";
import AuthSuccess from "./pages/AuthSuccess";
import Onboarding from "./pages/Onboarding";
import Checkout from "./pages/customer/Checkout";
import Orders from "./pages/customer/Orders";
import OrderReceipt from "./pages/customer/OrderReceipt";
import Library from "./pages/customer/Library";
// Seller Pages
import SellerDashboard from "./pages/seller/SellerDashboard";
import SellerProducts from "./pages/seller/SellerProducts";
import SellerOrders from "./pages/seller/SellerOrders";
import SellerEarnings from "./pages/seller/SellerEarnings";

export default function App() {
  return (
    <AlertProvider>
    <AuthProvider>
      <CartProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<GuestOnly><Layout><HomePage /></Layout></GuestOnly>} />
            <Route path="/login" element={<GuestOnly><Layout><LoginPage /></Layout></GuestOnly>} />
            <Route path="/signup" element={<GuestOnly><Layout><SignupPage /></Layout></GuestOnly>} />
            
            {/* Auth Redirect Route */}
            <Route path="/auth/success" element={<AuthSuccess />} />
            
            {/* Customer Dashboard Route */}
            <Route path="/dashboard" element={<RequireAuth role="customer"><Dashboard /></RequireAuth>} />
            <Route path="/checkout" element={<RequireAuth role="customer"><Checkout /></RequireAuth>} />
            <Route path="/orders" element={<RequireAuth role="customer"><Orders /></RequireAuth>} />
            <Route path="/orders/:id" element={<RequireAuth role="customer"><OrderReceipt /></RequireAuth>} />
            <Route path="/library" element={<RequireAuth role="customer"><Library /></RequireAuth>} />
            <Route path="/onboarding" element={<RequireAuth><Onboarding /></RequireAuth>} />
            {/* Seller Dashboard Routes */}
            <Route path="/seller/dashboard" element={<RequireAuth role="seller"><SellerDashboard /></RequireAuth>} />
            <Route path="/seller/products" element={<RequireAuth role="seller"><SellerProducts /></RequireAuth>} />
            <Route path="/seller/orders" element={<RequireAuth role="seller"><SellerOrders /></RequireAuth>} />
            <Route path="/seller/earnings" element={<RequireAuth role="seller"><SellerEarnings /></RequireAuth>} />

            {/* Unknown URLs → "/" (which sends logged-in users to their dashboard) */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </AuthProvider>
    </AlertProvider>
  );
}