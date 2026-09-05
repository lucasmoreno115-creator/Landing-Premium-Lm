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
  const qualificationTriggers = document.querySelectorAll('[data-start-qualification]');
  const fallbackWhatsApp = 'https://wa.me/5514991174500?text=' + encodeURIComponent('Olá, Lucas. Vim pelo seu site e quero conhecer melhor a Consultoria Premium LM.');

  if (!dialog || typeof dialog.showModal !== 'function') {
    qualificationTriggers.forEach(element => {
      element.addEventListener('click', () => {
        analytics.track('qualification_fallback', { source: element.dataset.source || 'unknown', route: 'direct' });
        window.location.href = fallbackWhatsApp;
      });
    });
    return;
  }

  const answers = { objective: '', difficulty: '', help: '' };
  const answerCodes = { objective: '', difficulty: '', help: '' };
  const codeMaps = {
    objective: {
      'Emagrecer': 'weight_loss',
      'Melhorar composição corporal': 'body_comp',
      'Ganhar massa muscular': 'muscle_gain',
      'Saúde e condicionamento': 'health_conditioning',
      'Outro': 'other'
    },
    difficulty: {
      'Organizar a alimentação': 'nutrition_organization',
      'Organizar ou evoluir o treino': 'training_organization',
      'Começo, mas não consigo manter': 'consistency',
      'Fazer o plano caber na rotina': 'routine_fit',
      'Faço as coisas, mas não vejo progresso': 'no_progress',
      'Outra': 'other'
    },
    help: {
      'Treino e alimentação individualizados': 'premium',
      'Principalmente um treino organizado': 'training',
      'Ainda não sei qual formato faz mais sentido': 'unsure'
    }
  };
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

  const route = () => answerCodes.help === 'training' ? 'training' : 'premium';

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
    Object.keys(answers).forEach(key => { answers[key] = ''; answerCodes[key] = ''; });
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
    analytics.track('qualification_completed', {
      source,
      route: route(),
      objective_code: answerCodes.objective,
      difficulty_code: answerCodes.difficulty,
      help_code: answerCodes.help
    });
  };

  qualificationTriggers.forEach(element => {
    element.addEventListener('click', () => openFlow(element));
  });

  dialog.querySelectorAll('[data-answer]').forEach(choice => {
    choice.addEventListener('click', () => {
      const question = step;
      const key = choice.dataset.answer;
      const value = choice.dataset.value;
      answers[key] = value;
      answerCodes[key] = codeMaps[key]?.[value] || 'other';
      analytics.track(`qualification_q${question}_answered`, { source, answer_code: answerCodes[key] });
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
    analytics.track('qualification_handoff', { source, route: route() });
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