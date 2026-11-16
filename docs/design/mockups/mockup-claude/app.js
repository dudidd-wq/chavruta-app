/* Light vanilla JS: view panel (theme / accent / size) + draft banner dismiss. */
(function () {
  var root = document.documentElement;
  var KEY = 'chavruta-mock-view';
  var state = {};
  try { state = JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) {}

  function apply() {
    root.setAttribute('data-theme', state.theme || 'editorial');
    if (state.accent) root.setAttribute('data-accent', state.accent); else root.removeAttribute('data-accent');
    root.setAttribute('data-size', state.size || 'md');
    document.querySelectorAll('[data-set]').forEach(function (b) {
      var k = b.getAttribute('data-set'), v = b.getAttribute('data-val');
      var cur = state[k] || (k === 'theme' ? 'editorial' : k === 'size' ? 'md' : '');
      b.setAttribute('aria-pressed', String(cur === v));
    });
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) {}
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-set]');
    if (b) {
      var k = b.getAttribute('data-set');
      state[k] = b.getAttribute('data-val');
      if (k === 'theme') delete state.accent; // theme brings its own default accent
      apply();
      return;
    }
    var panel = document.getElementById('view-panel');
    var scrim = document.getElementById('scrim');
    if (e.target.closest('[data-open-view]')) {
      var open = !panel.classList.contains('open');
      panel.classList.toggle('open', open);
      scrim.classList.toggle('open', open);
      return;
    }
    if (panel && panel.classList.contains('open') && (!e.target.closest('#view-panel') || e.target.closest('[data-close-view]'))) {
      panel.classList.remove('open'); scrim.classList.remove('open');
    }
    if (e.target.closest('[data-close-draft]')) {
      var d = document.querySelector('.draft'); if (d) d.remove();
    }
  });

  apply();
})();
