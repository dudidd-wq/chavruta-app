(() => {
  const root = document.documentElement;
  const themes = ['editorial', 'light', 'discovery'];
  const accents = { burgundy: ['#7E2940', '#F0E4E7'], blue: ['#245A7A', '#E4EDF2'], green: ['#2D6654', '#E4EEE9'], purple: ['#694889', '#EEE7F4'] };
  function apply(theme, accent) {
    root.dataset.theme = themes.includes(theme) ? theme : 'editorial';
    const selected = accents[accent] ? accent : 'burgundy';
    root.dataset.accent = selected;
    root.style.setProperty('--accent', accents[selected][0]);
    root.style.setProperty('--accent-ink', accents[selected][0]);
    root.style.setProperty('--accent-soft', accents[selected][1]);
    document.querySelector('#theme').value = root.dataset.theme;
    document.querySelectorAll('[data-color]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.color === selected)));
    try { localStorage.setItem('chavruta-mockup-theme', root.dataset.theme); localStorage.setItem('chavruta-mockup-accent', selected); } catch {}
  }
  let theme = 'editorial', accent = 'burgundy';
  try { theme = localStorage.getItem('chavruta-mockup-theme') || theme; accent = localStorage.getItem('chavruta-mockup-accent') || accent; } catch {}
  apply(theme, accent);
  document.querySelector('#theme').addEventListener('change', event => apply(event.target.value, root.dataset.accent));
  document.querySelectorAll('[data-color]').forEach(button => button.addEventListener('click', () => apply(root.dataset.theme, button.dataset.color)));
})();
