export async function incrementDownloadCountAndMaybeShowToast() {
  try {
    const data = await chrome.storage.local.get(['ce_download_count', 'ce_has_reviewed']);

    if (data.ce_has_reviewed) {
      return;
    }

    let count = Number(data.ce_download_count) || 0;
    count++;

    await chrome.storage.local.set({ ce_download_count: count });

    if (count === 5) {
      showReviewPrompt();
      await chrome.storage.local.set({ ce_download_count: -15 });
    }
  } catch (err) {
    console.error('Error handling review toast', err);
  }
}

function showReviewPrompt() {
  if (document.getElementById('ce-review-toast')) return;

  const toast = document.createElement('div');
  toast.id = 'ce-review-toast';

  const style = document.createElement('style');
  style.textContent = `
    #ce-review-toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 320px;
      background: #1e1f22;
      border: 0.5px solid rgba(255,255,255,0.1);
      border-radius: 16px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      z-index: 999999;
      animation: slideIn 0.28s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      font-family: system-ui, -apple-system, sans-serif;
      box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    }
    @keyframes slideIn {
      from { transform: translateY(16px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    #ce-review-toast * { box-sizing: border-box; margin: 0; padding: 0; }
    #ce-review-toast .ce-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 10px;
    }
    #ce-review-toast .ce-header-left {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    #ce-review-toast .ce-icon {
      width: 36px;
      height: 36px;
      flex-shrink: 0;
      border-radius: 9px;
      background: rgba(255, 255, 255, 0.08);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    #ce-review-toast .ce-icon svg { width: 17px; height: 17px; }
    #ce-review-toast .ce-title { font-size: 14px; font-weight: 600; color: #e3e3e3; line-height: 1.3; }
    #ce-review-toast .ce-subtitle { font-size: 12px; color: #6e7074; margin-top: 2px; }
    #ce-review-toast .ce-close {
      background: none;
      border: none;
      color: #555;
      cursor: pointer;
      font-size: 16px;
      line-height: 1;
      padding: 2px 4px;
      border-radius: 4px;
      transition: color 0.15s;
    }
    #ce-review-toast .ce-close:hover { color: #aaa; }
    #ce-review-toast .ce-body {
      background: rgba(255,255,255,0.04);
      border: 0.5px solid rgba(255,255,255,0.07);
      border-radius: 10px;
      padding: 12px 14px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    #ce-review-toast .ce-stars { display: flex; gap: 3px; flex-shrink: 0; }
    #ce-review-toast .ce-stars svg { width: 13px; height: 13px; }
    #ce-review-toast .ce-body-text { font-size: 13px; color: #9ca0a5; line-height: 1.5; text-align: left; }
    #ce-review-toast .ce-actions { display: flex; gap: 8px; }
    #ce-review-toast .ce-btn {
      flex: 1;
      padding: 9px 0;
      border-radius: 9px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      border: none;
      transition: background 0.15s, opacity 0.15s;
      font-family: inherit;
    }
    #ce-review-toast .ce-btn-later {
      background: transparent;
      border: 0.5px solid rgba(255,255,255,0.1);
      color: #888;
    }
    #ce-review-toast .ce-btn-later:hover { background: rgba(255,255,255,0.05); color: #aaa; }
    #ce-review-toast .ce-btn-rate {
      flex: 1.4;
      background: rgba(168, 199, 250, 0.14);
      color: #a8c7fa;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
    }
    #ce-review-toast .ce-btn-rate:hover { background: rgba(168, 199, 250, 0.22); }
    #ce-review-toast .ce-btn-rate svg { width: 13px; height: 13px; }
    #ce-review-toast .ce-footer {
      font-size: 11px;
      color: #929497;
      text-align: center;
      letter-spacing: 0.02em;
    }
  `;

  toast.innerHTML = `
    <div class="ce-header">
      <div class="ce-header-left">
        <div class="ce-icon">
          ⚡
        </div>
        <div>
          <div class="ce-title">Enjoying Code Exporter?</div>
          <div class="ce-subtitle">Your feedback matters</div>
        </div>
      </div>
      <button class="ce-close" id="ce-dismiss" title="Dismiss">✕</button>
    </div>

    <div class="ce-body">
      <div class="ce-stars">
        ${Array(5).fill('<svg viewBox="0 0 24 24" fill="#EF9F27"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>').join('')}
      </div>
      <p class="ce-body-text">You've saved some time with us — a quick review helps the project grow.</p>
    </div>

    <div class="ce-actions">
      <button class="ce-btn ce-btn-later" id="ce-review-later">Maybe later</button>
      <button class="ce-btn ce-btn-rate" id="ce-review-yes">
        <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
        Rate 5 stars
      </button>
    </div>

    <p class="ce-footer">Takes less than 30 seconds · opens Chrome Web Store</p>
  `;

  document.body.appendChild(style);
  document.body.appendChild(toast);

  const handleDismiss = () => {
    chrome.storage.local.set({ ce_download_count: -15 }); // Reset back to a lower count 
    toast.remove();
    style.remove();
  };

  document.getElementById('ce-dismiss')?.addEventListener('click', handleDismiss);

  document.getElementById('ce-review-later')?.addEventListener('click', () => {
    chrome.storage.local.set({ ce_download_count: -25 });
    toast.remove();
    style.remove();
  });

  document.getElementById('ce-review-yes')?.addEventListener('click', () => {
    chrome.storage.local.set({ ce_has_reviewed: true });
    window.open('https://chromewebstore.google.com/detail/code-exporter-for-gemini/gaidnbkpdfpjeoejpklfnmjckmeociip/reviews', '_blank');
    toast.remove();
    style.remove();
  });
}
