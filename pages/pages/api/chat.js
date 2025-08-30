import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// EDIT THESE for your site:
const OWNERREZ_BASE_URL = "https://YOURDOMAIN.com/booknow"; // <- replace
const UNIT_MAP = {
  "Pelican-201": "12345", // unit slug -> PropertyID
  "Surf-View-702": "67890"
};

const SYSTEM_PROMPT = `
You are Destin Concierge AI. Be friendly and concise.
Collect exactly: unit -> dates -> adults -> children. Ask only for the missing piece.
When you have all four, confirm the summary and include this single line:
META: {"unit":"<slug>","checkIn":"YYYY-MM-DD","checkOut":"YYYY-MM-DD","adults":N,"children":N}
Never promise to hold dates. Offer a live quote link instead.
If asked about local tips (cars, spas, beaches), give 2–4 concrete tips and a one-line booking nudge.
`;

const months = {jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,sept:9,oct:10,nov:11,dec:12};

function parseDates(text) {
  let m = text.match(/(\d{4}-\d{2}-\d{2})\s*(?:to|-|–)\s*(\d{4}-\d{2}-\d{2})/i);
  if (m) return { checkIn: m[1], checkOut: m[2] };
  m = text.match(/([A-Za-z]{3,4})\s+(\d{1,2})\s*(?:to|-|–)\s*(\d{1,2})/i);
  if (m) {
    const mon = months[m[1].toLowerCase()];
    if (!mon) return null;
    const now = new Date();
    const year = (mon < (now.getMonth()+1)) ? now.getFullYear()+1 : now.getFullYear();
    const pad = (n) => String(n).padStart(2,"0");
    return { checkIn: `${year}-${pad(mon)}-${pad(+m[2])}`, checkOut: `${year}-${pad(mon)}-${pad(+m[3])}` };
  }
  return null;
}

function buildQuoteUrl({ unit, checkIn, checkOut, adults, children }) {
  const propId = UNIT_MAP[unit] || Object.values(UNIT_MAP)[0];
  const u = new URL(OWNERREZ_BASE_URL);
  u.searchParams.set("PropertyID", propId);
  u.searchParams.set("CheckIn", checkIn);
  u.searchParams.set("CheckOut", checkOut);
  if (adults != null)   u.searchParams.set("Adults", String(adults));
  if (children != null) u.searchParams.set("Children", String(children));
  return u.toString();
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  try {
    const { messages = [] } = req.body || {};
    const lastUser = [...messages].reverse().find(m => m.role === "user")?.content || "";
    // opportunistically parse dates to help the model
    const parsedDates = parseDates(lastUser);
    const hints = parsedDates
      ? `\nDetected dates: ${parsedDates.checkIn} to ${parsedDates.checkOut}. If other fields missing, keep collecting.`
      : "";

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.6,
      messages: [{ role: "system", content: SYSTEM_PROMPT + hints }, ...messages.slice(-15)]
    });

    let reply = completion.choices[0]?.message?.content || "Sorry, please try again.";

    // If the model emitted META, build/append the instant-quote link
    const metaLine = reply.split("\n").find(l => l.startsWith("META:"));
    if (metaLine) {
      const meta = JSON.parse(metaLine.replace("META:", "").trim());
      const url = buildQuoteUrl(meta);
      reply += `\n\nGet your **instant quote** here: ${url}`;
    }

    res.status(200).json({ reply: { role: "assistant", content: reply } });
  } catch (e) {
    res.status(200).json({ reply: { role: "assistant", content: "I hit an error on my side. Please try again." } });
  }
}
