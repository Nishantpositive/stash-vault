export type CardType = "note" | "link" | "youtube" | "image" | "tweet" | "reddit";

export type StashCard = {
  id: string;
  t: number;
  type: CardType;
  cat: string;
  host: string;
  title: string;
  desc: string;
  url?: string;
  img?: string;
  wordCount: number;
  readTime: number;
};

export const TOPICS = [
  "Geography",
  "Polity",
  "History",
  "Economy",
  "Tech",
  "Science",
  "General",
] as const;

export type TopicName = (typeof TOPICS)[number];

/** Muted taxonomy inks — data, not decoration. */
export const TOPIC_INK: Record<string, string> = {
  Geography: "#6f9a7a",
  Polity: "#d4b06a",
  History: "#c48474",
  Economy: "#7aa0ae",
  Tech: "#a394c4",
  Science: "#7eb0c4",
  General: "#b7ad9f",
};

const TAXONOMY: Record<string, string> = {
  Geography:
    "geography geomorphology climatology oceanography cartography gis remote sensing cyclone monsoon plateau basin soil topography dem sar rainfall drainage insar river drainage",
  Polity:
    "polity constitution parliament supreme court article amendment election governance bill rights preamble judiciary federalism secularism emergency",
  History:
    "history ancient medieval modern empire mughal maurya british revolt freedom struggle chola battle civilization vedic arthashastra",
  Economy:
    "economy gdp inflation budget tax rbi monetary fiscal trade export import bank forex banking capital debt macroeconomics repo",
  Tech: "code coding programming python javascript api web react node docker linux database git cloud model ml ai rag llm pipeline embedding",
  Science:
    "physics chemistry biology space isro nasa planet telescope gene disease vaccine cell quantum ecosystem biodiversity satellite heat",
};

const WORD_MAP: Record<string, string> = {};
for (const cat of Object.keys(TAXONOMY)) {
  for (const word of TAXONOMY[cat].split(" ")) WORD_MAP[word] = cat;
}

export function classifyText(text: string, fallbackType?: string): string {
  const words = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  const counts: Record<string, number> = {};
  for (const word of words) {
    const root = word.replace(/ing$/, "").replace(/s$/, "");
    const matched = WORD_MAP[word] || WORD_MAP[root];
    if (matched) counts[matched] = (counts[matched] || 0) + 1;
  }
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (best) return best[0];
  const defaults: Record<string, string> = {
    youtube: "Tech",
    link: "General",
    note: "General",
    image: "Science",
  };
  return (fallbackType && defaults[fallbackType]) || "General";
}

export function ytId(url: string): string | null {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/");
    if (parsed.hostname === "youtu.be") return parts[1] || null;
    if (["shorts", "embed", "live"].includes(parts[1] || "")) return parts[2] || null;
    return parsed.searchParams.get("v");
  } catch {
    return null;
  }
}

function countWords(title: string, desc: string) {
  const words = `${title} ${desc}`.split(/\s+/).filter(Boolean).length;
  return { wordCount: words, readTime: Math.max(1, Math.ceil(words / 180)) };
}

export function buildCard(raw: string, img?: string | null): StashCard {
  const text = raw.trim();
  const urlMatch = text.match(/https?:\/\/[^\s]+/);
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  const base = { id, t: Date.now() };

  if (urlMatch) {
    const url = urlMatch[0];
    let host = "link";
    try {
      host = new URL(url).hostname.replace(/^www\./, "");
    } catch {
      host = "link";
    }
    let type: CardType = "link";
    if (/(^|\.)(youtube\.com|youtu\.be)$/.test(host)) type = "youtube";
    else if (/(^|\.)(twitter\.com|x\.com)$/.test(host)) type = "tweet";
    else if (/(^|\.)(reddit\.com|redd\.it)$/.test(host)) type = "reddit";
    const rest = text.replace(url, "").trim().split("\n").filter(Boolean);
    const title =
      rest[0] ||
      (() => {
        try {
          return new URL(url).pathname.split("/").filter(Boolean).pop() || host;
        } catch {
          return "Saved link";
        }
      })();
    const desc = rest.slice(1).join("\n");
    const card: StashCard = {
      ...base,
      type,
      url,
      host,
      title,
      desc,
      cat: "General",
      ...countWords(title, desc),
    };
    if (img) card.img = img;
    card.cat = classifyText(`${title} ${desc} ${url}`, type);
    return card;
  }

  const lines = text.split("\n").filter(Boolean);
  if (img) {
    const title = lines[0] || "Visual excerpt";
    const desc = lines.slice(1).join("\n");
    return {
      ...base,
      type: "image",
      host: "Diagram",
      title,
      desc,
      img,
      cat: classifyText(`${title} ${desc}`, "image"),
      ...countWords(title, desc),
    };
  }

  const first = lines[0] || "Quick note";
  const title = first.length > 90 ? `${first.slice(0, 90)}…` : first;
  const desc = lines.length > 1 ? lines.slice(1).join("\n") : first.length > 90 ? first.slice(90) : "";
  return {
    ...base,
    type: "note",
    host: "Vault note",
    title,
    desc,
    cat: classifyText(`${title} ${desc}`, "note"),
    ...countWords(title, desc),
  };
}

export function timeAgo(t: number): string {
  const minutes = (Date.now() - t) / 60000;
  if (minutes < 1) return "now";
  if (minutes < 60) return `${Math.floor(minutes)}m`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  return new Date(t).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderMarkdown(md: string): string {
  if (!md) return "";
  return md
    .split("\n")
    .map((line) => {
      const task = line.match(/^- \[([ x])\] (.*)$/);
      if (task) {
        const done = task[1] === "x";
        const raw = escapeHtml(task[2]);
        return `<div class="task${done ? " is-done" : ""}"><input type="checkbox" data-task="${raw}"${done ? " checked" : ""} /> <span>${inline(task[2])}</span></div>`;
      }
      if (line.startsWith("> ")) return `<blockquote>${inline(line.slice(2))}</blockquote>`;
      if (line.startsWith("### ")) return `<strong class="md-h">${inline(line.slice(4))}</strong>`;
      if (line.startsWith("## ")) return `<strong class="md-h md-h2">${inline(line.slice(3))}</strong>`;
      if (line.startsWith("# ")) return `<strong class="md-h md-h1">${inline(line.slice(2))}</strong>`;
      if (line.startsWith("- ")) return `<span class="bullet">${inline(line.slice(2))}</span>`;
      if (!line) return "";
      return inline(line);
    })
    .join("<br />");
}

function inline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\[\[(.*?)\]\]/g, (_m, name) => {
      const safe = escapeHtml(name);
      return `<button type="button" class="wikilink" data-link="${safe}">${safe}</button>`;
    });
}

export function backlinks(card: StashCard): string[] {
  const matches = `${card.title} ${card.desc}`.match(/\[\[(.*?)\]\]/g) || [];
  return [...new Set(matches.map((m) => m.slice(2, -2)))];
}

const SEED_SOURCE: Array<Omit<StashCard, "wordCount" | "readTime">> = [
  {
    id: "geo-1",
    t: Date.now() - 3600000 * 2,
    type: "note",
    host: "Field note",
    cat: "Geography",
    title: "Geomorphic thresholds and InSAR subsidence",
    desc: "**Key rule:** slope failure begins when *shear stress* exceeds *shear strength*.\n\n> Sentinel-1 C-band InSAR reads phase displacement at about 1–2 mm across urban footings.\n\n- [x] Review [[InSAR]] phase interferogram\n- [ ] Calibrate [[SAR Remote Sensing]] baseline\n- [ ] Cross-check borehole tiltmeters",
  },
  {
    id: "geo-2",
    t: Date.now() - 3600000 * 5,
    type: "note",
    host: "Field note",
    cat: "Geography",
    title: "Antecedent rivers on a tilted plateau",
    desc: "Peninsular rivers — Godavari, Krishna, Mahanadi — run east into the Bay of Bengal after a tertiary tilt, cutting dendritic patterns through the Deccan traps.\n\nRelated: [[Drainage]] · [[Deccan]]",
  },
  {
    id: "pol-1",
    t: Date.now() - 3600000 * 8,
    type: "note",
    host: "Doctrine",
    cat: "Polity",
    title: "Basic structure — Kesavananda Bharati, 1973",
    desc: "Article 368 lets Parliament amend. It does not let Parliament erase the **constitutional identity**: rule of law, federalism, judicial review, secularism.\n\nFlip this card in revise mode. The title is the question. This face is the answer.",
  },
  {
    id: "pol-2",
    t: Date.now() - 3600000 * 12,
    type: "note",
    host: "Doctrine",
    cat: "Polity",
    title: "Article 356 and the Bommai limits",
    desc: "A proclamation dissolving a state government is open to judicial review. Secularism, already part of the basic structure, blocks arbitrary dismissal.\n\nSee [[Basic structure]].",
  },
  {
    id: "eco-1",
    t: Date.now() - 3600000 * 20,
    type: "note",
    host: "Macro",
    cat: "Economy",
    title: "Repo, LAF, and the inflation band",
    desc: "The Monetary Policy Committee moves the repo rate to hold CPI near 4% (±2%) without starving productive credit. Liquidity is managed through the LAF corridor.",
  },
  {
    id: "sci-1",
    t: Date.now() - 3600000 * 26,
    type: "link",
    host: "nature.com",
    url: "https://www.nature.com/articles/urban-heat",
    cat: "Science",
    title: "Concrete holds the day's heat",
    desc: "Dense cores run 4–6°C warmer than the rural edge. Dark asphalt and low-albedo roofs are the trap. Useful beside a [[Urban heat]] practical.",
  },
  {
    id: "tech-1",
    t: Date.now() - 3600000 * 30,
    type: "note",
    host: "Systems",
    cat: "Tech",
    title: "Cosine proximity without hand-made tags",
    desc: "Normalize the vectors, then the dot product is the angle. Similar notes pull together in the graph even when you never filed them under the same heading.",
  },
  {
    id: "hist-1",
    t: Date.now() - 3600000 * 40,
    type: "note",
    host: "Archive",
    cat: "History",
    title: "Saptanga — seven limbs of the Mauryan state",
    desc: "Kautilya’s Arthashastra: Swami, Amatya, Janapada, Durga, Kosha, Danda, Mitra. King, ministers, territory, fort, treasury, force, ally.",
  },
];

export const SEED: StashCard[] = SEED_SOURCE.map((card) => ({
  ...card,
  ...countWords(card.title, card.desc),
}));

export function heatmapCells(cards: StashCard[]) {
  const counts: Record<string, number> = {};
  for (const card of cards) {
    const d = new Date(card.t);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    counts[key] = (counts[key] || 0) + 1;
  }
  const weeks = 16;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setDate(start.getDate() - start.getDay() - (weeks - 1) * 7);
  const cells: Array<{ key: string; count: number; label: string; future: boolean }> = [];
  for (let i = 0; i < weeks * 7; i++) {
    const day = new Date(start);
    day.setDate(start.getDate() + i);
    const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}`;
    cells.push({
      key,
      count: counts[key] || 0,
      label: `${day.toDateString()}: ${counts[key] || 0} saved`,
      future: day > today,
    });
  }
  let streak = 0;
  const cursor = new Date(today);
  const todayKey = `${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`;
  if (!counts[todayKey]) cursor.setDate(cursor.getDate() - 1);
  while (counts[`${cursor.getFullYear()}-${cursor.getMonth()}-${cursor.getDate()}`]) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return { cells, streak };
}

export function toMarkdownVault(cards: StashCard[]): string {
  let out = `# Stash vault\nExported ${new Date().toISOString()}\nItems: ${cards.length}\n\n`;
  for (const card of cards) {
    out += `---
title: "${card.title.replace(/"/g, '\\"')}"
date: ${new Date(card.t).toISOString()}
tags:
  - ${card.cat}
  - ${card.type}
url: "${card.url || ""}"
---

# ${card.title}

${card.desc || ""}

${card.url ? `Source: ${card.url}` : ""}

`;
  }
  return out;
}

export function toCsv(cards: StashCard[]): string {
  const header = ["id", "type", "category", "title", "description", "url", "words", "timestamp"];
  const rows = cards.map((card) =>
    [
      card.id,
      card.type,
      card.cat,
      `"${card.title.replace(/"/g, '""')}"`,
      `"${(card.desc || "").replace(/"/g, '""')}"`,
      card.url || "",
      String(card.wordCount),
      new Date(card.t).toISOString(),
    ].join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

export function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
