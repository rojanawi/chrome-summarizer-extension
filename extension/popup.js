async function summarizePage() {
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const summaryEl = document.getElementById('summary');

  try {
    if (!window.ai || !window.ai.summarizer) {
      throw new Error('AI Summarizer API not available. Please use Chrome 128+ with AI features enabled.');
    }

    const capabilities = await window.ai.summarizer.capabilities();
    if (capabilities.available === 'no') {
      throw new Error('AI Summarizer is not available on this device.');
    }

    if (capabilities.available === 'after-download') {
      throw new Error('AI model is downloading. Please wait and try again in a few minutes.');
    }

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPageContent
    });

    const pageText = result.result;

    if (!pageText || pageText.trim().length < 100) {
      throw new Error('Not enough content to summarize on this page.');
    }

    const summarizer = await window.ai.summarizer.create({
      type: 'tl;dr',
      length: 'medium'
    });

    const summary = await summarizer.summarize(pageText);

    loadingEl.style.display = 'none';
    summaryEl.textContent = summary;
    summaryEl.style.display = 'block';

    summarizer.destroy();

  } catch (error) {
    loadingEl.style.display = 'none';
    errorEl.textContent = error.message;
    errorEl.style.display = 'block';
  }
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
