export type SellerProduct = {
  id: number;
  title: string;
  category: string;
  price: number;
  status: "active" | "draft" | "archived";
  sales: number;
  revenue: number;
  image: string;
};

export type SellerOrder = {
  id: string;
  customer: string;
  product: string;
  amount: number;
  date: string;
  status: "completed" | "pending" | "refunded";
};

export type Transaction = {
  id: string;
  type: "payout" | "earning";
  amount: number;
  date: string;
  status: "completed" | "processing";
};

export const sellerStats = [
  { label: "Total Revenue", value: "$12,450", change: "+12.5%", isPositive: true, icon: "DollarSign" },
  { label: "Total Sales", value: "1,234", change: "+8.2%", isPositive: true, icon: "ShoppingBag" },
  { label: "Active Products", value: "18", change: "+2", isPositive: true, icon: "Package" },
  { label: "Pending Payout", value: "$840.50", change: "-2.4%", isPositive: false, icon: "Wallet" },
];

export const mockProducts: SellerProduct[] = [
  { id: 1, title: "iPhone 15 Pro Mockup Pack", category: "Mockups", price: 12.99, status: "active", sales: 234, revenue: 3039.66, image: "https://images.unsplash.com/photo-1696446701796-da61225697cc?w=500" },
  { id: 2, title: "MacBook Air M2 Showcase", category: "Mockups", price: 14.99, status: "active", sales: 187, revenue: 2803.13, image: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500" },
  { id: 3, title: "Hackathon Pitch Deck", category: "Templates", price: 18.99, status: "active", sales: 156, revenue: 2962.44, image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=500" },
  { id: 4, title: "Animated Lower Thirds", category: "Videos", price: 22.99, status: "draft", sales: 0, revenue: 0, image: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?w=500" },
  { id: 5, title: "Social Media Launch Kit", category: "Graphics", price: 16.99, status: "active", sales: 98, revenue: 1665.02, image: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=500" },
  { id: 6, title: "Freelance Contract Template", category: "Templates", price: 12.99, status: "archived", sales: 342, revenue: 4442.58, image: "https://images.unsplash.com/photo-1450101499163-c8848c66ca85?w=500" },
];

export const mockOrders: SellerOrder[] = [
  { id: "ORD-7829", customer: "Alice Johnson", product: "iPhone 15 Pro Mockup Pack", amount: 12.99, date: "2026-09-05", status: "completed" },
  { id: "ORD-7828", customer: "Bob Smith", product: "Hackathon Pitch Deck", amount: 18.99, date: "2026-09-05", status: "completed" },
  { id: "ORD-7827", customer: "Charlie Brown", product: "MacBook Air M2 Showcase", amount: 14.99, date: "2026-09-04", status: "pending" },
  { id: "ORD-7826", customer: "Diana Prince", product: "Social Media Launch Kit", amount: 16.99, date: "2026-09-04", status: "completed" },
  { id: "ORD-7825", customer: "Evan Wright", product: "iPhone 15 Pro Mockup Pack", amount: 12.99, date: "2026-09-03", status: "refunded" },
];

export const mockTransactions: Transaction[] = [
  { id: "PAY-001", type: "payout", amount: -500.00, date: "2026-08-25", status: "completed" },
  { id: "EAR-102", type: "earning", amount: 129.90, date: "2026-08-24", status: "completed" },
  { id: "EAR-101", type: "earning", amount: 45.98, date: "2026-08-23", status: "completed" },
  { id: "PAY-002", type: "payout", amount: -1200.00, date: "2026-07-25", status: "completed" },
];

// Simple chart data for revenue
export const chartData = [
  { month: "Jan", revenue: 400 },
  { month: "Feb", revenue: 300 },
  { month: "Mar", revenue: 500 },
  { month: "Apr", revenue: 450 },
  { month: "May", revenue: 600 },
  { month: "Jun", revenue: 550 },
  { month: "Jul", revenue: 700 },
  { month: "Aug", revenue: 850 },
  { month: "Sep", revenue: 900 },
];