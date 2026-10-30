import { t } from './i18n.js';

const CHATGPT_URL = 'https://chatgpt.com/';
const READY_TIMEOUT_MS = 20000;

// An iframe load event also fires for blocked pages. Wait for the content script
// to find a composer, and leave a way out when login/verification needs a tab.
export function monitorChatGPTFrame(iframe, container, onState) {
  let state;
  let timer;
  let active = true;
  const notice = document.createElement('div');
  notice.className = 'provider-recovery';
  notice.setAttribute('role', 'status');
  const message = document.createElement('p');
  message.textContent = t('chatgptRecoveryMessage');
  const retry = document.createElement('button');
  retry.textContent = t('chatgptRecoveryRetry');
  const open = document.createElement('button');
  open.textContent = t('chatgptRecoveryOpen');
  notice.append(message, retry, open);
  container.appendChild(notice);

  function setState(next) {
    state = next;
    notice.hidden = !active || state !== 'failed';
    onState(state);
  }
  function start() {
    clearTimeout(timer);
    setState('loading');
    timer = setTimeout(() => setState('failed'), READY_TIMEOUT_MS);
  }
  function probe() {
    start();
    iframe.contentWindow?.postMessage({ type: 'INSIDEBAR_CHATGPT_PROBE' }, CHATGPT_URL);
  }
  function receive(event) {
    if (event.source !== iframe.contentWindow || event.origin !== 'https://chatgpt.com' ||
        event.data?.type !== 'INSIDEBAR_CHATGPT_STATUS') return;
    if (event.data.ready === true) {
      clearTimeout(timer);
      setState('ready');
    } else if (event.data.ready === false && state === 'ready') {
      start();
    }
  }
  function fail() {
    clearTimeout(timer);
    setState('failed');
  }
  retry.addEventListener('click', () => {
    start();
    iframe.src = CHATGPT_URL;
  });
  open.addEventListener('click', () => chrome.tabs.create({ url: CHATGPT_URL }));
  window.addEventListener('message', receive);
  iframe.addEventListener('load', probe);
  iframe.addEventListener('error', fail);
  start();

  return {
    setActive(value) {
      active = value;
      notice.hidden = !active || state !== 'failed';
    },
    dispose() {
      clearTimeout(timer);
      window.removeEventListener('message', receive);
      iframe.removeEventListener('load', probe);
      iframe.removeEventListener('error', fail);
      notice.remove();
    }
  };
}
