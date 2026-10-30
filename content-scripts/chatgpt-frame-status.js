// Runs in the isolated extension world. Never reads prompts, cookies or accounts.
(() => {
  if (window === window.top) return;
  const extensionOrigin = chrome.runtime.getURL('/').replace(/\/$/, '');
  let lastReady;
  function report(force = false) {
    const ready = !!document.querySelector(
      '#prompt-textarea[contenteditable="true"], textarea#prompt-textarea:not([disabled])'
    );
    if (force || ready !== lastReady) {
      lastReady = ready;
      window.parent.postMessage({ type: 'INSIDEBAR_CHATGPT_STATUS', ready }, extensionOrigin);
    }
  }
  window.addEventListener('message', event => {
    if (event.source === window.parent && event.origin === extensionOrigin &&
        event.data?.type === 'INSIDEBAR_CHATGPT_PROBE') report(true);
  });
  new MutationObserver(() => report()).observe(document, {
    childList: true, subtree: true, attributes: true,
    attributeFilter: ['id', 'contenteditable', 'disabled']
  });
  report();
})();
