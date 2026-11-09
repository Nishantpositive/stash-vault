const KEY = "stash.theme";

export function applyStoredTheme() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "light") document.documentElement.dataset.theme = "light";
    else document.documentElement.removeAttribute("data-theme");
  } catch {
    /* private mode */
  }
}

export function toggleTheme() {
  const light = document.documentElement.dataset.theme === "light";
  if (light) {
    document.documentElement.removeAttribute("data-theme");
    localStorage.setItem(KEY, "dark");
  } else {
    document.documentElement.dataset.theme = "light";
    localStorage.setItem(KEY, "light");
  }
}

export function themeIsLight() {
  return document.documentElement.dataset.theme === "light";
}
