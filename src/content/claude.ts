// Content script for claude.ai - triggers account detection
export {};

// Simply notify the background script that we're on Claude
// The background script will handle the API calls
const init = () => {
  console.log('[ChatSearch] Claude page detected, notifying background');

  chrome.runtime.sendMessage({
    type: 'DETECT_CLAUDE_ACCOUNT',
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
