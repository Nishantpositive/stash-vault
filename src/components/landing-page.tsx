import { Link } from "@tanstack/react-router";
import { type FormEvent, useState } from "react";
import { Glyph } from "@/components/glyphs";
import { Mark } from "@/components/mark";
import { toggleTheme } from "@/lib/stash/theme";

const NAV = [
  { id: "product", label: "Product" },
  { id: "features", label: "Features" },
  { id: "gestures", label: "Gestures" },
  { id: "pricing", label: "Pricing" },
  { id: "stories", label: "Stories" },
];

const FEATURES = [
  {
    name: "graph",
    title: "One card in front",
    body: "The cover flow keeps a single note large. Neighbours sit behind it, out of the way, until your hand brings them forward.",
  },
  {
    name: "flip",
    title: "The answer is on the back",
    body: "Write the question as the title. Flip the card and the note becomes a revise drill — no separate flashcard app.",
  },
  {
    name: "book",
    title: "A reader with nothing else on screen",
    body: "Swipe up and the chrome leaves. Serif or sans, a thin progress line, and the paragraph you actually came for.",
  },
  {
    name: "spark",
    title: "Remember, on purpose",
    body: "Pull down and Stash surfaces an older card. Serendipity with a brake, not an infinite feed.",
  },
  {
    name: "search",
    title: "Links that are doors",
    body: "Type [[Drainage]] in a note. Tap the chip and the deck narrows to that thread. Backlinks live on the back of the card.",
  },
  {
    name: "carry",
    title: "Leave with your notes",
    body: "Obsidian markdown, CSV, JSON, or a drop link for a handful of cards. The vault does not keep a copy in someone else’s cloud.",
  },
] as const;

const GESTURES = [
  { name: "left", title: "Swipe sideways", body: "Next thought, previous thought. The card follows your finger and commits when you let go." },
  { name: "flip", title: "Double-tap", body: "Turns the card over. Space does the same when a keyboard is near." },
  { name: "book", title: "Swipe up", body: "Opens the quiet reader. Swipe down, or Esc, and you are back on the deck." },
  { name: "spark", title: "Pull down", body: "Remember. A card you have not been staring at steps into the light." },
] as const;

const TIERS = [
  {
    name: "Vault",
    price: "0",
    unit: "forever",
    note: "This device",
    lead: "The product, without an account.",
    points: ["Local cards, no upload", "Cover flow, flip, and reader", "Graph, wikilinks, Remember", "Markdown, CSV, JSON, drops"],
    cta: "Open the vault",
    to: "/vault" as const,
    featured: true,
  },
  {
    name: "Studio",
    price: "Soon",
    unit: "waitlist",
    note: "When you want it",
    lead: "Sync that waits for a yes.",
    points: ["Encrypted device-to-device sync", "A drop that needs a key", "Offline remains the default", "No feed, no suggestions"],
    cta: "Join the list",
    to: "#join",
    featured: false,
  },
  {
    name: "Cohort",
    price: "Soon",
    unit: "waitlist",
    note: "A study circle",
    lead: "Share a deck. Keep your vault.",
    points: ["A taxonomy the circle agrees on", "Import a peer’s drop in one tap", "Your private cards stay private", "Built for revision, not chat"],
    cta: "Join the list",
    to: "#join",
    featured: false,
  },
];

const STORIES = [
  {
    quote: "I stopped opening five apps to revise. One card, then the next. The answer is already on the back.",
    name: "Ananya",
    role: "Revises doctrine between stops",
  },
  {
    quote: "[[Drainage]] is a door, not a decoration. I tap it and the deck is only rivers.",
    name: "Farhan",
    role: "Keeps field notes in the vault",
  },
  {
    quote: "I exported one markdown file. It sat in my other notes the same afternoon. No cleanup project.",
    name: "Meera",
    role: "Leaves with her own archive",
  },
];

function scrollToId(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function LandingPage() {
  const [email, setEmail] = useState("");
  const [joined, setJoined] = useState(false);
  const [menu, setMenu] = useState(false);
  const [error, setError] = useState("");

  function jump(id: string) {
    setMenu(false);
    if (id === "top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    scrollToId(id);
  }

  function onJoin(event: FormEvent) {
    event.preventDefault();
    const value = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setError("Use a full address — name, @, and a domain.");
      return;
    }
    const prior = JSON.parse(localStorage.getItem("stash.waitlist") || "[]") as string[];
    const next = prior.includes(value) ? prior : [...prior, value];
    localStorage.setItem("stash.waitlist", JSON.stringify(next));
    setJoined(true);
    setError("");
  }

  return (
    <div className="site">
      <header className="nav">
        <button type="button" className="brand" onClick={() => jump("top")}>
          <Mark size={28} />
          <span>Stash</span>
        </button>
        <nav className="nav-links" aria-label="Sections">
          {NAV.map((item) => (
            <button key={item.id} type="button" onClick={() => jump(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="nav-actions">
          <button type="button" className="icon-btn nav-menu-btn" aria-expanded={menu} aria-label="Menu" onClick={() => setMenu((open) => !open)}>
            <Glyph name="hands" />
          </button>
          <button type="button" className="icon-btn" aria-label="Toggle light or dark" onClick={() => toggleTheme()}>
            <Glyph name="theme" />
          </button>
          <Link to="/vault" className="brass-btn">
            Open the vault
          </Link>
        </div>
        {menu ? (
          <div className="nav-pop">
            {NAV.map((item) => (
              <button key={item.id} type="button" onClick={() => jump(item.id)}>
                {item.label}
              </button>
            ))}
          </div>
        ) : null}
      </header>

      <main>
        <section className="hero" id="top">
          <div className="hero-copy">
            <p className="kicker">Local-first knowledge vault</p>
            <h1>Stash a thought. Recall it with your hand.</h1>
            <p className="lede">
              Square cards, a living graph, and a reader that gets out of the way. Notes stay on this device until you export them. No account. No feed.
            </p>
            <div className="cta-row">
              <Link to="/vault" className="brass-btn large">
                Open the vault
              </Link>
              <button type="button" className="text-btn large" onClick={() => jump("gestures")}>
                Learn the gestures
              </button>
            </div>
            <ul className="proof">
              <li>On this device</li>
              <li>No account</li>
              <li>Markdown when you leave</li>
            </ul>
          </div>
          <div className="hero-stage" aria-hidden="true">
            <article className="mini-card back-card">
              <p className="eyebrow">History</p>
              <h2>Saptanga — seven limbs of the state</h2>
            </article>
            <article className="mini-card mid-card">
              <p className="eyebrow">Economy</p>
              <h2>Repo, LAF, and the inflation band</h2>
            </article>
            <article className="mini-card front-card">
              <p className="eyebrow">
                <i className="tick" /> Geography
              </p>
              <h2>Thresholds and InSAR subsidence</h2>
              <p>Shear stress against shear strength. The rest of the note waits on the back.</p>
              <div className="mini-icons">
                <Glyph name="book" />
                <Glyph name="flip" />
                <Glyph name="spark" />
              </div>
            </article>
          </div>
        </section>

        <section className="band" id="product">
          <div>
            <p className="kicker">Why Stash</p>
            <h2>A vault, not another inbox.</h2>
          </div>
          <div className="band-copy">
            <p>
              Most note apps are drawers you forget. Stash is a short stack in your hand: one idea large enough to revise, the others waiting in order.
            </p>
            <p>
              The mark is a card with a folded corner. The three gaps are notes that found each other — stashed first, connected when you are ready.
            </p>
          </div>
        </section>

        <section className="section" id="features">
          <p className="kicker">What you can do today</p>
          <h2>Quiet tools. No dashboard.</h2>
          <div className="feature-grid">
            {FEATURES.map((feature) => (
              <article key={feature.title} className="feature">
                <span className="feature-icon">
                  <Glyph name={feature.name} live />
                </span>
                <h3>{feature.title}</h3>
                <p>{feature.body}</p>
              </article>
            ))}
          </div>
          <div className="cta-row center">
            <Link to="/vault" className="brass-btn">
              Try it with sample notes
            </Link>
          </div>
        </section>

        <section className="section" id="gestures">
          <p className="kicker">Hands before menus</p>
          <h2>Four gestures run the deck.</h2>
          <div className="gesture-grid">
            {GESTURES.map((gesture) => (
              <article key={gesture.title}>
                <span className="feature-icon">
                  <Glyph name={gesture.name} live />
                </span>
                <h3>{gesture.title}</h3>
                <p>{gesture.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="pricing">
          <p className="kicker">Pricing</p>
          <h2>Free where the notes actually live.</h2>
          <p className="section-lead">
            Vault is complete on one device. Studio and Cohort are not for sale — join the list and the address stays in this browser.
          </p>
          <div className="price-grid">
            {TIERS.map((tier) => (
              <article key={tier.name} className={tier.featured ? "price featured" : "price"}>
                <p className="eyebrow">{tier.note}</p>
                <h3>{tier.name}</h3>
                <p className="price-num">
                  {tier.price}
                  <span>{tier.unit}</span>
                </p>
                <p>{tier.lead}</p>
                <ul>
                  {tier.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                {tier.to === "/vault" ? (
                  <Link to="/vault" className="brass-btn">
                    {tier.cta}
                  </Link>
                ) : (
                  <button type="button" className="text-btn" onClick={() => jump("join")}>
                    {tier.cta}
                  </button>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="section" id="stories">
          <p className="kicker">From the first vaults</p>
          <h2>People who think in cards.</h2>
          <div className="quote-grid">
            {STORIES.map((story) => (
              <figure key={story.name}>
                <blockquote>{story.quote}</blockquote>
                <figcaption>
                  <strong>{story.name}</strong>
                  <span>{story.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="join" id="join">
          <div>
            <p className="kicker">The list</p>
            <h2>Hear when sync is real.</h2>
            <p>
              One address. Saved only on this device, so you can see what you asked for. The vault itself never requires it.
            </p>
          </div>
          {joined ? (
            <p className="joined" role="status">
              You are on the list. The vault is already open — no account required.
            </p>
          ) : (
            <form onSubmit={onJoin}>
              <label htmlFor="waitlist-email">Email</label>
              <div className="join-row">
                <input
                  id="waitlist-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
                <button type="submit" className="brass-btn">
                  Join the list
                </button>
              </div>
              {error ? <p className="form-error">{error}</p> : null}
            </form>
          )}
          <Link to="/vault" className="text-btn">
            Or open the vault now
          </Link>
        </section>
      </main>

      <footer className="footer">
        <div className="brand">
          <Mark size={22} />
          <span>Stash</span>
        </div>
        <p>Local-first. Gesture-first. Yours when you export.</p>
        <div className="footer-links">
          <Link to="/vault">Open the vault</Link>
          <a href="https://github.com/Nishantpositive/stash-vault">GitHub</a>
        </div>
      </footer>
    </div>
  );
}
