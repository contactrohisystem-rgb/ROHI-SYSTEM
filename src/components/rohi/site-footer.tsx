import Link from "next/link";
import { Mail, MessageCircle, MapPin } from "lucide-react";
import { RohiLogo } from "./rohi-logo";
import { CookiePreferencesButton } from "./cookie-preferences-button";
import { SITE_CONFIG, whatsappLink } from "@/lib/site-config";

// Footer nav — grouped into scannable columns.
const FOOTER_GROUPS = [
  {
    title: "Core",
    items: [
      { label: "Solutions", href: "/solutions" },
      { label: "Products", href: "/products" },
      { label: "Case Studies", href: "/case-studies" },
    ],
  },
  {
    title: "Company",
    items: [
      { label: "Approach", href: "/approach" },
      { label: "Engagement", href: "/engagement" },
      { label: "About", href: "/about" },
    ],
  },
  {
    title: "Resources",
    items: [
      { label: "Assessment", href: "/assessment" },
      { label: "Insights", href: "/insights" },
      { label: "FAQ", href: "/faq" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

// Legal & trust pages — all real routes.
const LEGAL = [
  { label: "Privacy", href: "/privacy" },
  { label: "Terms", href: "/terms" },
  { label: "Cookies", href: "/cookies" },
  { label: "AI Notice", href: "/ai-notice" },
  { label: "Security", href: "/security" },
] as const;

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto bg-navy text-white">
      <div className="mx-auto w-full max-w-7xl px-5 sm:px-6 lg:px-8">
        {/* Top — brand statement + contact block + grouped nav columns */}
        <div className="grid gap-12 border-b border-white/10 py-14 lg:grid-cols-12 lg:py-20">
          <div className="lg:col-span-5">
            <RohiLogo tone="light" height={48} />
            <p className="mt-8 font-sans text-2xl font-bold leading-tight tracking-[-0.02em] sm:text-3xl">
              Technology That Moves Business.
            </p>
            <p className="mt-3 font-mono-tech text-[11px] uppercase tracking-[0.18em] text-teal">
              Intelligent Business Systems
            </p>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-white/60">
              Built around the way your business actually works.
            </p>

            {/* Direct contact — reads from site-config (placeholders until
                real details are provided; update src/lib/site-config.ts). */}
            <div className="mt-7 flex flex-col gap-2.5">
              <a
                href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(SITE_CONFIG.email)}`}
                target="_blank"
                rel="noopener noreferrer"
                data-slot="rohi-button"
                className="inline-flex items-center gap-2.5 text-sm text-white/70 transition-colors hover:text-teal"
              >
                <Mail className="size-4 text-teal" />
                {SITE_CONFIG.email}
              </a>
              <a
                href={whatsappLink()}
                target="_blank"
                rel="noopener noreferrer"
                data-slot="rohi-button"
                className="group inline-flex items-center gap-2.5 text-sm text-white/70 transition-colors hover:text-teal"
              >
                <span className="flex size-4 items-center justify-center text-[#25D366]">
                  <MessageCircle className="size-4" />
                </span>
                WhatsApp · {SITE_CONFIG.whatsappDisplay}
              </a>
              <p className="inline-flex items-center gap-2.5 text-sm text-white/70">
                <MapPin className="size-4 text-teal" />
                {SITE_CONFIG.addressLine}
              </p>
            </div>
          </div>

          {/* Grouped nav columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-7 lg:col-start-6">
            {FOOTER_GROUPS.map((group) => (
              <div key={group.title}>
                <p className="font-mono-tech text-[11px] uppercase tracking-[0.18em] text-white/40">
                  {group.title}
                </p>
                <ul className="mt-5 space-y-3">
                  {group.items.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="text-sm text-white/70 transition-colors hover:text-teal"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col items-start justify-between gap-4 py-8 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <p className="font-mono-tech text-[11px] uppercase tracking-[0.18em] text-white/40">
              © {year} ROHI SYSTEMS
            </p>
            <span className="hidden h-3 w-px bg-white/20 sm:block" aria-hidden />
            <p className="font-mono-tech text-[11px] uppercase tracking-[0.18em] text-white/40">
              Built in Mozambique
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            {LEGAL.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="font-mono-tech text-[11px] uppercase tracking-[0.18em] text-white/40 transition-colors hover:text-teal"
              >
                {item.label}
              </Link>
            ))}
            <CookiePreferencesButton />
          </div>
        </div>
      </div>
    </footer>
  );
}
