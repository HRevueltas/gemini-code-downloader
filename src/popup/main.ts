import './styles.css';
import { INCLUDE_DEEP_RESEARCH_SOURCES_KEY } from '~/constants/storage';

const toggleNode = document.getElementById('include-sources-toggle') as HTMLButtonElement | null;
const statusNode = document.getElementById('status') as HTMLParagraphElement | null;

if (!toggleNode || !statusNode) {
    throw new Error('Popup UI elements not found');
}

const toggle: HTMLButtonElement = toggleNode;
const status: HTMLParagraphElement = statusNode;

function paintState(enabled: boolean): void {
    toggle.dataset.state = enabled ? 'on' : 'off';
    toggle.setAttribute('aria-checked', String(enabled));

    status.classList.toggle('enabled', enabled);
    status.textContent = enabled ? 'Sources enabled' : 'Sources disabled';
}

async function readSetting(): Promise<boolean> {
    const data = await chrome.storage.local.get([INCLUDE_DEEP_RESEARCH_SOURCES_KEY]);

    if (typeof data[INCLUDE_DEEP_RESEARCH_SOURCES_KEY] !== 'boolean') {
        await chrome.storage.local.set({ [INCLUDE_DEEP_RESEARCH_SOURCES_KEY]: false });
        return false;
    }

    return data[INCLUDE_DEEP_RESEARCH_SOURCES_KEY] as boolean;
}

async function init(): Promise<void> {
    try {
        const enabled = await readSetting();
        paintState(enabled);
    } catch (error) {
        console.error('Could not initialize popup setting', error);
        paintState(false);
    }
}

toggle.addEventListener('click', async () => {
    const currentlyEnabled = toggle.getAttribute('aria-checked') === 'true';
    const nextValue = !currentlyEnabled;

    paintState(nextValue);

    try {
        await chrome.storage.local.set({ [INCLUDE_DEEP_RESEARCH_SOURCES_KEY]: nextValue });
    } catch (error) {
        console.error('Could not persist popup setting', error);
        paintState(currentlyEnabled);
    }
});

void init();
