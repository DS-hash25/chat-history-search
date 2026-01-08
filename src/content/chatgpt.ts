// Content script for chatgpt.com - triggers account detection
export {};

// Simply notify the background script that we're on ChatGPT
// The background script will handle the API calls
const init = () => {
  console.log('[ChatSearch] ChatGPT page detected, notifying background');

  chrome.runtime.sendMessage({
    type: 'DETECT_CHATGPT_ACCOUNT',
  }).catch((err) => {
    console.warn('[ChatSearch] Failed to notify background:', err);
  });
};

// Run when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  // Small delay to ensure page is ready
  setTimeout(init, 500);
}
