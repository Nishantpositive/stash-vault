/** Folded card with three negative-space nodes: a thought stashed, then linked. */
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg
      className="mark"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
    >
      <path
        className="mark-card"
        d="M7.2 6.2h10.4c.45 0 .88.18 1.2.5l5.5 5.5c.32.32.5.75.5 1.2V24.6a3.2 3.2 0 0 1-3.2 3.2H7.2A3.2 3.2 0 0 1 4 24.6V9.4a3.2 3.2 0 0 1 3.2-3.2z"
      />
      <path className="mark-fold" d="M17.5 6.55V12c0 .7.56 1.25 1.25 1.25h5.4L17.5 6.55z" />
      <path
        className="mark-link"
        d="M11.2 20.4 15.1 16.8M16.2 17.4 20.1 21.6"
      />
      <circle className="mark-node" cx="10.2" cy="21.2" r="1.45" />
      <circle className="mark-node" cx="15.7" cy="16.2" r="1.45" />
      <circle className="mark-node" cx="21" cy="22.2" r="1.45" />
    </svg>
  );
}
