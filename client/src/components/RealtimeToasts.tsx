import { useAuth } from "../context/AuthContext";
import { useAlert } from "../context/AlertContext";
import { useSocketEvent } from "../hooks/useSocketEvent";
import { formatMoney } from "../utils/money";

// App-wide notifications for realtime events, shown on whichever page the user is on.
export default function RealtimeToasts() {
  const { user } = useAuth();
  const alert = useAlert();

  useSocketEvent("sale:new", ({ orderNumber, currency, items }) => {
    if (user?.role !== "seller") return;
    const earnings = items.reduce((sum, i) => sum + i.earningsCents, 0);
    const what = items.length === 1 ? `"${items[0].title}"` : `${items.length} products`;
    alert.success(`${what} just sold — you earned ${formatMoney(earnings, currency)} (${orderNumber}).`, { title: "New sale" });
  });

  return null;
}
