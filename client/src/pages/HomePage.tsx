import { useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useScrollReveal, Reveal, I } from "../components/Shared";

/* ─── Content ── */
const problems = [
  { title: "Lost points", desc: "Students lose crucial marks in capstone defenses because the slides look amateur." },
  { title: "No time to design", desc: "Hackathon teams lack the time or skills to make a compelling demo video." },
  { title: "Lost clients", desc: "Indie developers struggle to win work with unpolished portfolios." },
];

const categories = [
  { icon: "Image", title: "Images & graphics", tagline: "Make your app look real", desc: "Device mockups, GitHub banners, social launch kits and app store graphics.", features: ["iPhone & MacBook mockups", "GitHub profile banners", "Social media kits", "App store screenshots"] },
  { icon: "Video", title: "Video & motion", tagline: "Bring your demo to life", desc: "Recording overlays, lower-thirds, webcam frames and drag-and-drop promo templates.", features: ["Premiere Pro templates", "CapCut projects", "Recording overlays", "Animated lower-thirds"] },
  { icon: "FileText", title: "Docs & pitch decks", tagline: "Pitch like a pro", desc: "Hackathon decks, capstone defenses, freelance contracts and README boilerplates.", features: ["Hackathon pitch decks", "Capstone templates", "Freelance contracts", "README boilerplates"] },
];

const steps = [
  { num: "01", title: "Discover", desc: "Browse a curated marketplace and filter by category, file type or event." },
  { num: "02", title: "Preview & buy", desc: "Look through watermarked previews, then check out securely in a few clicks." },
  { num: "03", title: "Download & launch", desc: "Get the full-resolution files instantly. Customise, drop in your project, ship." },
];

const creatorItems = [
  { title: "A buying audience", desc: "Reach developers who are actively looking for presentation tools." },
  { title: "Seamless payouts", desc: "Automated transactions get you paid quickly and securely." },
  { title: "We handle the rest", desc: "Hosting, delivery and maintenance are on us. You just create." },
];

const useCases = ["Capstone defenses", "Hackathon demos", "Portfolios", "Client pitches", "App launches", "Open-source READMEs"];

/* ─── Shelf thumbnails: flat, drawn with plain shapes ── */
function MockupThumb() {
  return (
    <div className="h-full bg-violet-600 flex items-end justify-center pt-8">
      <div className="w-[38%] aspect-[9/16] rounded-t-[1.4rem] border-[5px] border-b-0 border-white/90 bg-white/10 p-2.5 space-y-1.5">
        <div className="h-1.5 w-1/2 rounded-full bg-white/80" />
        <div className="h-8 rounded-md bg-white/30" />
        <div className="h-1.5 w-full rounded-full bg-white/40" />
        <div className="h-1.5 w-3/4 rounded-full bg-white/40" />
      </div>
    </div>
  );
}
function VideoThumb() {
  return (
    <div className="relative h-full bg-stone-900 flex items-center justify-center">
      <span className="w-12 h-12 rounded-full border border-white/30 flex items-center justify-center">
        <span className="ml-1 w-0 h-0 border-y-[7px] border-y-transparent border-l-[11px] border-l-white" />
      </span>
      <div className="absolute left-5 bottom-5 flex items-center gap-2">
        <span className="w-1 h-7 bg-violet-500" />
        <div className="space-y-1.5"><div className="h-1.5 w-20 rounded-full bg-white/80" /><div className="h-1.5 w-12 rounded-full bg-white/40" /></div>
      </div>
      <span className="absolute top-4 right-4 flex items-center gap-1.5 text-[10px] font-medium tracking-wider text-white/70">
        <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> REC
      </span>
    </div>
  );
}
function DeckThumb() {
  return (
    <div className="h-full bg-[#e9e3d8] flex items-center justify-center p-6">
      <div className="w-full aspect-video bg-white rounded-md shadow-sm p-4 flex gap-4">
        <div className="flex-1 space-y-2">
          <div className="h-2 w-3/4 rounded-full bg-stone-800" />
          <div className="h-1.5 w-full rounded-full bg-stone-300" />
          <div className="h-1.5 w-5/6 rounded-full bg-stone-300" />
        </div>
        <div className="w-1/3 flex items-end gap-1">
          {[40, 65, 50, 90].map((h) => <div key={h} className="flex-1 bg-violet-600 rounded-sm" style={{ height: `${h}%` }} />)}
        </div>
      </div>
    </div>
  );
}

const shelf = [
  { thumb: <MockupThumb />, title: "iPhone 15 Pro Mockup", meta: "Figma · PSD", price: "$12" },
  { thumb: <VideoThumb />, title: "Demo Video Overlay", meta: "Premiere Pro", price: "$24" },
  { thumb: <DeckThumb />, title: "Hackathon Pitch Deck", meta: "Keynote · PPTX", price: "$18" },
];

/* ─── Building blocks ── */
function Eyebrow({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return <p className={`text-sm font-medium mb-4 ${dark ? "text-stone-400" : "text-stone-500"}`}>{children}</p>;
}

/* Before/after slider: plain screenshot vs. the same screen in a mockup */
function BeforeAfter() {
  const [pos, setPos] = useState(50);
  const screen = (
    <div className="space-y-2 p-3.5">
      <div className="h-2.5 w-1/2 rounded bg-current opacity-70" />
      <div className="grid grid-cols-3 gap-1.5">{[0, 1, 2].map((i) => <div key={i} className="h-12 rounded bg-current opacity-15" />)}</div>
      <div className="h-1.5 w-full rounded bg-current opacity-25" />
      <div className="h-1.5 w-4/5 rounded bg-current opacity-25" />
    </div>
  );

  return (
    <div className="relative select-none aspect-[4/3] rounded-2xl overflow-hidden border border-stone-200">
      {/* After */}
      <div className="absolute inset-0 bg-violet-600 flex items-center justify-center">
        <div className="relative w-[42%] aspect-[9/17] rounded-[1.5rem] bg-stone-950 p-1.5 shadow-2xl shadow-violet-950/40">
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-10 h-2.5 rounded-full bg-stone-950 z-10" />
          <div className="h-full rounded-[1.15rem] bg-white text-stone-800 overflow-hidden pt-5">{screen}</div>
        </div>
        <span className="absolute top-4 right-4 text-xs font-medium text-white/80">After</span>
      </div>
      {/* Before */}
      <div className="absolute inset-0 bg-stone-200 text-stone-500 flex items-center justify-center" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        <div className="w-[68%] bg-white border border-stone-300">{screen}</div>
        <span className="absolute top-4 left-4 text-xs font-medium text-stone-500">Before</span>
      </div>
      {/* Handle */}
      <div className="absolute inset-y-0 w-px bg-white pointer-events-none" style={{ left: `${pos}%` }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white text-stone-900 shadow-md flex items-center justify-center">
          <span className="rotate-180"><I name="ArrowRight" size={12} /></span><I name="ArrowRight" size={12} />
        </div>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={pos}
        onChange={(e) => setPos(Number(e.target.value))}
        aria-label="Compare before and after"
        className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize"
      />
    </div>
  );
}

/* ─── Page ── */
export default function HomePage() {
  useScrollReveal();

  return (
    <div className="bg-[#f7f6f3] text-stone-900">
      {/* ═══ HERO ═══ */}
      <section className="pt-40 pb-20 md:pt-48">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <Eyebrow>Assets for presenting software</Eyebrow>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-[-0.035em] leading-[1.02] max-w-4xl">
              Make your project look as good as it works.
            </h1>
          </Reveal>
          <Reveal delay={160}>
            <div className="mt-10 flex flex-col md:flex-row md:items-end md:justify-between gap-8">
              <p className="text-lg md:text-xl text-stone-600 max-w-xl leading-relaxed">
                Mockups, demo-video templates and pitch decks for developers, students and hackathon teams.
              </p>
              <div className="flex items-center gap-6 shrink-0">
                <Link to="/signup" className="bg-stone-900 text-white px-6 py-3.5 rounded-full font-medium hover:bg-stone-700 transition-colors">
                  Browse assets
                </Link>
                <a href="#how-it-works" className="group inline-flex items-center gap-1.5 font-medium text-stone-700 hover:text-stone-900">
                  How it works <I name="ArrowRight" size={16} className="transition-transform group-hover:translate-x-0.5" />
                </a>
              </div>
            </div>
          </Reveal>

          {/* Product shelf */}
          <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-5">
            {shelf.map((item, i) => (
              <Reveal key={item.title} delay={240 + i * 90}>
                <Link to="/signup" className="group block">
                  <div className="aspect-[4/3] rounded-2xl overflow-hidden border border-stone-200 transition-transform duration-500 group-hover:-translate-y-1">
                    {item.thumb}
                  </div>
                  <div className="mt-4 flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-stone-500">{item.meta}</p>
                    </div>
                    <span className="text-sm font-medium tabular-nums">{item.price}</span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ BUILT FOR ═══ */}
      <section className="border-y border-stone-200">
        <div className="max-w-6xl mx-auto px-6 py-6 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm">
          <span className="text-stone-500">Built for</span>
          {useCases.map((u) => <span key={u} className="font-medium text-stone-700">{u}</span>)}
        </div>
      </section>

      {/* ═══ PROBLEM ═══ */}
      <section className="py-28">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-16">
          <Reveal>
            <Eyebrow>The problem</Eyebrow>
            <h2 className="text-4xl md:text-5xl font-semibold tracking-[-0.03em] leading-[1.08] mb-6">The presentation gap.</h2>
            <p className="text-lg text-stone-600 leading-relaxed max-w-md">
              Good software gets overlooked every day because it's presented poorly. Presentation is the edge most developers forget.
            </p>
            <div className="mt-12 max-w-sm">
              <p className="text-7xl font-semibold tracking-tight tabular-nums">90<span className="text-stone-300">/</span>10</p>
              <p className="mt-3 text-stone-600">Most devs spend 90% of their time coding and only 10% on how it's presented.</p>
              <div className="mt-6 flex h-2 rounded-full overflow-hidden bg-stone-200">
                <div className="sr lk-line w-[90%] bg-stone-900" />
                <div className="w-[10%] bg-violet-600" />
              </div>
            </div>
          </Reveal>

          <div className="lg:pt-12">
            {problems.map((p, i) => (
              <Reveal key={p.title} delay={i * 100}>
                <div className="grid grid-cols-[3rem_1fr] gap-4 py-8 border-t border-stone-200 last:border-b">
                  <span className="text-sm text-stone-400 tabular-nums pt-1">0{i + 1}</span>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{p.title}</h3>
                    <p className="text-stone-600 leading-relaxed">{p.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ SOLUTION ═══ */}
      <section className="py-28 bg-white border-y border-stone-200">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-[1fr_1.15fr] gap-16 items-center">
          <Reveal>
            <Eyebrow>The solution</Eyebrow>
            <h2 className="text-4xl md:text-5xl font-semibold tracking-[-0.03em] leading-[1.08] mb-6">Marketing in a box, for technical creators.</h2>
            <p className="text-lg text-stone-600 leading-relaxed mb-10">
              Buy industry-standard, customisable assets and download them instantly. Drop your screens in and you're done.
            </p>
            <ul className="space-y-3 text-stone-700">
              {["Instant downloads", "Secure payments, verified assets", "Hours of design work saved"].map((t) => (
                <li key={t} className="flex items-center gap-3">
                  <span className="text-violet-600"><I name="Check" size={18} /></span>{t}
                </li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120}>
            <BeforeAfter />
            <p className="text-sm text-stone-500 mt-4">Drag to compare a raw screenshot with a LaunchKit mockup.</p>
          </Reveal>
        </div>
      </section>

      {/* ═══ TOOLKIT ═══ */}
      <section id="products" className="py-28 scroll-mt-16">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
              <div>
                <Eyebrow>The toolkit</Eyebrow>
                <h2 className="text-4xl md:text-5xl font-semibold tracking-[-0.03em] leading-[1.08]">Everything you need to launch.</h2>
              </div>
              <p className="text-stone-600 max-w-sm">Three categories, each built for a different stage of presenting your work.</p>
            </div>
          </Reveal>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {categories.map((cat, i) => (
              <Reveal key={cat.title} delay={i * 100}>
                <div className="group h-full bg-white rounded-2xl border border-stone-200 hover:border-stone-400 p-8 flex flex-col transition-colors duration-300">
                  <span className="w-11 h-11 rounded-xl bg-stone-100 text-stone-800 flex items-center justify-center mb-8 transition-colors duration-300 group-hover:bg-violet-600 group-hover:text-white">
                    <I name={cat.icon} size={20} />
                  </span>
                  <h3 className="text-xl font-semibold">{cat.title}</h3>
                  <p className="text-sm text-violet-600 font-medium mt-1 mb-4">{cat.tagline}</p>
                  <p className="text-stone-600 leading-relaxed mb-8">{cat.desc}</p>
                  <ul className="space-y-2.5 mb-10 text-sm text-stone-700">
                    {cat.features.map((f) => (
                      <li key={f} className="flex items-center gap-2.5"><span className="w-1 h-1 rounded-full bg-stone-400" />{f}</li>
                    ))}
                  </ul>
                  <Link to="/signup" className="mt-auto inline-flex items-center gap-1.5 text-sm font-medium text-stone-900">
                    Browse {cat.title.split(" ")[0].toLowerCase()}
                    <I name="ArrowRight" size={15} className="transition-transform group-hover:translate-x-0.5" />
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ HOW IT WORKS ═══ */}
      <section id="how-it-works" className="py-28 scroll-mt-16 border-t border-stone-200">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal>
            <Eyebrow>How it works</Eyebrow>
            <h2 className="text-4xl md:text-5xl font-semibold tracking-[-0.03em] leading-[1.08] mb-16 max-w-2xl">From browsing to launch in minutes.</h2>
          </Reveal>
          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
            {/* Shared rule that draws itself across all three steps */}
            <div className="hidden md:block absolute top-0 inset-x-0 h-px bg-stone-200">
              <div className="sr lk-line h-full bg-stone-900" />
            </div>
            {steps.map((step, i) => (
              <Reveal key={step.title} delay={i * 150}>
                <div className="pt-8 border-t border-stone-200 md:border-0">
                  <p className="text-sm font-medium text-violet-600 tabular-nums mb-6">{step.num}</p>
                  <h3 className="text-xl font-semibold mb-3">{step.title}</h3>
                  <p className="text-stone-600 leading-relaxed max-w-xs">{step.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CREATORS ═══ */}
      <section id="creators" className="py-28 scroll-mt-16 bg-stone-950 text-white">
        <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          <Reveal>
            <Eyebrow dark>For creators</Eyebrow>
            <h2 className="text-4xl md:text-5xl font-semibold tracking-[-0.03em] leading-[1.08] mb-6">Turn your design skills into income.</h2>
            <p className="text-lg text-stone-400 leading-relaxed mb-10 max-w-lg">
              LaunchKit is a multi-vendor marketplace. Designers and presentation pros sell straight to the developers who need their work.
            </p>
            <div className="space-y-6 mb-12">
              {creatorItems.map((item) => (
                <div key={item.title} className="border-l border-stone-700 pl-5">
                  <h3 className="font-semibold mb-1">{item.title}</h3>
                  <p className="text-stone-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
            <Link to="/signup" className="inline-block bg-white text-stone-900 px-6 py-3.5 rounded-full font-medium hover:bg-stone-200 transition-colors">
              Start selling
            </Link>
          </Reveal>

          {/* Illustrative seller dashboard */}
          <Reveal delay={120}>
            <div className="rounded-2xl border border-stone-800 bg-stone-900 p-7">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <p className="text-sm text-stone-400">Earnings this month</p>
                  <p className="text-4xl font-semibold tracking-tight tabular-nums mt-1">$1,284.50</p>
                </div>
                <span className="text-sm font-medium text-emerald-400 tabular-nums">+18%</span>
              </div>
              <svg viewBox="0 0 300 90" className="w-full h-28" aria-hidden="true">
                {[22, 45, 68].map((y) => <line key={y} x1="0" x2="300" y1={y} y2={y} stroke="#292524" strokeWidth="1" />)}
                <path className="lk-draw" d="M0 74 L30 66 L60 70 L90 52 L120 56 L150 40 L180 46 L210 28 L240 33 L270 16 L300 20" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
              </svg>
              <div className="grid grid-cols-3 mt-6 border-t border-stone-800 pt-6">
                {[{ k: "Sales", v: "86" }, { k: "Products", v: "12" }, { k: "Rating", v: "4.9" }].map((s) => (
                  <div key={s.k}>
                    <p className="text-xs text-stone-500">{s.k}</p>
                    <p className="text-xl font-semibold tabular-nums mt-0.5">{s.v}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══ CLOSING CTA ═══ */}
      <section id="vision" className="py-32">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Reveal>
            <h2 className="text-4xl md:text-6xl font-semibold tracking-[-0.035em] leading-[1.05] mb-6">
              Every great line of code deserves a great presentation.
            </h2>
            <p className="text-lg text-stone-600 mb-10 max-w-xl mx-auto">
              Curated by developers, for developers. Built around the exact formats tech presentations need.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/signup" className="bg-stone-900 text-white px-7 py-3.5 rounded-full font-medium hover:bg-stone-700 transition-colors">
                Join LaunchKit free
              </Link>
              <Link to="/login" className="px-7 py-3.5 rounded-full font-medium text-stone-700 border border-stone-300 hover:border-stone-900 hover:text-stone-900 transition-colors">
                Log in
              </Link>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
