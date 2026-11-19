(() => {
  'use strict';

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  const forceTopOnEntry = () => {
    if (window.location.hash) return;
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  };
  forceTopOnEntry();
  window.addEventListener('pageshow', forceTopOnEntry);

  const analytics = window.LMAnalytics || { track: () => {} };

  const menuButton = document.querySelector('.mobile-menu-button');
  const menu = document.getElementById('mobile-navigation');
  const closeMenu = () => {
    if (!menuButton || !menu) return;
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Abrir menu');
    menu.hidden = true;
  };

  if (menuButton && menu) {
    menuButton.addEventListener('click', () => {
      const open = menuButton.getAttribute('aria-expanded') !== 'true';
      menuButton.setAttribute('aria-expanded', String(open));
      menuButton.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
      menu.hidden = !open;
    });
    menu.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
    window.addEventListener('resize', () => { if (window.matchMedia('(min-width: 64rem)').matches) closeMenu(); });
  }

  document.querySelectorAll('[data-track]').forEach(element => {
    element.addEventListener('click', () => {
      const source = element.dataset.track || 'unknown';
      if (source === 'hero_resultados') {
        analytics.track('results_click', { source, destination: 'resultados' });
        return;
      }
      analytics.track('consultoria_navigation_click', { source, destination: 'consultoria' });
    });
  });

  document.querySelectorAll('[data-direct-whatsapp]').forEach(element => {
    element.addEventListener('click', () => analytics.track('whatsapp_click', { source: 'footer_direct', route: 'direct', qualification_completed: false }));
  });

  const dialog = document.getElementById('qualification-dialog');
  const triggers = document.querySelectorAll('[data-start-qualification]');
  const analyticsSafe = (event, data) => analytics.track(event, data);
  if (!dialog || typeof dialog.showModal !== 'function') {
    triggers.forEach(button => button.addEventListener('click', () => {
      window.location.href = '#planos';
    }));
    return;
  }

  const steps = [...dialog.querySelectorAll('[data-step]')];
  const answers = { name: '', objective: '', deadline: '' };
  const nameInput = document.getElementById('qualification-name');
  const progressLabel = document.getElementById('qualification-progress-label');
  const progressBar = document.getElementById('qualification-progress-bar');
  const title = document.getElementById('qualification-objective-title');
  const presencial = document.getElementById('qualification-presencial');
  const online = document.getElementById('qualification-online');
  const recomeco = document.getElementById('qualification-recomeco');
  let step = 1;
  let source = 'unknown';
  let returnFocus = null;
  let closeReason = 'unknown';
  let completed = false;

  function render() {
    steps.forEach(section => { section.hidden = Number(section.dataset.step) !== step; });
    progressLabel.textContent = step === 4 ? 'Concluído' : step + ' de 3';
    progressBar.style.width = (step === 4 ? 100 : step * 100 / 3) + '%';
    requestAnimationFrame(() => {
      const active = steps.find(section => Number(section.dataset.step) === step);
      active?.querySelector('input, button, a')?.focus({ preventScroll: true });
    });
  }

  function reset() {
    answers.name = '';
    answers.objective = '';
    answers.deadline = '';
    nameInput.value = '';
    step = 1;
    completed = false;
  }

  function finish() {
    dialog.querySelectorAll('[data-summary]').forEach(node => {
      node.textContent = answers[node.dataset.summary] || '';
    });
    const params = new URLSearchParams({
      nome: answers.name, objetivo: answers.objective, prazo: answers.deadline
    });
    presencial.href = 'presencial.html?' + params.toString();
    online.href = 'online.html?' + params.toString();
    title.textContent = answers.name + ', qual é seu principal objetivo?';
    recomeco.href = 'recomeco.html?' + params.toString();
    step = 4;
    completed = true;
    render();
    analyticsSafe('qualification_completed', { source, route: 'offers' });
  }

  triggers.forEach(button => button.addEventListener('click', () => {
    if (dialog.open) return;
    reset();
    source = button.dataset.source || 'unknown';
    returnFocus = button;
    closeReason = 'unknown';
    dialog.showModal();
    render();
    analyticsSafe('qualification_started', { source });
  }));

  document.getElementById('qualification-name-form')?.addEventListener('submit', event => {
    event.preventDefault();
    const value = nameInput.value.trim().replace(/\\s+/g, ' ').slice(0, 60);
    if (!value) { nameInput.setCustomValidity('Informe seu nome.'); nameInput.reportValidity(); return; }
    nameInput.setCustomValidity('');
    answers.name = value;
    title.textContent = value + ', qual é seu principal objetivo?';
    step = 2;
    render();
    analyticsSafe('qualification_q1_answered', { source });
  });
  nameInput?.addEventListener('input', () => nameInput.setCustomValidity(''));

  dialog.querySelectorAll('[data-answer]').forEach(button => button.addEventListener('click', () => {
    const key = button.dataset.answer;
    answers[key] = button.dataset.value;
    analyticsSafe('qualification_q' + step + '_answered', { source, answer: button.dataset.value });
    if (step === 3) finish();
    else { step += 1; render(); }
  }));

  dialog.querySelectorAll('[data-back]').forEach(button => button.addEventListener('click', () => {
    step = Math.max(1, step - 1);
    render();
  }));
  dialog.querySelector('[data-restart]')?.addEventListener('click', () => { reset(); render(); });
  dialog.querySelector('[data-close-qualification]')?.addEventListener('click', () => {
    closeReason = 'close_button'; dialog.close();
  });

  presencial?.addEventListener('click', () => analyticsSafe('presencial_details_click', { source }));
  online?.addEventListener('click', () => analyticsSafe('online_details_click', { source }));
  recomeco?.addEventListener('click', () => analyticsSafe('recomeco_inquiry_click', { source }));

  dialog.addEventListener('click', event => {
    if (event.target === dialog) { closeReason = 'backdrop'; dialog.close(); }
  });
  dialog.addEventListener('cancel', () => { closeReason = 'escape'; });
  dialog.addEventListener('close', () => {
    analyticsSafe('qualification_closed', { source, step, completed, close_reason: closeReason });
    returnFocus?.focus({ preventScroll: true });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
  });
})();
