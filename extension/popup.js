// Configuration
const CONFIG = {
  enableTeaser: false
};

async function summarizePage() {
  const loadingEl = document.getElementById('loading');
  const errorEl = document.getElementById('error');
  const summaryEl = document.getElementById('summary');
  const headlineEl = document.getElementById('headline');
  const teaserEl = document.getElementById('teaser');
  const tldrEl = document.getElementById('tldr');
  const keyPointsListEl = document.getElementById('keyPointsList');

  try {
    if (!('Summarizer' in self)) {
      throw new Error('AI Summarizer API not available. Please use Chrome 138+ with AI features enabled.');
    }

    const availability = await Summarizer.availability();
    if (availability === 'unavailable') {
      throw new Error('AI Summarizer is not available on this device.');
    }

    if (availability === 'downloadable') {
      throw new Error('AI model needs to be downloaded. Please wait and try again in a few minutes.');
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

    // Create all summarizers in parallel
    const summarizerPromises = [
      Summarizer.create({
        type: 'headline',
        length: 'short',
        format: 'plain-text',
        outputLanguage: 'en'
      }),
      Summarizer.create({
        type: 'tldr',
        length: 'long',
        format: 'plain-text',
        outputLanguage: 'en'
      }),
      Summarizer.create({
        type: 'key-points',
        length: 'long',
        format: 'markdown',
        outputLanguage: 'en'
      })
    ];

    // Add teaser summarizer if enabled
    if (CONFIG.enableTeaser) {
      summarizerPromises.splice(1, 0, Summarizer.create({
        type: 'teaser',
        length: 'short',
        format: 'plain-text',
        outputLanguage: 'en'
      }));
    }

    const summarizers = await Promise.all(summarizerPromises);

    let headlineSummarizer, teaserSummarizer, tldrSummarizer, keyPointsSummarizer;

    if (CONFIG.enableTeaser) {
      [headlineSummarizer, teaserSummarizer, tldrSummarizer, keyPointsSummarizer] = summarizers;
    } else {
      [headlineSummarizer, tldrSummarizer, keyPointsSummarizer] = summarizers;
    }

    // Run all summarizations in parallel
    const summaryPromises = [
      headlineSummarizer.summarize(pageText),
      tldrSummarizer.summarize(pageText),
      keyPointsSummarizer.summarize(pageText)
    ];

    if (CONFIG.enableTeaser) {
      summaryPromises.splice(1, 0, teaserSummarizer.summarize(pageText));
    }

    const results = await Promise.all(summaryPromises);

    let headline, teaser, tldr, keyPoints;

    if (CONFIG.enableTeaser) {
      [headline, teaser, tldr, keyPoints] = results;
    } else {
      [headline, tldr, keyPoints] = results;
    }

    // Update UI
    headlineEl.textContent = headline;

    if (CONFIG.enableTeaser) {
      teaserEl.textContent = teaser;
      teaserEl.style.display = 'block';
    } else {
      teaserEl.style.display = 'none';
    }

    tldrEl.innerHTML = tldr.replace(/\n/g, '<br>');
    keyPointsListEl.innerHTML = keyPoints.replace(/\n/g, '<br>');

    // Cleanup summarizers
    headlineSummarizer.destroy();
    if (CONFIG.enableTeaser) {
      teaserSummarizer.destroy();
    }
    tldrSummarizer.destroy();
    keyPointsSummarizer.destroy();

    loadingEl.style.display = 'none';
    summaryEl.style.display = 'block';

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
