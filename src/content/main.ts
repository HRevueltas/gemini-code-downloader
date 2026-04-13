import './styles.css';
import { detectLanguage, LANG_TO_EXT } from '../logic/languageDetector';
import { downloadBlob, getFileName } from './utils';
import { fallbackScrollExtraction, tryMarkdownExtractionWithSources, tryMonacoExtraction } from './extractor';
import { ExtractionResult } from '~/types';
import { ICONS } from '~/constants/icons';

import { incrementDownloadCountAndMaybeShowToast } from './reviewToast';

const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
const SHORTCUT_KEY = isMac ? 'Ctrl+Shift+D' : 'Alt+Shift+D';
const COPY_ICON = '<svg xmlns="http://www.w3.org/2000/svg" height="20" viewBox="0 -960 960 960" width="20" fill="currentColor"><path d="M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM240-80q-33 0-56.5-23.5T160-160v-560h80v560h440v80H240Zm120-240v-480 480Z"/></svg>';

async function resolveExtraction(btn: HTMLButtonElement): Promise<ExtractionResult> {
    let extractionResult: ExtractionResult | null = await tryMarkdownExtractionWithSources();

    if (!extractionResult) {
        try {
            extractionResult = await tryMonacoExtraction();
        } catch (e) {
            console.warn("Fallback to scroll...");
            extractionResult = await fallbackScrollExtraction(btn);
        }
    }

    if (!extractionResult?.code) throw new Error("No code extracted");
    return extractionResult;
}

async function copyToClipboard(text: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }

    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
}

async function handleDownload(btn: HTMLButtonElement, selectElement: HTMLSelectElement) {
    try {
        const extractionResult = await resolveExtraction(btn);

        const forcedExtension = selectElement.value;
        let details = detectLanguage(extractionResult.code, extractionResult.languageId);


        if (forcedExtension !== 'auto') {
            details = {
                ext: LANG_TO_EXT[forcedExtension]?.ext || forcedExtension,
                type: 'text/plain',
                name: forcedExtension.toUpperCase()
            };
        }

        const filename = getFileName(details.ext);
        downloadBlob(extractionResult.code, filename, details.type);

        updateBtnSuccess(btn, filename);
        incrementDownloadCountAndMaybeShowToast();

    } catch (err) {
        console.error(err);
        alert("Error extracting code.");
        resetBtn(btn);
    }
}

async function handleCopyMarkdown(btn: HTMLButtonElement) {
    try {
        const extractionResult = await resolveExtraction(btn);
        await copyToClipboard(extractionResult.code);

        btn.classList.remove('scanning');
        btn.classList.add('success');
        btn.innerHTML = ICONS.SUCCESS;
        btn.setAttribute('data-tooltip', 'Markdown copied');

        setTimeout(() => {
            btn.classList.remove('success');
            btn.innerHTML = COPY_ICON;
            btn.setAttribute('data-tooltip', 'Copy Markdown');
        }, 2000);
    } catch (err) {
        console.error(err);
        btn.innerHTML = COPY_ICON;
        btn.setAttribute('data-tooltip', 'Copy failed');
    }
}

function updateBtnSuccess(btn: HTMLButtonElement, filename: string) {
    btn.classList.remove('scanning');
    btn.classList.add('success');
    btn.innerHTML = ICONS.SUCCESS;
    btn.setAttribute('data-tooltip', `Saved: ${filename}`);
    setTimeout(() => resetBtn(btn), 3000);
}

function resetBtn(btn: HTMLButtonElement) {
    btn.classList.remove('success', 'scanning');
    btn.innerHTML = ICONS.DOWNLOAD;
    btn.setAttribute('data-tooltip', `Download code (${SHORTCUT_KEY})`);
}


const defaultOption = { val: 'auto', txt: 'Auto (Detect)' };
const generatedOptions = Object.entries(LANG_TO_EXT)
    .map(([key, details]) => ({
        val: key,
        txt: details.name
    }))
    .sort((a, b) => a.txt.localeCompare(b.txt));
const FORMAT_OPTIONS = [defaultOption, ...generatedOptions];

function shouldUseCompactToolbar(toolbar: Element, actionButtonsContainer: Element, isMarkdownOnly: boolean): boolean {
    if (!isMarkdownOnly) return false;

    const titleText = toolbar.querySelector('.title-text')?.textContent?.trim() || '';
    const isLongTitle = titleText.length >= 55;

    const toolbarWidth = (toolbar as HTMLElement).getBoundingClientRect().width;
    const actionsWidth = (actionButtonsContainer as HTMLElement).getBoundingClientRect().width;
    const hasTightSpace = toolbarWidth > 0 && (actionsWidth / toolbarWidth) > 0.34;

    return isLongTitle || hasTightSpace;
}

function injectUI(toolbar: Element) {
    const actionButtonsContainer = toolbar.querySelector('.action-buttons');
    const isExtendedResponseToolbar = toolbar.classList.contains('extended-response-toolbar');

    if (!actionButtonsContainer || actionButtonsContainer.querySelector('.gemini-harvester-container')) {
        return;
    }
    if (toolbar.closest('.canvas-container')) return;

    if (!isExtendedResponseToolbar && (
        toolbar.querySelector('print-button') ||
        toolbar.querySelector('[data-test-id="print-button"]') ||
        toolbar.querySelector('[data-test-id="download-preview-button"]') ||
        toolbar.querySelector('[data-test-id="insert-equation-button"]') ||
        toolbar.querySelector('formatting-buttons')
    )) {
        return;
    }
    const proseMirrorEditor = document.querySelector('ds-markdown-editor .ProseMirror, .canvas-container .ProseMirror');
    if (proseMirrorEditor && toolbar.closest('.canvas-container')) {
        return;
    }

    const container = document.createElement('div');
    container.className = 'gemini-harvester-container';

    const isDeepResearchToolbar = !!toolbar.querySelector('toc-menu');
    const isMarkdownOnly = isExtendedResponseToolbar || isDeepResearchToolbar;
    const useCompactToolbar = shouldUseCompactToolbar(toolbar, actionButtonsContainer, isMarkdownOnly);

    if (useCompactToolbar) {
        container.classList.add('gemini-harvester-compact');
    }

    const select = document.createElement('select');
    select.className = 'gemini-format-select';
    select.title = "Select output format";

    if (isMarkdownOnly) {
        const opt = document.createElement('option');
        opt.value = 'markdown';
        opt.textContent = 'Markdown';
        select.appendChild(opt);
    } else {
        FORMAT_OPTIONS.forEach(fmt => {
            const opt = document.createElement('option');
            opt.value = fmt.val;
            opt.textContent = fmt.txt;
            select.appendChild(opt);
        });
    }

    const btn = document.createElement('button');
    btn.className = 'gemini-download-btn';
    btn.innerHTML = ICONS.DOWNLOAD;
    btn.setAttribute('data-tooltip', `Download code (${SHORTCUT_KEY})`);
    btn.type = 'button';

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleDownload(btn, select);
    });

    if (isMarkdownOnly) {
        const copyBtn = document.createElement('button');
        copyBtn.className = 'gemini-copy-btn';
        copyBtn.innerHTML = COPY_ICON;
        copyBtn.setAttribute('data-tooltip', 'Copy Markdown');
        copyBtn.setAttribute('aria-label', 'Copy Markdown');
        copyBtn.type = 'button';

        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            handleCopyMarkdown(copyBtn);
        });

        container.appendChild(copyBtn);
    }

    if (!useCompactToolbar) {
        container.appendChild(select);
    }
    container.appendChild(btn);

    const actionButtons = toolbar.querySelector('.action-buttons');
    if (actionButtons) {
        if (isMarkdownOnly) {
            const closeBtn = actionButtons.querySelector('[data-test-id="close-button"]');
            if (closeBtn?.parentElement === actionButtons) {
                actionButtons.insertBefore(container, closeBtn);
            } else {
                actionButtons.appendChild(container);
            }
        } else {
            actionButtons.insertBefore(container, actionButtons.firstChild);
        }
    }
}

const observer = new MutationObserver(() => {
    const toolbars = document.querySelectorAll('toolbar');
    toolbars.forEach(injectUI);

    const codeBlocks = document.querySelectorAll('.code-block');
    codeBlocks.forEach(injectCodeBlockUI);
});

observer.observe(document.body, { childList: true, subtree: true });

function injectCodeBlockUI(codeBlock: Element) {
    const buttonsContainer = codeBlock.querySelector('.buttons');
    if (!buttonsContainer || buttonsContainer.querySelector('.gemini-download-btn-inline')) {
        return;
    }

    const langSpan = codeBlock.querySelector('.code-block-decoration > span');
    const languageHint = langSpan?.textContent?.trim().toLowerCase() || null;

    const btn = document.createElement('button');
    btn.className = 'gemini-download-btn-inline';
    btn.innerHTML = ICONS.DOWNLOAD;
    btn.setAttribute('data-tooltip', 'Download code');
    btn.setAttribute('aria-label', 'Download code');
    btn.type = 'button';

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        handleCodeBlockDownload(codeBlock, btn, languageHint);
    });

    buttonsContainer.appendChild(btn);
}

function handleCodeBlockDownload(codeBlock: Element, btn: HTMLButtonElement, languageHint: string | null) {
    try {
        const codeElement = codeBlock.querySelector('code[data-test-id="code-content"]');
        if (!codeElement) throw new Error("No code element found");

        const code = codeElement.textContent || '';
        if (!code.trim()) throw new Error("Empty code block");

        const details = detectLanguage(code, languageHint);
        const filename = getFileName(details.ext);
        downloadBlob(code, filename, details.type);

        btn.innerHTML = ICONS.SUCCESS;
        btn.classList.add('success');
        setTimeout(() => {
            btn.innerHTML = ICONS.DOWNLOAD;
            btn.classList.remove('success');
        }, 3000);

        incrementDownloadCountAndMaybeShowToast();
    } catch (err) {
        console.error(err);
        btn.innerHTML = ICONS.DOWNLOAD;
    }
}

//keyboard shortcuts
document.addEventListener('keydown', (e: KeyboardEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
    }

    const modifierKey = isMac ? e.ctrlKey : e.altKey;

    // Alt+Shift+D (Win/Linux)  Ctrl+Shift+D (Mac)
    if (modifierKey && e.shiftKey && e.key.toLowerCase() === 'd') {
        e.preventDefault();
        const btn = document.querySelector('.gemini-download-btn') as HTMLButtonElement;
        const select = document.querySelector('.gemini-format-select') as HTMLSelectElement;
        if (btn && select) {
            handleDownload(btn, select);
        }
    }
});