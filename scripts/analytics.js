(() => {
  'use strict';

  const SESSION_KEY = 'lm_analytics_session';
  const ATTRIBUTION_KEY = 'lm_attribution';
  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];

  const safeSessionStorage = {
    get(key) { try { return window.sessionStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { window.sessionStorage.setItem(key, value); } catch { /* storage is optional */ } }
  };

  const makeId = () => {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `lm-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  };

  let sessionId = safeSessionStorage.get(SESSION_KEY);
  if (!sessionId) {
    sessionId = makeId();
    safeSessionStorage.set(SESSION_KEY, sessionId);
  }

  const readAttribution = () => {
    const params = new URLSearchParams(window.location.search);
    const current = {};
    UTM_KEYS.forEach(key => {
      const value = params.get(key);
      if (value) current[key] = value.slice(0, 160);
    });

    if (Object.keys(current).length) {
      safeSessionStorage.set(ATTRIBUTION_KEY, JSON.stringify(current));
      return current;
    }

    try {
      return JSON.parse(safeSessionStorage.get(ATTRIBUTION_KEY) || '{}');
    } catch {
      return {};
    }
  };

  const attribution = readAttribution();
  const referrerHost = (() => {
    if (!document.referrer) return '';
    try { return new URL(document.referrer).hostname; } catch { return ''; }
  })();
  const viewport = window.matchMedia('(min-width: 64rem)').matches ? 'desktop' : window.matchMedia('(min-width: 36rem)').matches ? 'tablet' : 'mobile';

  window.dataLayer = window.dataLayer || [];

  const context = () => ({
    lm_session_id: sessionId,
    page_path: window.location.pathname,
    page_title: document.title,
    viewport,
    referrer_host: referrerHost,
    ...attribution
  });

  const track = (event, detail = {}) => {
    if (!event || typeof event !== 'string') return;
    const payload = { event, ...context(), ...detail };
    window.dataLayer.push(payload);
    document.dispatchEvent(new CustomEvent('lm:analytics', { detail: payload }));
  };

  window.LMAnalytics = Object.freeze({ track, context });
  track('page_view');
})();
