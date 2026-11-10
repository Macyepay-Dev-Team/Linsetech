import { getRequestConfig } from "next-intl/server";
import { hasLocale } from "next-intl";
import { routing } from "./routing";

/**
 * Messages = the shared file (messages/<locale>.json) deep-merged with one file per page group
 * (messages/pages/<group>/<locale>.json), so each page group owns its own copy and can be edited independently.
 */
const GROUPS = ["about", "services", "news", "work", "company", "brand"] as const;

type Msgs = Record<string, unknown>;
const isObj = (v: unknown): v is Msgs => typeof v === "object" && v !== null && !Array.isArray(v);
function merge(a: Msgs, b: Msgs): Msgs {
  const out: Msgs = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = isObj(v) && isObj(out[k]) ? merge(out[k] as Msgs, v) : v;
  return out;
}

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;

  let messages: Msgs = (await import(`../messages/${locale}.json`)).default;
  for (const g of GROUPS) {
    const part: Msgs = (await import(`../messages/pages/${g}/${locale}.json`)).default;
    messages = merge(messages, part);
  }
  return { locale, messages, timeZone: "Africa/Kigali" };
});
