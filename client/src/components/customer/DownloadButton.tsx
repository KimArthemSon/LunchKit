import { useState } from "react";
import { I } from "../Shared";
import { useAuth } from "../../context/AuthContext";
import { useAlert } from "../../context/AlertContext";
import { downloadProductFile } from "../../api/products";
import { errorMessage } from "../../api/http";

interface Props {
  productId: string;
  fileName?: string;
  disabled?: boolean;
  className?: string;
}

export default function DownloadButton({ productId, fileName, disabled, className = "" }: Props) {
  const { token } = useAuth();
  const alert = useAlert();
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    setBusy(true);
    try {
      await downloadProductFile(token, { _id: productId, fileName: fileName || "download" });
    } catch (err) {
      alert.error(errorMessage(err), { title: "Download failed" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || busy}
      className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-bold transition-all ${className}`}
    >
      <I name="Download" size={14} />
      {busy ? "Downloading..." : "Download"}
    </button>
  );
}
