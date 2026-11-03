/**
 * ROHI SYSTEMS — site-wide configuration.
 * These are PLACEHOLDER contact details — replace with the real ones
 * when available. The WhatsApp button, contact page, and footer all
 * read from here so updating is a one-line change.
 */
export const SITE_CONFIG = {
  company: "ROHI SYSTEMS",
  tagline: "Technology That Moves Business.",
  category: "Intelligent Business Systems",
  origin: "Mozambique",

  // ⚠️ PLACEHOLDERS — replace with real details when available.
  // WhatsApp number in international format, digits only (e.g. "25884XXXXXXX").
  // The wa.me link format: https://wa.me/<digits>
  whatsappNumber: "258840000000", // TODO: set real WhatsApp Business number
  whatsappDisplay: "+258 84 000 0000", // TODO: set real display number

  // Contact email (Gmail until rohi.systems domain is registered + verified)
  email: "contactrohisystem@gmail.com",

  // TODO: set real Maputo address
  addressLine: "Maputo, Mozambique",

  // Social links (set when available)
  social: {
    linkedin: "",
    instagram: "",
    x: "",
  },
} as const;

/** Pre-filled WhatsApp message a visitor sends when clicking the WA button. */
export const WHATSAPP_DEFAULT_MESSAGE =
  "Hi ROHI — I'd like to talk about a business problem we're trying to solve.";

/** Build a wa.me link. */
export function whatsappLink(message?: string): string {
  const text = encodeURIComponent(message ?? WHATSAPP_DEFAULT_MESSAGE);
  return `https://wa.me/${SITE_CONFIG.whatsappNumber}?text=${text}`;
}
