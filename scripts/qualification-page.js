(() => {
'use strict';
const dialog=document.getElementById('qualification-dialog');
if(!dialog)return;
const analytics=window.LMAnalytics||{track:()=>{}};
const analyticsSafe=(event,data)=>analytics.track(event,data);
const source=new URLSearchParams(location.search).get('source')||'page';
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

  function render() {
    steps.forEach(section => { section.hidden = Number(section.dataset.step) !== step; });
    progressLabel.textContent = step === 4 ? 'Concluído' : step + ' de 3';
    progressBar.style.width = (step === 4 ? 100 : step * 100 / 3) + '%';
    window.scrollTo({top:0,behavior:"auto"});
  }

  function reset() {
    answers.name = '';
    answers.objective = '';
    answers.deadline = '';
    nameInput.value = '';
    step = 1;
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
    render();
    analyticsSafe('qualification_completed', { source, route: 'offers' });
  }

  document.getElementById('qualification-name-form')?.addEventListener('submit', event => {
    event.preventDefault();
    const value = nameInput.value.trim().replace(/\s+/g, ' ').slice(0, 60);
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
  presencial?.addEventListener('click', () => analyticsSafe('presencial_details_click', { source }));
  online?.addEventListener('click', () => analyticsSafe('online_details_click', { source }));
  recomeco?.addEventListener('click', () => analyticsSafe('recomeco_inquiry_click', { source }));

})();
