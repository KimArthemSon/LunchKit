import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAlert } from "../context/AlertContext";
import { I } from "../components/Shared";

export default function Onboarding() {
  const navigate = useNavigate();
  const { login, token } = useAuth();
  const alert = useAlert();
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleSelection = async (role: "customer" | "seller") => {
    if (!token) return navigate("/login");
    
    setIsLoading(true);
    try {
      const res = await fetch("http://localhost:5000/api/auth/complete-onboarding", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ role }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.message);

      // Update auth context with final user data
      login(data, data.token);
      
      // Redirect to correct dashboard
      navigate(role === "seller" ? "/seller/dashboard" : "/dashboard", { replace: true });
    } catch (err: any) {
      alert.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <div className="max-w-4xl w-full text-center">
        <h1 className="text-4xl md:text-5xl font-black text-white mb-4">Welcome to LaunchKit!</h1>
        <p className="text-gray-400 text-lg mb-12">How will you be using the platform today?</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Customer Card */}
          <button
            onClick={() => handleRoleSelection("customer")}
            disabled={isLoading}
            className="group relative bg-white/5 border border-white/10 rounded-3xl p-8 text-left hover:border-purple-500 hover:bg-white/10 transition-all duration-300"
          >
            <div className="w-14 h-14 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center mb-6 group-hover:bg-purple-600 group-hover:text-white transition-all">
              <I name="ShoppingBag" size={28} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">I want to Buy Assets</h3>
            <p className="text-gray-400">Browse, purchase, and download premium templates and mockups for your projects.</p>
          </button>

          {/* Seller Card */}
          <button
            onClick={() => handleRoleSelection("seller")}
            disabled={isLoading}
            className="group relative bg-white/5 border border-white/10 rounded-3xl p-8 text-left hover:border-purple-500 hover:bg-white/10 transition-all duration-300"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-600/20 text-blue-400 flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-all">
              <I name="DollarSign" size={28} />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">I want to Sell Assets</h3>
            <p className="text-gray-400">Upload your creations, manage your store, and earn money from a global audience.</p>
          </button>
        </div>
      </div>
    </div>
  );
}