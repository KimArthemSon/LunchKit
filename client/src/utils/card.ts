// Card handling for the checkout form. Validation runs in the browser, and the card is
// turned into a payment token here so the raw number never leaves the page.
// SANDBOX ONLY: with a live gateway, replace tokenizeCard with the provider's SDK
// (e.g. Stripe Elements `createPaymentMethod`, PayMongo `createPaymentMethod`).

export type CardBrand = "visa" | "mastercard" | "amex" | "discover" | "jcb" | "card";

export const detectBrand = (digits: string): CardBrand => {
  if (/^4/.test(digits)) return "visa";
  if (/^(5[1-5]|2[2-7])/.test(digits)) return "mastercard";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^(6011|65|64[4-9])/.test(digits)) return "discover";
  if (/^35/.test(digits)) return "jcb";
  return "card";
};

export const BRAND_LABELS: Record<string, string> = {
  visa: "Visa", mastercard: "Mastercard", amex: "American Express", discover: "Discover", jcb: "JCB", card: "Card",
};

const luhnValid = (digits: string) => {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = Number(digits[digits.length - 1 - i]);
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
};

// "4242424242424242" -> "4242 4242 4242 4242" (Amex: 4-6-5)
export const formatCardNumber = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 19);
  const groups = detectBrand(digits) === "amex" ? [4, 6, 5] : [4, 4, 4, 4, 3];
  const parts: string[] = [];
  let i = 0;
  for (const size of groups) {
    if (i >= digits.length) break;
    parts.push(digits.slice(i, i + size));
    i += size;
  }
  return parts.join(" ");
};

// "1228" -> "12 / 28"
export const formatExpiry = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)} / ${digits.slice(2)}` : digits;
};

export interface CardInput {
  number: string;
  expiry: string;
  cvc: string;
  name: string;
}

export type CardErrors = Partial<Record<keyof CardInput, string>>;

export const validateCard = (card: CardInput): CardErrors => {
  const errors: CardErrors = {};
  const digits = card.number.replace(/\D/g, "");
  const brand = detectBrand(digits);

  if (digits.length < 13 || digits.length > 19 || !luhnValid(digits)) errors.number = "Enter a valid card number";

  const [mm, yy] = card.expiry.split("/").map((s) => Number(s.trim()));
  if (!mm || !yy || mm < 1 || mm > 12) {
    errors.expiry = "Enter a valid expiry (MM / YY)";
  } else {
    const endOfMonth = new Date(2000 + yy, mm, 1); // First day of the following month
    if (endOfMonth <= new Date()) errors.expiry = "This card has expired";
  }

  const cvcLength = brand === "amex" ? 4 : 3;
  if (!new RegExp(`^\\d{${cvcLength}}$`).test(card.cvc)) errors.cvc = `Enter the ${cvcLength}-digit security code`;

  if (!card.name.trim()) errors.name = "Enter the name on the card";
  return errors;
};

// Sandbox tokenizer — produces the same kind of opaque token a gateway SDK would
export const tokenizeCard = (card: CardInput) => {
  const digits = card.number.replace(/\D/g, "");
  return `pm_sandbox_${detectBrand(digits)}_${digits.slice(-4)}`;
};

export const SANDBOX_TEST_CARDS = [
  { number: "4242 4242 4242 4242", result: "Succeeds" },
  { number: "4000 0000 0000 0002", result: "Declined" },
  { number: "4000 0000 0000 9995", result: "Insufficient funds" },
];
