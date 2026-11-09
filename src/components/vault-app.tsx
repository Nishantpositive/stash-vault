import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Glyph, IconButton, type GlyphName } from "@/components/glyphs";
import { GraphView } from "@/components/graph-view";
import { Mark } from "@/components/mark";
import { clearCards, deleteCard, loadCards, saveCard } from "@/lib/stash/db";
import {
  SEED,
  TOPIC_INK,
  backlinks,
  buildCard,
  downloadText,
  heatmapCells,
  renderMarkdown,
  timeAgo,
  toCsv,
  toMarkdownVault,
  type StashCard,
} from "@/lib/stash/model";
import { toggleTheme } from "@/lib/stash/theme";

type Sheet = "carry" | "pulse" | "hands" | null;

function matchesType(card: StashCard, type: string) {
  if (type === "all") return true;
  if (type === "link") return card.type === "link" || card.type === "tweet" || card.type === "reddit";
  return card.type === type;
}

function encodeDrop(items: StashCard[]) {
  const payload = JSON.stringify(
    items.slice(0, 10).map((card) => ({
      id: card.id,
      t: card.t,
      type: card.type,
      cat: card.cat,
      host: card.host,
      title: card.title,
      desc: card.desc,
      url: card.url,
      wordCount: card.wordCount,
      readTime: card.readTime,
    })),
  );
  const b64 = btoa(unescape(encodeURIComponent(payload)));
  return `${window.location.origin}${window.location.pathname}#drop=${encodeURIComponent(b64)}`;
}

function parseDrop(hash: string): StashCard[] | null {
  if (!hash.startsWith("#drop=")) return null;
  try {
    const raw = decodeURIComponent(escape(atob(decodeURIComponent(hash.slice(6)))));
    const parsed = JSON.parse(raw) as StashCard[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

async function copyText(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function VaultApp() {
  const [cards, setCards] = useState<StashCard[] | null>(null);
  const [type, setType] = useState("all");
  const [cat, setCat] = useState("all");
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState(0);
  const [readerId, setReaderId] = useState<string | null>(null);
  const [composer, setComposer] = useState(false);
  const [draft, setDraft] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [graph, setGraph] = useState(false);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [revise, setRevise] = useState(false);
  const [flipped, setFlipped] = useState<Record<string, boolean>>({});
  const [toast, setToast] = useState("");
  const [undo, setUndo] = useState<StashCard | null>(null);
  const [serif, setSerif] = useState(false);
  const [armedClear, setArmedClear] = useState(false);
  const [importText, setImportText] = useState("");
  const [drop, setDrop] = useState<StashCard[] | null>(null);
  const [progress, setProgress] = useState(0);
  const pending = useRef<StashCard | null>(null);
  const undoTimer = useRef<number | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const flags = useRef({ graph: false, reader: false, composer: false, sheet: false });

  const active = useMemo(() => {
    if (!cards) return [];
    const q = query.trim().toLowerCase();
    return cards
      .filter((card) => {
        const typeOk = matchesType(card, type);
        const catOk = cat === "all" || card.cat === cat;
        const text = `${card.title} ${card.desc} ${card.cat} ${card.host}`.toLowerCase();
        return typeOk && catOk && (!q || text.includes(q));
      })
      .sort((a, b) => b.t - a.t);
  }, [cards, type, cat, query]);

  const focus = active[index] ?? null;
  const reader = cards?.find((card) => card.id === readerId) ?? null;
  flags.current = { graph, reader: Boolean(reader), composer, sheet: Boolean(sheet) };

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const loaded = await loadCards();
        if (cancel) return;
        if (loaded.length === 0) {
          for (const card of SEED) await saveCard(card);
          setCards(SEED);
        } else {
          setCards(loaded.sort((a, b) => b.t - a.t));
        }
      } catch {
        if (!cancel) setCards(SEED);
      }
      if (!cancel) setDrop(parseDrop(window.location.hash));
    })();
    try {
      setRevise(localStorage.getItem("stash.revise") === "1");
    } catch {
      /* ignore */
    }
    return () => {
      cancel = true;
    };
  }, []);

  useEffect(() => {
    if (index > active.length - 1) setIndex(Math.max(0, active.length - 1));
  }, [active.length, index]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(""), 2400);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const tag = (event.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        if (event.key === "Escape") (event.target as HTMLElement).blur();
        return;
      }
      if (event.key === "Escape") {
        setGraph(false);
        setReaderId(null);
        setComposer(false);
        setSheet(null);
        return;
      }
      if (flags.current.graph || flags.current.composer || flags.current.reader || flags.current.sheet) return;
      if (event.key === "ArrowRight" || event.key === "k" || event.key === "K") {
        setIndex((value) => Math.min(Math.max(active.length - 1, 0), value + 1));
      } else if (event.key === "ArrowLeft" || event.key === "j" || event.key === "J") {
        setIndex((value) => Math.max(0, value - 1));
      } else if (event.key === " ") {
        event.preventDefault();
        setFlipped((current) => {
          const card = active[index];
          if (!card) return current;
          return { ...current, [card.id]: !current[card.id] };
        });
      } else if (event.key === "r" || event.key === "R") {
        const card = active[index];
        if (card) setReaderId(card.id);
      } else if (event.key === "c" || event.key === "C") {
        setComposer(true);
      } else if (event.key === "g" || event.key === "G") {
        setGraph((open) => !open);
      } else if (event.key === "/") {
        event.preventDefault();
        searchRef.current?.focus();
      } else if (event.key === "?") {
        setSheet((current) => (current === "hands" ? null : "hands"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, index]);

  function notify(message: string) {
    setToast(message);
  }

  function remember() {
    if (active.length === 0) return;
    const next = Math.floor(Math.random() * active.length);
    setIndex(next);
    setFlipped({});
    notify(`Remembered · ${active[next]?.title ?? "a card"}`);
  }

  function openComposer() {
    setComposer(true);
  }

  async function commit() {
    if (!draft.trim() && !photo) {
      notify("Write a note or attach an image");
      return;
    }
    const card = buildCard(draft, photo);
    setCards((list) => [card, ...(list || [])]);
    setIndex(0);
    setType("all");
    setCat("all");
    setQuery("");
    setDraft("");
    setPhoto(null);
    setComposer(false);
    await saveCard(card);
    notify("Stashed");
  }

  function remove(card: StashCard) {
    if (pending.current) void deleteCard(pending.current.id);
    if (undoTimer.current) window.clearTimeout(undoTimer.current);
    pending.current = card;
    setCards((list) => (list || []).filter((item) => item.id !== card.id));
    setUndo(card);
    undoTimer.current = window.setTimeout(() => {
      if (pending.current?.id === card.id) {
        void deleteCard(card.id);
        pending.current = null;
        setUndo(null);
      }
    }, 4200);
  }

  function restore() {
    const card = pending.current;
    if (!card) return;
    if (undoTimer.current) window.clearTimeout(undoTimer.current);
    pending.current = null;
    setUndo(null);
    setCards((list) => [card, ...(list || [])].sort((a, b) => b.t - a.t));
    notify("Restored");
  }

  function toggleTask(card: StashCard, task: string, checked: boolean) {
    const next = checked
      ? card.desc.replace(`- [ ] ${task}`, `- [x] ${task}`)
      : card.desc.replace(`- [x] ${task}`, `- [ ] ${task}`);
    const updated = { ...card, desc: next };
    setCards((list) => (list || []).map((item) => (item.id === card.id ? updated : item)));
    void saveCard(updated);
  }

  async function importJson() {
    try {
      const data = JSON.parse(importText) as StashCard[];
      if (!Array.isArray(data)) throw new Error("not a list");
      const have = new Set((cards || []).map((card) => card.id));
      let count = 0;
      const added: StashCard[] = [];
      for (const item of data) {
        if (item && item.id && item.title && !have.has(item.id)) {
          added.push(item);
          have.add(item.id);
          await saveCard(item);
          count += 1;
        }
      }
      setCards((list) => [...added, ...(list || [])].sort((a, b) => b.t - a.t));
      setImportText("");
      notify(`Imported ${count}`);
    } catch {
      notify("That buffer is not a Stash JSON list");
    }
  }

  async function acceptDrop() {
    if (!drop || !cards) return;
    const have = new Set(cards.map((card) => card.id));
    let count = 0;
    const added: StashCard[] = [];
    for (const card of drop) {
      if (!have.has(card.id)) {
        added.push(card);
        await saveCard(card);
        count += 1;
      }
    }
    setCards((list) => [...added, ...(list ?? [])].sort((a, b) => b.t - a.t));
    setDrop(null);
    window.location.hash = "";
    notify(`Imported ${count} from the drop`);
  }

  const cats = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const card of cards || []) counts[card.cat] = (counts[card.cat] || 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [cards]);

  const heat = useMemo(() => heatmapCells(cards || []), [cards]);

  if (!cards) {
    return (
      <main className="vault boot">
        <Mark size={36} />
        <p>Opening the vault…</p>
      </main>
    );
  }

  return (
    <main className="vault">
      <header className="v-top">
        <Link to="/" className="brand" aria-label="Stash home">
          <Mark size={26} />
          <span>Stash</span>
        </Link>
        <label className="search-field">
          <Glyph name="search" />
          <input
            ref={searchRef}
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setIndex(0);
            }}
            placeholder="Search notes, links, [[topics]]"
            aria-label="Search the vault"
          />
        </label>
        <div className="v-top-actions">
          <button type="button" className="quiet-stat" onClick={() => setSheet("pulse")}>
            {cards.length} · {heat.streak}d
          </button>
          <button
            type="button"
            className={revise ? "text-btn on" : "text-btn"}
            onClick={() => {
              setRevise((value) => {
                localStorage.setItem("stash.revise", value ? "0" : "1");
                return !value;
              });
            }}
          >
            Revise
          </button>
          <IconButton name="theme" label="Toggle light or dark" onClick={() => toggleTheme()} />
        </div>
      </header>

      <div className="chip-row" role="tablist" aria-label="Format">
        {[
          ["all", "All"],
          ["note", "Notes"],
          ["link", "Links"],
          ["youtube", "Video"],
          ["image", "Images"],
        ].map(([id, label]) => (
          <button key={id} type="button" className={type === id ? "chip on" : "chip"} onClick={() => { setType(id); setIndex(0); }}>
            {label}
          </button>
        ))}
        <span className="chip-gap" />
        <button type="button" className={cat === "all" ? "chip on" : "chip"} onClick={() => { setCat("all"); setIndex(0); }}>
          Topics
        </button>
        {cats.map(([name]) => (
          <button key={name} type="button" className={cat === name ? "chip on" : "chip"} onClick={() => { setCat(name); setIndex(0); }}>
            <i style={{ background: TOPIC_INK[name] || TOPIC_INK.General }} />
            {name}
          </button>
        ))}
      </div>

      {drop ? (
        <div className="drop-bar">
          <p>A drop arrived with {drop.length} card{drop.length === 1 ? "" : "s"}.</p>
          <button type="button" className="text-btn" onClick={() => { setDrop(null); window.location.hash = ""; }}>
            Dismiss
          </button>
          <button type="button" className="brass-btn" onClick={() => void acceptDrop()}>
            Import
          </button>
        </div>
      ) : null}

      <Deck
        card={focus}
        index={index}
        total={active.length}
        flipped={focus ? Boolean(flipped[focus.id]) : false}
        revise={revise}
        onPrev={() => setIndex((value) => Math.max(0, value - 1))}
        onNext={() => setIndex((value) => Math.min(active.length - 1, value + 1))}
        onRead={() => focus && setReaderId(focus.id)}
        onRemember={remember}
        onFlip={() => focus && setFlipped((current) => ({ ...current, [focus.id]: !current[focus.id] }))}
        onShare={() => {
          if (!focus) return;
          const link = encodeDrop([focus]);
          void copyText(link).then((ok) => notify(ok ? "Drop link copied" : "Could not copy the link"));
        }}
        onCopy={() => {
          if (!focus) return;
          const text = `${focus.title}\n${focus.desc}\n${focus.url || ""}`.trim();
          void copyText(text).then((ok) => notify(ok ? "Copied" : "Could not copy"));
        }}
        onDelete={() => focus && remove(focus)}
        onWiki={(tag) => {
          setQuery(tag);
          setIndex(0);
          notify(`Filtered · ${tag}`);
        }}
        onTask={(task, checked) => focus && toggleTask(focus, task, checked)}
        onAdd={openComposer}
      />

      <nav className="dock" aria-label="Vault actions">
        <IconButton name="hands" label="Gestures" onClick={() => setSheet("hands")} />
        <IconButton name="spark" label="Remember an older card" onClick={remember} />
        <IconButton name="plus" label="New note" tone="brass" onClick={openComposer} />
        <IconButton name="graph" label="Open graph" onClick={() => (cards.length ? setGraph(true) : notify("Stash a note first"))} />
        <IconButton name="carry" label="Export and import" onClick={() => setSheet("carry")} />
      </nav>

      {undo ? (
        <div className="undo" role="status">
          <span>Card removed</span>
          <button type="button" onClick={restore}>
            Undo
          </button>
        </div>
      ) : null}
      {toast ? (
        <p className="toast" role="status">
          {toast}
        </p>
      ) : null}

      {composer ? (
        <div className="overlay" onClick={() => setComposer(false)}>
          <div className="sheet composer" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-head">
              <h2>New stash</h2>
              <IconButton name="close" label="Close composer" onClick={() => setComposer(false)} />
            </div>
            {photo ? <img className="photo-preview" src={photo} alt="" /> : null}
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="A title, then the note. Paste a link. Markdown, tasks, and [[wikilinks]] work."
              rows={6}
              autoFocus
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  event.preventDefault();
                  void commit();
                }
              }}
            />
            <div className="sheet-actions">
              <label className="text-btn">
                Image
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => setPhoto(String(reader.result || ""));
                    reader.readAsDataURL(file);
                    event.target.value = "";
                  }}
                />
              </label>
              <button type="button" className="brass-btn" onClick={() => void commit()}>
                Save
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {sheet ? (
        <div className="overlay" onClick={() => setSheet(null)}>
          <div className="sheet" onClick={(event) => event.stopPropagation()}>
            <div className="sheet-head">
              <h2>{sheet === "carry" ? "Carry" : sheet === "pulse" ? "Pulse" : "Hands"}</h2>
              <IconButton name="close" label="Close" onClick={() => setSheet(null)} />
            </div>
            {sheet === "hands" ? <Hands /> : null}
            {sheet === "pulse" ? (
              <div>
                <p className="muted">
                  {cards.length} saved · {heat.streak}-day streak
                </p>
                <div className="heat" aria-hidden="true">
                  {heat.cells.map((cell) => (
                    <i
                      key={cell.key + cell.label}
                      title={cell.label}
                      style={{
                        opacity: cell.future ? 0 : [0.12, 0.35, 0.55, 0.78, 1][Math.min(4, cell.count)],
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : null}
            {sheet === "carry" ? (
              <div className="carry">
                <div className="wrap-row">
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() => {
                      downloadText(`stash-${Date.now()}.md`, toMarkdownVault(cards), "text/markdown");
                      notify("Markdown downloaded");
                    }}
                  >
                    Obsidian .md
                  </button>
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() => {
                      downloadText(`stash-${Date.now()}.csv`, toCsv(cards), "text/csv");
                      notify("CSV downloaded");
                    }}
                  >
                    CSV
                  </button>
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() => {
                      setImportText(JSON.stringify(cards, null, 2));
                      void copyText(JSON.stringify(cards)).then((ok) => notify(ok ? "JSON copied" : "JSON is in the box"));
                    }}
                  >
                    JSON
                  </button>
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() => {
                      const link = encodeDrop(active);
                      void copyText(link).then((ok) => notify(ok ? "Drop link copied" : "Could not copy"));
                    }}
                  >
                    Share drop
                  </button>
                </div>
                <textarea
                  value={importText}
                  onChange={(event) => setImportText(event.target.value)}
                  placeholder="Paste a JSON list to import"
                  rows={5}
                />
                <div className="sheet-actions">
                  <button
                    type="button"
                    className="danger-btn"
                    onClick={() => {
                      if (!armedClear) {
                        setArmedClear(true);
                        window.setTimeout(() => setArmedClear(false), 3000);
                        return;
                      }
                      void clearCards();
                      setCards([]);
                      setArmedClear(false);
                      notify("Vault cleared");
                    }}
                  >
                    {armedClear ? "Tap again to clear" : "Clear all"}
                  </button>
                  <button type="button" className="brass-btn" onClick={() => void importJson()}>
                    Import JSON
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {reader ? (
        <div className="reader" role="dialog" aria-modal="true" aria-label="Reader">
          <div className="reader-bar">
            <span className="eyebrow">{reader.cat}</span>
            <span className="muted">
              {reader.host} · {reader.wordCount} words · {reader.readTime} min
            </span>
            <button type="button" className="text-btn" onClick={() => setSerif((value) => !value)}>
              {serif ? "Sans" : "Serif"}
            </button>
            <button type="button" className="text-btn" onClick={() => setReaderId(null)}>
              Close
            </button>
          </div>
          <div
            className="reader-progress"
            style={{ transform: `scaleX(${progress})` }}
          />
          <article
            className={serif ? "reader-body serif" : "reader-body"}
            onScroll={(event) => {
              const el = event.currentTarget;
              const max = el.scrollHeight - el.clientHeight;
              setProgress(max <= 0 ? 1 : el.scrollTop / max);
            }}
            onPointerDown={(event) => {
              const startY = event.clientY;
              const move = (ev: PointerEvent) => {
                if (ev.clientY - startY > 90 && event.currentTarget.scrollTop < 8) {
                  setReaderId(null);
                  window.removeEventListener("pointermove", move);
                }
              };
              window.addEventListener("pointermove", move);
              window.addEventListener("pointerup", () => window.removeEventListener("pointermove", move), { once: true });
            }}
          >
            <h2>{reader.title}</h2>
            <div
              className="prose"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(reader.desc || "No body yet.") }}
              onClick={(event) => {
                const link = (event.target as HTMLElement).closest("[data-link]");
                if (!(link instanceof HTMLElement) || !link.dataset.link) return;
                setQuery(link.dataset.link);
                setReaderId(null);
              }}
            />
            {reader.url ? (
              <p>
                <a href={reader.url} target="_blank" rel="noreferrer">
                  {reader.host}
                </a>
              </p>
            ) : null}
          </article>
        </div>
      ) : null}

      {graph ? (
        <GraphView
          cards={active.length ? active : cards}
          onClose={() => setGraph(false)}
          onOpen={(id) => {
            setGraph(false);
            const found = active.findIndex((card) => card.id === id);
            if (found >= 0) setIndex(found);
            else {
              setType("all");
              setCat("all");
              setQuery("");
              const globalIndex = cards.findIndex((card) => card.id === id);
              setIndex(Math.max(0, globalIndex));
            }
          }}
        />
      ) : null}
    </main>
  );
}

function Hands() {
  const rows: Array<{ name: GlyphName; title: string; body: string }> = [
    { name: "left", title: "Swipe sideways", body: "Move through the deck. Arrow keys, J and K do the same." },
    { name: "flip", title: "Double-tap or Space", body: "Flip the card. In Revise, the face is the question." },
    { name: "book", title: "Swipe up or R", body: "Open the reader. Swipe down from the top to close it." },
    { name: "spark", title: "Pull down", body: "Remember — an older card steps forward." },
    { name: "plus", title: "C", body: "New note. Ctrl or ⌘ Enter saves." },
    { name: "graph", title: "G", body: "The graph. Drag nodes, scroll to zoom." },
    { name: "search", title: "/", body: "Focus search." },
  ];
  return (
    <ul className="hands-list">
      {rows.map((row) => (
        <li key={row.title}>
          <Glyph name={row.name} />
          <div>
            <strong>{row.title}</strong>
            <p>{row.body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

function Deck({
  card,
  index,
  total,
  flipped,
  revise,
  onPrev,
  onNext,
  onRead,
  onRemember,
  onFlip,
  onShare,
  onCopy,
  onDelete,
  onWiki,
  onTask,
  onAdd,
}: {
  card: StashCard | null;
  index: number;
  total: number;
  flipped: boolean;
  revise: boolean;
  onPrev: () => void;
  onNext: () => void;
  onRead: () => void;
  onRemember: () => void;
  onFlip: () => void;
  onShare: () => void;
  onCopy: () => void;
  onDelete: () => void;
  onWiki: (tag: string) => void;
  onTask: (task: string, checked: boolean) => void;
  onAdd: () => void;
}) {
  const drag = useRef({ x0: 0, y0: 0, x: 0, y: 0, mode: "idle" as "idle" | "drag" | "ignore" });
  const lastTap = useRef(0);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [animate, setAnimate] = useState(true);
  const [pulse, setPulse] = useState(false);

  if (!card) {
    return (
      <section className="stage">
        <div className="empty">
          <Mark size={42} />
          <h2>Nothing in this cut</h2>
          <p>Clear a filter, or stash the next thing before it cools.</p>
          <button type="button" className="brass-btn" onClick={onAdd}>
            New note
          </button>
        </div>
      </section>
    );
  }

  function settle(x: number, y: number) {
    if (x <= -70 && index < total - 1) onNext();
    else if (x >= 70 && index > 0) onPrev();
    else if (y <= -80 && Math.abs(y) > Math.abs(x)) onRead();
    else if (y >= 96 && Math.abs(y) > Math.abs(x)) {
      onRemember();
      setPulse(true);
      window.setTimeout(() => setPulse(false), 1200);
    }
    setAnimate(true);
    setOffset({ x: 0, y: 0 });
  }

  const ink = TOPIC_INK[card.cat] || TOPIC_INK.General;
  const links = backlinks(card);

  return (
    <section className="stage">
      <p className="deck-count">
        {index + 1} of {total}
      </p>
      <div className="rail">
        <IconButton name="left" label="Previous card" onClick={onPrev} />
        <div
          className={pulse ? "v-card pulse" : "v-card"}
          style={{
            transform: `translate3d(${offset.x}px, ${offset.y * 0.45}px, 0) rotate(${offset.x / 28}deg)`,
            transition: animate ? "transform 220ms cubic-bezier(0.16, 1, 0.3, 1)" : "none",
          }}
          onPointerDown={(event) => {
            const target = event.target as HTMLElement;
            if (target.closest("button, a, input, textarea")) return;
            drag.current = { x0: event.clientX, y0: event.clientY, x: 0, y: 0, mode: "idle" };
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (drag.current.mode === "ignore") return;
            if (drag.current.x0 === 0 && drag.current.y0 === 0) return;
            const x = event.clientX - drag.current.x0;
            const y = event.clientY - drag.current.y0;
            if (drag.current.mode === "idle") {
              if (Math.hypot(x, y) < 8) return;
              const inBody = (event.target as HTMLElement).closest(".card-body");
              if (inBody && Math.abs(y) > Math.abs(x)) {
                drag.current.mode = "ignore";
                return;
              }
              drag.current.mode = "drag";
              setAnimate(false);
            }
            if (drag.current.mode !== "drag") return;
            drag.current.x = x;
            drag.current.y = y;
            setOffset({ x, y });
          }}
          onPointerUp={() => {
            if (drag.current.mode === "drag") settle(drag.current.x, drag.current.y);
            else if (drag.current.mode === "idle") {
              const now = Date.now();
              if (now - lastTap.current < 280) onFlip();
              lastTap.current = now;
            }
            drag.current = { x0: 0, y0: 0, x: 0, y: 0, mode: "idle" };
          }}
          onPointerCancel={() => {
            drag.current = { x0: 0, y0: 0, x: 0, y: 0, mode: "idle" };
            setAnimate(true);
            setOffset({ x: 0, y: 0 });
          }}
        >
          <div className={flipped ? "card-inner is-flipped" : "card-inner"}>
            <div className="card-face front" inert={flipped}>
              <header className="card-kicker">
                <span className="eyebrow">
                  <i className="tick" style={{ background: ink }} />
                  {card.cat}
                </span>
                <span className="muted">{card.type}</span>
              </header>
              {card.img ? <img src={card.img} alt="" className="card-photo" /> : null}
              <h2>{card.url ? <a href={card.url} target="_blank" rel="noreferrer">{card.title}</a> : card.title}</h2>
              <div
                className="card-body"
                onClick={(event) => {
                  const link = (event.target as HTMLElement).closest("[data-link]");
                  if (link instanceof HTMLElement && link.dataset.link) onWiki(link.dataset.link);
                }}
                onChange={(event) => {
                  const input = event.target;
                  if (!(input instanceof HTMLInputElement) || !input.dataset.task) return;
                  onTask(input.dataset.task, input.checked);
                }}
              >
                {revise ? (
                  <p className="revise-hint">Question on this face. Double-tap for the answer.</p>
                ) : (
                  <div className="prose" dangerouslySetInnerHTML={{ __html: renderMarkdown(card.desc) }} />
                )}
              </div>
              <footer className="card-foot">
                <span className="muted">
                  {card.host} · {timeAgo(card.t)}
                </span>
                <div className="card-tools">
                  <IconButton name="book" label="Read" onClick={onRead} />
                  <IconButton name="flip" label="Flip card" onClick={onFlip} />
                  <IconButton name="share" label="Share drop" onClick={onShare} />
                  <IconButton name="copy" label="Copy note" onClick={onCopy} />
                  <IconButton name="trash" label="Delete card" onClick={onDelete} />
                </div>
              </footer>
            </div>
            <div className="card-face back" inert={!flipped}>
              <header className="card-kicker">
                <span className="eyebrow">Answer</span>
                <IconButton name="flip" label="Flip back" onClick={onFlip} />
              </header>
              <div className="card-body">
                <div className="prose serif" dangerouslySetInnerHTML={{ __html: renderMarkdown(card.desc || "No answer written yet.") }} />
                <p className="muted fine">
                  {card.wordCount} words · {card.readTime} min · {new Date(card.t).toLocaleString()}
                </p>
                <div className="link-row">
                  {links.length === 0 ? <span className="muted">No wikilinks yet</span> : null}
                  {links.map((link) => (
                    <button key={link} type="button" className="wikilink" onClick={() => onWiki(link)}>
                      {link}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <IconButton name="right" label="Next card" onClick={onNext} />
      </div>
    </section>
  );
}
