import { useEffect, useRef, useState } from "react";
import { Glyph } from "@/components/glyphs";
import { TOPIC_INK, type StashCard } from "@/lib/stash/model";

type GNode = {
  card: StashCard;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: string;
};

type GEdge = { a: number; b: number; sim: number };

const STOP = new Set([
  "the", "and", "for", "with", "this", "that", "from", "are", "was", "not", "but", "you",
  "your", "into", "over", "then", "will", "can", "about", "more", "some", "any", "all",
]);

function tokens(card: StashCard) {
  const text = `${card.title} ${card.desc} ${card.cat}`.toLowerCase();
  return (text.match(/[a-z0-9]{3,}/g) || []).filter((word) => !STOP.has(word));
}

function build(cards: StashCard[]) {
  const sample = cards.slice(0, 60);
  const docs = sample.map((card) => {
    const tf: Record<string, number> = {};
    for (const word of tokens(card)) tf[word] = (tf[word] || 0) + 1;
    return tf;
  });
  const df: Record<string, number> = {};
  for (const doc of docs) for (const word of Object.keys(doc)) df[word] = (df[word] || 0) + 1;
  const vecs = docs.map((doc) => {
    const v: Record<string, number> = {};
    let sum = 0;
    for (const word of Object.keys(doc)) {
      const weight = (1 + Math.log(doc[word])) * Math.log(1 + sample.length / (df[word] || 1));
      v[word] = weight;
      sum += weight * weight;
    }
    const norm = Math.sqrt(sum) || 1;
    for (const word of Object.keys(v)) v[word] /= norm;
    return v;
  });
  const edges: GEdge[] = [];
  const degree = new Array(sample.length).fill(0) as number[];
  for (let i = 0; i < sample.length; i++) {
    for (let j = i + 1; j < sample.length; j++) {
      let sim = 0;
      for (const word of Object.keys(vecs[i])) if (vecs[j][word]) sim += vecs[i][word] * vecs[j][word];
      if (sample[i].cat === sample[j].cat) sim += 0.08;
      if (sim >= 0.12) {
        edges.push({ a: i, b: j, sim });
        degree[i] += 1;
        degree[j] += 1;
      }
    }
  }
  const nodes: GNode[] = sample.map((card, index) => ({
    card,
    x: (Math.random() - 0.5) * 420,
    y: (Math.random() - 0.5) * 420,
    vx: (Math.random() - 0.5) * 1.2,
    vy: (Math.random() - 0.5) * 1.2,
    r: Math.min(16, 7 + Math.sqrt(degree[index] || 0) * 2),
    color: TOPIC_INK[card.cat] || TOPIC_INK.General,
  }));
  return { nodes, edges, capped: cards.length > sample.length };
}

export function GraphView({
  cards,
  onClose,
  onOpen,
}: {
  cards: StashCard[];
  onClose: () => void;
  onOpen: (id: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const model = useRef(build(cards));
  const view = useRef({ x: 0, y: 0, scale: 1 });
  const drag = useRef<{ node: GNode | null; pan: boolean; px: number; py: number }>({
    node: null,
    pan: false,
    px: 0,
    py: 0,
  });
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<StashCard | null>(null);
  const [query, setQuery] = useState("");
  const hiddenRef = useRef(hidden);
  const queryRef = useRef(query);
  hiddenRef.current = hidden;
  queryRef.current = query;

  useEffect(() => {
    model.current = build(cards);
    const canvas = canvasRef.current;
    const wrap = wrapRef.current;
    if (!canvas || !wrap) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let frame = 0;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = wrap.clientWidth * dpr;
      canvas.height = wrap.clientHeight * dpr;
      view.current.x = wrap.clientWidth / 2;
      view.current.y = wrap.clientHeight / 2;
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(wrap);

    const step = () => {
      const { nodes, edges } = model.current;
      const q = queryRef.current.toLowerCase().trim();
      const hide = hiddenRef.current;
      const visible = (node: GNode) => !hide[node.card.cat];
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        if (!visible(a)) continue;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          if (!visible(b)) continue;
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy) + 0.1;
          const force = 2800 / (dist * dist + 160);
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;
          a.vx += fx;
          a.vy += fy;
          b.vx -= fx;
          b.vy -= fy;
        }
      }
      for (const edge of edges) {
        const a = nodes[edge.a];
        const b = nodes[edge.b];
        if (!visible(a) || !visible(b)) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const pull = (dist - 130) * 0.02 * (edge.sim + 0.3);
        a.vx += (dx / dist) * pull;
        a.vy += (dy / dist) * pull;
        b.vx -= (dx / dist) * pull;
        b.vy -= (dy / dist) * pull;
      }
      const dragged = drag.current.node;
      for (const node of nodes) {
        if (!visible(node) || node === dragged) continue;
        node.vx += -node.x * 0.003;
        node.vy += -node.y * 0.003;
        node.vx *= 0.86;
        node.vy *= 0.86;
        node.x += node.vx;
        node.y += node.vy;
      }
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, wrap.clientWidth, wrap.clientHeight);
      ctx.save();
      ctx.translate(view.current.x, view.current.y);
      ctx.scale(view.current.scale, view.current.scale);
      for (const edge of edges) {
        const a = nodes[edge.a];
        const b = nodes[edge.b];
        if (!visible(a) || !visible(b)) continue;
        ctx.strokeStyle = `rgba(168, 159, 146, ${0.15 + edge.sim * 0.35})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      const ink = getComputedStyle(document.documentElement).getPropertyValue("--fg").trim() || "#f4f0e7";
      for (const node of nodes) {
        if (!visible(node)) continue;
        const dim =
          q.length > 0 &&
          !`${node.card.title} ${node.card.cat}`.toLowerCase().includes(q);
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ctx.fillStyle = dim ? "rgba(168,159,146,0.25)" : node.color;
        ctx.fill();
        if (!dim && node.r > 8) {
          const title = node.card.title.length > 22 ? `${node.card.title.slice(0, 20)}…` : node.card.title;
          ctx.font = "600 11px Outfit, sans-serif";
          ctx.fillStyle = ink;
          ctx.textAlign = "center";
          ctx.fillText(title, node.x, node.y + node.r + 14);
        }
      }
      ctx.restore();
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [cards]);

  function hit(clientX: number, clientY: number) {
    const wrap = wrapRef.current;
    if (!wrap) return null;
    const rect = wrap.getBoundingClientRect();
    const x = (clientX - rect.left - view.current.x) / view.current.scale;
    const y = (clientY - rect.top - view.current.y) / view.current.scale;
    const nodes = model.current.nodes;
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      if (hiddenRef.current[node.card.cat]) continue;
      const dx = x - node.x;
      const dy = y - node.y;
      if (dx * dx + dy * dy <= (node.r + 8) ** 2) return node;
    }
    return null;
  }

  const cats = [...new Set(cards.map((card) => card.cat))];

  return (
    <div className="graph-screen" ref={wrapRef}>
      <canvas
        ref={canvasRef}
        className="graph-canvas"
        onPointerDown={(event) => {
          const node = hit(event.clientX, event.clientY);
          if (node) {
            drag.current = { node, pan: false, px: event.clientX, py: event.clientY };
            node.vx = 0;
            node.vy = 0;
          } else {
            drag.current = { node: null, pan: true, px: event.clientX - view.current.x, py: event.clientY - view.current.y };
          }
        }}
        onPointerMove={(event) => {
          if (drag.current.node) {
            const wrap = wrapRef.current;
            if (!wrap) return;
            const rect = wrap.getBoundingClientRect();
            drag.current.node.x = (event.clientX - rect.left - view.current.x) / view.current.scale;
            drag.current.node.y = (event.clientY - rect.top - view.current.y) / view.current.scale;
          } else if (drag.current.pan) {
            view.current.x = event.clientX - drag.current.px;
            view.current.y = event.clientY - drag.current.py;
          }
        }}
        onPointerUp={(event) => {
          if (drag.current.node) {
            const moved = Math.hypot(event.clientX - drag.current.px, event.clientY - drag.current.py);
            if (moved < 6) setSelected(drag.current.node.card);
          }
          drag.current.node = null;
          drag.current.pan = false;
        }}
        onWheel={(event) => {
          event.preventDefault();
          const next = Math.max(0.4, Math.min(2.6, view.current.scale * (event.deltaY < 0 ? 1.08 : 0.92)));
          view.current.scale = next;
        }}
      />
      <div className="graph-bar">
        <label className="search-field graph-search">
          <Glyph name="search" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a note in the graph"
            aria-label="Find a note in the graph"
          />
        </label>
        <button type="button" className="text-btn" onClick={onClose}>
          Close
        </button>
      </div>
      <div className="graph-chips">
        {cats.map((cat) => (
          <button
            key={cat}
            type="button"
            className={hidden[cat] ? "chip off" : "chip"}
            onClick={() => setHidden((current) => ({ ...current, [cat]: !current[cat] }))}
          >
            <i style={{ background: TOPIC_INK[cat] || TOPIC_INK.General }} />
            {cat}
          </button>
        ))}
      </div>
      {cards.length > 60 ? <p className="graph-note">Showing the latest 60 so the graph stays touchable.</p> : null}
      {selected ? (
        <div className="graph-sheet">
          <p className="eyebrow">{selected.cat}</p>
          <h3>{selected.title}</h3>
          <div className="row-end">
            <button type="button" className="text-btn" onClick={() => setSelected(null)}>
              Back
            </button>
            <button
              type="button"
              className="brass-btn"
              onClick={() => {
                onOpen(selected.id);
              }}
            >
              Open card
            </button>
          </div>
        </div>
      ) : (
        <p className="graph-hint">Drag a node. Pinch or scroll to zoom. Tap to open.</p>
      )}
    </div>
  );
}
