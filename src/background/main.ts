import { WHATS_NEW_SEEN_VERSION_KEY } from '~/constants/storage';

async function syncWhatsNewBadge(): Promise<void> {
    const currentVersion = chrome.runtime.getManifest().version;

    try {
        const data = await chrome.storage.local.get([WHATS_NEW_SEEN_VERSION_KEY]);
        const seenVersion = data[WHATS_NEW_SEEN_VERSION_KEY] as string | undefined;
        const shouldShowBadge = seenVersion !== currentVersion;

        await chrome.action.setBadgeText({ text: shouldShowBadge ? 'NEW' : '' });
        await chrome.action.setBadgeBackgroundColor({ color: '#FF3B30' });
        await chrome.action.setBadgeTextColor({ color: '#FFFFFF' });
    } catch (error) {
        console.warn('Could not sync whats-new badge', error);
    }
}

chrome.runtime.onInstalled.addListener(() => {
    void syncWhatsNewBadge();
});

chrome.runtime.onStartup.addListener(() => {
    void syncWhatsNewBadge();
});

// Service worker can start cold; ensure badge state is restored on wake.
void syncWhatsNewBadge();
