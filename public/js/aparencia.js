(() => {
  const key = 'riqfy.aparencia';
  const root = document.documentElement;
  function apply(value) {
    root.dataset.aparencia = value === 'clara' ? 'clara' : 'escura';
    const button = document.querySelector('.tema-botao');
    if (button) {
      const light = root.dataset.aparencia === 'clara';
      button.textContent = light ? '☾' : '☀';
      button.title = light ? 'Ativar modo escuro' : 'Ativar modo claro';
      button.setAttribute('aria-label', button.title);
    }
  }
  let saved;
  try { saved = localStorage.getItem(key); } catch {}
  apply(saved);
  document.addEventListener('DOMContentLoaded', () => {
    const button = document.querySelector('.tema-botao');
    apply(root.dataset.aparencia);
    button.addEventListener('click', () => {
      apply(root.dataset.aparencia === 'clara' ? 'escura' : 'clara');
      try { localStorage.setItem(key, root.dataset.aparencia); } catch {}
    });
  });
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) apply(event.newValue);
  });
})();
