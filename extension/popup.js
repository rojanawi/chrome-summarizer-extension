// Helper to send message with retry (handles service worker wake-up)
async function sendMessageWithRetry(message, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await chrome.runtime.sendMessage(message);
      return response;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      // Wait a bit for service worker to wake up
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

async function summarizePage() {
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const summaryEl = document.getElementById('summary');
  const headlineEl = document.getElementById('headline');
  const teaserEl = document.getElementById('teaser');
  const tldrEl = document.getElementById('tldr');
  const keyPointsListEl = document.getElementById('keyPointsList');

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const tabId = tab.id;

    // First check if we already have a summary for this tab
    const statusResponse = await sendMessageWithRetry({ action: 'getStatus', tabId });

    if (statusResponse.status === 'completed') {
      // Summary already exists, display it
      displaySummary(statusResponse.summary);
      return;
    }

    if (statusResponse.status === 'pending') {
      // Summarization in progress, wait for it
      const response = await chrome.runtime.sendMessage({ action: 'getSummary', tabId });
      if (response.success) {
        displaySummary(response.summary);
      } else {
        throw new Error(response.error);
      }
      return;
    }

    // Need to start new summarization - extract page content first
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPageContent
    });

    const pageText = result.result;

    if (!pageText || pageText.trim().length < 100) {
      throw new Error('Not enough content to summarize on this page.');
    }

    // Start summarization in background
    const response = await chrome.runtime.sendMessage({
      action: 'startSummarization',
      tabId,
      pageText
    });

    if (response.success) {
      displaySummary(response.summary);
    } else {
      throw new Error(response.error);
    }

  } catch (error) {
    loadingEl.style.display = 'none';
    errorEl.textContent = error.message;
    errorEl.style.display = 'block';
  }
}

function displaySummary(summary) {
  const loadingEl = document.getElementById('loading');
  const summaryEl = document.getElementById('summary');
  const headlineEl = document.getElementById('headline');
  const teaserEl = document.getElementById('teaser');
  const tldrEl = document.getElementById('tldr');
  const keyPointsListEl = document.getElementById('keyPointsList');

  headlineEl.textContent = summary.headline;

  if (summary.enableTeaser && summary.teaser) {
    teaserEl.textContent = summary.teaser;
    teaserEl.style.display = 'block';
  } else {
    teaserEl.style.display = 'none';
  }

  tldrEl.innerHTML = summary.tldr.replace(/\n/g, '<br>');
  keyPointsListEl.innerHTML = summary.keyPoints.replace(/\n/g, '<br>');

  loadingEl.style.display = 'none';
  summaryEl.style.display = 'block';
}

function extractPageContent() {
  const article = document.querySelector('article');
  const main = document.querySelector('main');
  const body = document.body;

  const container = article || main || body;

  const clone = container.cloneNode(true);
  const scripts = clone.querySelectorAll('script, style, nav, header, footer, aside');
  scripts.forEach(el => el.remove());

  let text = clone.innerText || clone.textContent || '';

  text = text.substring(0, 10000);

  return text.trim();
}

summarizePage();
