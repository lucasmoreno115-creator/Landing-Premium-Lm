(() => {
  'use strict';

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
    element.addEventListener('click', () => analytics.track('cta_consultoria_click', { source: element.dataset.track || 'unknown' }));
  });

  document.querySelectorAll('[data-direct-whatsapp]').forEach(element => {
    element.addEventListener('click', () => analytics.track('whatsapp_click', { source: 'footer_direct', route: 'direct' }));
  });

  const dialog = document.getElementById('qualification-dialog');
  if (!dialog || typeof dialog.showModal !== 'function') return;

  const answers = { objective: '', difficulty: '', help: '' };
  const steps = [...dialog.querySelectorAll('[data-step]')];
  const label = document.getElementById('qualification-progress-label');
  const bar = document.getElementById('qualification-progress-bar');
  const whatsapp = document.getElementById('qualification-whatsapp');
  const routeNote = document.getElementById('qualification-route-note');
  const resultTitle = document.getElementById('qualification-result-title');
  const closeButton = dialog.querySelector('[data-close-qualification]');
  const restartButton = dialog.querySelector('[data-restart]');

  let step = 1;
  let source = 'unknown';
  let returnFocus = null;
  let closeReason = 'unknown';
  let completed = false;

  const route = () => answers.help === 'Principalmente um treino organizado' ? 'training' : 'premium';

  const focusCurrentStep = () => {
    requestAnimationFrame(() => {
      const current = dialog.querySelector(`[data-step="${step}"]`);
      const target = current?.querySelector('button, a, [tabindex]:not([tabindex="-1"])');
      target?.focus({ preventScroll: true });
    });
  };

  const render = ({ focus = true } = {}) => {
    steps.forEach(element => { element.hidden = Number(element.dataset.step) !== step; });
    const visibleStep = Math.min(step, 3);
    label.textContent = step === 4 ? 'Concluído' : `${visibleStep} de 3`;
    bar.style.width = step === 4 ? '100%' : `${visibleStep * 33.333}%`;
    if (focus) focusCurrentStep();
  };

  const resetAnswers = () => {
    answers.objective = '';
    answers.difficulty = '';
    answers.help = '';
    step = 1;
    completed = false;
  };

  const openFlow = trigger => {
    if (dialog.open) return;
    source = trigger.dataset.source || 'unknown';
    returnFocus = trigger;
    closeReason = 'unknown';
    resetAnswers();
    render({ focus: false });
    analytics.track('qualification_started', { source });
    dialog.showModal();
    focusCurrentStep();
  };

  const finish = () => {
    dialog.querySelectorAll('[data-summary]').forEach(element => { element.textContent = answers[element.dataset.summary]; });
    const trainingRoute = route() === 'training';
    resultTitle.textContent = trainingRoute ? 'Vamos direcionar você para a opção mais adequada.' : 'Vale continuarmos a conversa.';
    routeNote.textContent = trainingRoute
      ? 'Como seu foco principal é treino, vou considerar isso na conversa e evitar empurrar uma solução maior do que você procura.'
      : 'A conversa é o próximo passo para entender se a Consultoria Premium faz sentido para o seu momento.';

    const intro = trainingRoute
      ? 'Olá, Lucas. Vim pelo site e estou procurando principalmente um treino organizado.'
      : 'Olá, Lucas. Vim pelo site e quero conhecer melhor a Consultoria Premium LM.';
    const text = `${intro}\n\nObjetivo: ${answers.objective}\nPrincipal dificuldade: ${answers.difficulty}\nTipo de ajuda: ${answers.help}\n\nQuero entender qual é o melhor próximo passo para mim.`;
    whatsapp.href = `https://wa.me/5514991174500?text=${encodeURIComponent(text)}`;

    step = 4;
    completed = true;
    render();
    analytics.track('qualification_completed', { source, route: route(), ...answers });
  };

  document.querySelectorAll('[data-start-qualification]').forEach(element => {
    element.addEventListener('click', () => openFlow(element));
  });

  dialog.querySelectorAll('[data-answer]').forEach(choice => {
    choice.addEventListener('click', () => {
      const question = step;
      answers[choice.dataset.answer] = choice.dataset.value;
      analytics.track(`qualification_q${question}_answered`, { source, answer: choice.dataset.value });
      if (step < 3) {
        step += 1;
        render();
      } else {
        finish();
      }
    });
  });

  dialog.querySelectorAll('[data-back]').forEach(element => {
    element.addEventListener('click', () => {
      const fromStep = step;
      step = Math.max(1, step - 1);
      analytics.track('qualification_back', { source, from_step: fromStep, to_step: step });
      render();
    });
  });

  restartButton?.addEventListener('click', () => {
    analytics.track('qualification_restart', { source, route: route() });
    resetAnswers();
    render();
  });

  closeButton?.addEventListener('click', () => {
    closeReason = 'close_button';
    dialog.close();
  });

  whatsapp?.addEventListener('click', () => {
    closeReason = 'whatsapp';
    analytics.track('whatsapp_click', { source, route: route(), qualification_completed: true });
  });

  dialog.addEventListener('click', event => {
    if (event.target === dialog) {
      closeReason = 'backdrop';
      dialog.close();
    }
  });

  dialog.addEventListener('cancel', () => {
    closeReason = 'escape';
  });

  dialog.addEventListener('close', () => {
    analytics.track('qualification_closed', {
      source,
      step,
      completed,
      close_reason: closeReason,
      route: completed ? route() : 'incomplete'
    });
    returnFocus?.focus({ preventScroll: true });
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
  });
})();
