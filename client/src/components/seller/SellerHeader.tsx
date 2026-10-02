import type { ReactNode } from "react";
import { I } from "../Shared";
import { useSellerNav } from "./sellerNav";

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function SellerHeader({ title, subtitle, actions }: Props) {
  const { openNav } = useSellerNav();
  return (
    <header className="h-20 shrink-0 border-b border-stone-800 bg-stone-950/80 backdrop-blur-xl flex items-center gap-3 px-4 md:px-8 sticky top-0 z-30">
      <button
        onClick={openNav}
        aria-label="Open menu"
        className="md:hidden p-2 -ml-1 rounded-lg text-stone-300 hover:text-white hover:bg-stone-800"
      >
        <I name="Menu" size={22} />
      </button>
      <div className="min-w-0 flex-1">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-white truncate">{title}</h1>
        {subtitle && <p className="text-xs md:text-sm text-stone-400 truncate">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </header>
  );
}
