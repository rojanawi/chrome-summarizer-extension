// Background service worker for persistent summarization
// Uses chrome.storage.session to persist across service worker restarts

// Track ongoing summarization tasks (in-memory, will be lost on restart but that's OK)
const pendingTasks = new Map();

// Configuration
const CONFIG = {
    enableTeaser: false
};

// Storage key prefix
const STORAGE_KEY_PREFIX = 'summary_';

// Helper to get storage key for a tab
function getStorageKey(tabId) {
    return `${STORAGE_KEY_PREFIX}${tabId}`;
}

// Get summary from storage
async function getSummaryFromStorage(tabId) {
    const key = getStorageKey(tabId);
    const result = await chrome.storage.session.get(key);
    return result[key] || null;
}

// Save summary to storage
async function saveSummaryToStorage(tabId, summary) {
    const key = getStorageKey(tabId);
    await chrome.storage.session.set({ [key]: summary });
}

// Remove summary from storage
async function removeSummaryFromStorage(tabId) {
    const key = getStorageKey(tabId);
    await chrome.storage.session.remove(key);
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'getSummary') {
        handleGetSummary(message.tabId).then(sendResponse);
        return true; // Keep channel open for async response
    }

    if (message.action === 'startSummarization') {
        handleStartSummarization(message.tabId, message.pageText).then(sendResponse);
        return true;
    }

    if (message.action === 'getStatus') {
        handleGetStatus(message.tabId).then(sendResponse);
        return true; // Now async
    }
});

// Clean up when tab is closed
chrome.tabs.onRemoved.addListener((tabId) => {
    removeSummaryFromStorage(tabId);
    pendingTasks.delete(tabId);
});

async function handleGetStatus(tabId) {
    const summary = await getSummaryFromStorage(tabId);
    if (summary) {
        return { status: 'completed', summary };
    }
    if (pendingTasks.has(tabId)) {
        return { status: 'pending' };
    }
    return { status: 'none' };
}

async function handleGetSummary(tabId) {
    const summary = await getSummaryFromStorage(tabId);

    if (summary) {
        return { success: true, summary };
    }

    if (pendingTasks.has(tabId)) {
        // Wait for the pending task to complete
        try {
            const result = await pendingTasks.get(tabId);
            return { success: true, summary: result };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    return { success: false, needsStart: true };
}

async function handleStartSummarization(tabId, pageText) {
    // Check if already completed
    const existingSummary = await getSummaryFromStorage(tabId);
    if (existingSummary) {
        return { success: true, summary: existingSummary };
    }

    // Check if already in progress
    if (pendingTasks.has(tabId)) {
        try {
            const summary = await pendingTasks.get(tabId);
            return { success: true, summary };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Start new summarization
    const taskPromise = performSummarization(tabId, pageText);
    pendingTasks.set(tabId, taskPromise);

    try {
        const summary = await taskPromise;
        return { success: true, summary };
    } catch (error) {
        pendingTasks.delete(tabId);
        return { success: false, error: error.message };
    }
}

async function performSummarization(tabId, pageText) {
    try {
        if (!('Summarizer' in self)) {
            throw new Error('AI Summarizer API not available. Please use Chrome 138+ with AI features enabled.');
        }

        const availability = await Summarizer.availability();
        if (availability === 'unavailable') {
            throw new Error('AI Summarizer is not available on this device.');
        }

        if (availability === 'downloadable') {
            try {
                await Summarizer.create({
                    outputLanguage: 'en',
                    monitor(m) {
                        m.addEventListener('downloadprogress', (e) => {
                            console.log(`Downloaded ${e.loaded * 100}%`);
                        });
                    }
                });
            } catch (e) {
                throw new Error('AI model needs to be downloaded. Please wait and try again in a few minutes.');
            }
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
                format: 'plain-text',
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

        // Cleanup summarizers
        headlineSummarizer.destroy();
        if (CONFIG.enableTeaser) {
            teaserSummarizer.destroy();
        }
        tldrSummarizer.destroy();
        keyPointsSummarizer.destroy();

        const summary = {
            headline,
            teaser: CONFIG.enableTeaser ? teaser : null,
            tldr,
            keyPoints,
            enableTeaser: CONFIG.enableTeaser
        };

        // Cache the result in storage
        await saveSummaryToStorage(tabId, summary);
        pendingTasks.delete(tabId);

        return summary;
    } catch (error) {
        pendingTasks.delete(tabId);
        throw error;
    }
}
