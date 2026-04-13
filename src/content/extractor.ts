import { ICONS } from "~/constants/icons";
import { INCLUDE_DEEP_RESEARCH_SOURCES_KEY } from '~/constants/storage';
import { ExtractionResult } from "~/types";
import injectScriptUrl from '../inject/main.ts?script';

interface ListContext {
    type: 'UL' | 'OL' | null;
    index: number;
    depth: number;
}

const COMPLEX_LATEX_PATTERN = /\\(?:frac|int|sum|prod|sqrt|lim|infty|alpha|beta|gamma|delta|theta|lambda|sigma|omega|partial|nabla|ldots|begin|end|left|right|over|under|hat|bar|vec|tilde|mathbb|mathcal|mathrm)/;

function mathInlineToText(latex: string): string {
    const normalized = (latex || '').trim();

    // Treat command-heavy LaTeX as math mode and preserve source.
    if (COMPLEX_LATEX_PATTERN.test(normalized)) {
        return `$$${normalized}$$`;
    }

    // Border-case heuristic: equation-like superscript/subscript expressions read better in math mode.
    if ((normalized.includes('^') || normalized.includes('_')) && normalized.includes('=')) {
        return `$$${normalized}$$`;
    }

    // Simple inline math: convert common LaTeX escapes to plain text.
    return normalized
        .replace(/\\%/g, '%')
        .replace(/\\times/g, '×')
        .replace(/\\cdot/g, '·')
        .replace(/\\leq/g, '≤')
        .replace(/\\geq/g, '≥')
        .replace(/\\neq/g, '≠')
        .replace(/\\approx/g, '≈')
        .replace(/\\pm/g, '±')
        .replace(/\\lt/g, '<')
        .replace(/\\gt/g, '>')
        .replace(/[{}]/g, '')
        .replace(/\\\\/g, '')
        .trim();
}

interface SourceRef {
    url: string;
    title: string;
    domain: string;
}

function getTextContent(node: ParentNode, selector: string): string {
    return node.querySelector(selector)?.textContent?.trim() || '';
}

function extractSourceRefs(items: Element[]): SourceRef[] {
    const seen = new Set<string>();
    const refs: SourceRef[] = [];

    items.forEach((item) => {
        const url = item.querySelector('a')?.getAttribute('href') || '';
        if (!url || seen.has(url)) {
            return;
        }

        const title = getTextContent(item, '[data-test-id="sub-title"]')
            || getTextContent(item, '.source-card-title .ellipsis')
            || url;
        const domain = getTextContent(item, '[data-test-id="domain-name"]')
            || getTextContent(item, '.source-card-attribution-text')
            || '';

        refs.push({ url, title, domain });
        seen.add(url);
    });

    return refs;
}

function renderReferences(title: string, refs: SourceRef[]): string {
    if (refs.length === 0) {
        return '';
    }

    const lines = refs.map((source, i) => {
        const suffix = source.domain ? ` - ${source.domain}` : '';
        return `${i + 1}. [${source.title}](${source.url})${suffix}`;
    });

    return `\n### ${title}\n\n${lines.join('\n')}`;
}

function extractDeepResearchReferences(doc: Document): string {
    const root = doc.querySelector('deep-research-source-lists');
    if (!root) {
        return '';
    }

    const usedItems = Array.from(root.querySelectorAll('.source-list.used-sources browse-web-item'));
    const unusedItems = Array.from(root.querySelectorAll('.source-list.unused-sources browse-web-item'));

    const usedRefs = extractSourceRefs(usedItems);
    const unusedRefs = extractSourceRefs(unusedItems);

    // Fallback for layouts that don't include used/unused wrappers.
    if (usedRefs.length === 0 && unusedRefs.length === 0) {
        const allItems = Array.from(root.querySelectorAll('browse-web-item'));
        const fallbackUsed = extractSourceRefs(allItems.filter((item) => item.getAttribute('tabindex') === '-1'));
        const fallbackUnused = extractSourceRefs(allItems.filter((item) => item.getAttribute('tabindex') !== '-1'));

        if (fallbackUsed.length === 0 && fallbackUnused.length === 0) {
            return '';
        }

        return `## Deep Research Sources${renderReferences('Used in report', fallbackUsed)}${renderReferences('Consulted only', fallbackUnused)}\n`;
    }

    return `## Deep Research Sources${renderReferences('Used in report', usedRefs)}${renderReferences('Consulted only', unusedRefs)}\n`;
}

async function shouldIncludeDeepResearchSources(): Promise<boolean> {
    try {
        const data = await chrome.storage.local.get([INCLUDE_DEEP_RESEARCH_SOURCES_KEY]);
        return data[INCLUDE_DEEP_RESEARCH_SOURCES_KEY] === true;
    } catch (error) {
        console.warn('Could not read Deep Research source setting', error);
        return false;
    }
}

function extractMarkdownFromNode(node: Node, listContext: ListContext = { type: null, index: 0, depth: 0 }): string {
    if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
        return '';
    }

    const el = node as HTMLElement;
    const tag = el.tagName.toUpperCase();

    // ─── Math handling ────────────────────────────────────────────────────────
    // Covers: <math-block>, <span class="math-node">, <span class="math-inline">
    if (
        tag === 'MATH-BLOCK' ||
        el.classList.contains('math-node') ||
        el.classList.contains('math-inline')
    ) {
        const latex = el.getAttribute('data-math') || '';
        return tag === 'MATH-BLOCK' ? `\n$$\n${latex}\n$$\n` : mathInlineToText(latex);
    }

    // Skip KaTeX-rendered HTML entirely (already captured by math-inline above)
    if (el.classList.contains('katex') || el.classList.contains('katex-html')) {
        return '';
    }

    // ─── Skip UI-only nodes ───────────────────────────────────────────────────
    if ([
        'SOURCES-CAROUSEL-INLINE',
        'SOURCE-FOOTNOTE',
        'BUTTON',
        'MAT-ICON',
        'THINKING-PANEL',
    ].includes(tag)) {
        return '';
    }

    // Skip Angular table footer (contains export/copy buttons — not content)
    if (el.classList.contains('table-footer')) {
        return '';
    }

    // ─── Angular web-component table wrapper ──────────────────────────────────
    // <table-block> wraps a standard <table> inside .table-content
    // We delegate directly to the inner <table> to avoid footer noise.
    if (tag === 'TABLE-BLOCK') {
        const innerTable = el.querySelector(':scope table, table');
        if (innerTable) {
            return extractMarkdownFromNode(innerTable, listContext);
        }
        return '';
    }

    // ─── Standard <table> ────────────────────────────────────────────────────
    if (tag === 'TABLE') {
        let tableMd = '\n\n';
        const rows = Array.from(el.querySelectorAll('tr'));

        rows.forEach((row, i) => {
            // Only consider direct-parent rows to avoid nested table bleed
            const cells = Array.from(row.querySelectorAll('th, td'));
            let rowMd = '|';

            cells.forEach((cell) => {
                let cellContent = Array.from(cell.childNodes)
                    .map((c) => extractMarkdownFromNode(c))
                    .join('')
                    .trim();

                cellContent = cellContent.replace(/\|/g, '\\|').replace(/\n+/g, ' ');
                rowMd += ` ${cellContent} |`;
            });

            tableMd += `${rowMd}\n`;
            if (i === 0) {
                tableMd += `|${cells.map(() => ' --- ').join('|')}|\n`;
            }
        });

        return `${tableMd}\n`;
    }

    // ─── Lists ────────────────────────────────────────────────────────────────
    if (tag === 'UL' || tag === 'OL') {
        const newListContext: ListContext = { type: tag as 'UL' | 'OL', index: 0, depth: listContext.depth + 1 };
        let listText = '\n';

        Array.from(el.children).forEach((child) => {
            if (child.tagName.toUpperCase() === 'LI') {
                listText += extractMarkdownFromNode(child, newListContext);
            }
        });

        return `${listText}\n`;
    }

    if (tag === 'LI') {
        const indent = '  '.repeat(Math.max(0, listContext.depth - 1));
        const prefix = listContext.type === 'OL' ? `${++listContext.index}. ` : '- ';

        const liContent = Array.from(el.childNodes)
            .filter((c) => {
                if (c.nodeType !== Node.ELEMENT_NODE) return true;
                const childTag = (c as HTMLElement).tagName.toUpperCase();
                return childTag !== 'UL' && childTag !== 'OL';
            })
            .map((c) => extractMarkdownFromNode(c, listContext))
            .join('')
            .trim();

        const subLists = Array.from(el.children)
            .filter((c) => ['UL', 'OL'].includes(c.tagName.toUpperCase()))
            .map((c) => extractMarkdownFromNode(c, listContext))
            .join('');

        return `${indent}${prefix}${liContent}\n${subLists}`;
    }

    // ─── Generic element traversal ────────────────────────────────────────────
    let content = '';
    el.childNodes.forEach((child) => {
        content += extractMarkdownFromNode(child, listContext);
    });

    switch (tag) {
        case 'H1':
            return `\n# ${content.trim()}\n\n`;
        case 'H2':
            return `\n## ${content.trim()}\n\n`;
        case 'H3':
            return `\n### ${content.trim()}\n\n`;
        case 'STRONG':
        case 'B':
            return `**${content}**`;
        case 'EM':
        case 'I':
            return `*${content}*`;
        case 'P':
            return `\n${content.trim()}\n\n`;
        case 'BLOCKQUOTE':
            return `\n> ${content.trim().replace(/\n/g, '\n> ')}\n\n`;
        case 'CODE':
            return el.parentElement?.tagName.toUpperCase() === 'PRE' ? content : `\`${content}\``;
        case 'PRE':
            return `\n\`\`\`\n${content.trim()}\n\`\`\`\n\n`;
        case 'A':
            return `[${content}](${el.getAttribute('href') || ''})`;
        case 'BR':
            return '\n';
        default:
            return content;
    }
}

export function tryMarkdownExtraction(): ExtractionResult | null {
    const container = document.getElementById('extended-response-markdown-content');
    if (!container) return null;

    let markdown = extractMarkdownFromNode(container)
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    if (!markdown) return null;

    return {
        code: markdown,
        languageId: 'markdown'
    };
}

export async function tryMarkdownExtractionWithSources(): Promise<ExtractionResult | null> {
    const base = tryMarkdownExtraction();
    if (!base) return null;

    const includeSources = await shouldIncludeDeepResearchSources();
    if (!includeSources) {
        return base;
    }

    const references = extractDeepResearchReferences(document).trim();
    if (!references) {
        return base;
    }

    const code = `${base.code}\n\n${references}`.replace(/\n{3,}/g, '\n\n').trim();

    return {
        code,
        languageId: 'markdown'
    };
}

export function tryMonacoExtraction(): Promise<ExtractionResult> {
    return new Promise((resolve, reject) => {
        const listener = (event: MessageEvent) => {
            if (event.source !== window) return;
            if (event.data.type === 'GEMINI_CODE_FOUND') {
                window.removeEventListener('message', listener);
                resolve({ code: event.data.code, languageId: event.data.languageId });
            } else if (event.data.type === 'GEMINI_MONACO_NOT_FOUND') {
                window.removeEventListener('message', listener);
                reject('Monaco not accessible');
            }
        };
        window.addEventListener('message', listener);

        const script = document.createElement('script');
        script.src = chrome.runtime.getURL(injectScriptUrl);
        script.onload = function () { (this as HTMLScriptElement).remove(); };
        (document.head || document.documentElement).appendChild(script);
    });
}

export async function fallbackScrollExtraction(btn: HTMLElement): Promise<ExtractionResult> {
    const scrollContainer = document.querySelector('.monaco-scrollable-element') as HTMLElement;

    if (!scrollContainer || scrollContainer.scrollHeight <= scrollContainer.clientHeight) {
        const simpleLines = document.querySelectorAll('.view-lines .view-line');
        if (simpleLines.length > 0) {
            return {
                code: Array.from(simpleLines).map(l => (l.textContent || '').replace(/\u00a0/g, ' ')).join('\n'),
                languageId: null
            };
        }
        throw new Error("No container found");
    }

    btn.innerHTML = ICONS.LOADING;
    btn.classList.add('scanning');

    const allLines = new Map<number, string>();
    let lastScrollTop = -1;
    const originalScroll = scrollContainer.scrollTop;
    scrollContainer.scrollTop = 0;
    await new Promise(r => setTimeout(r, 100));

    const capture = () => {
        const lines = document.querySelectorAll<HTMLElement>('.view-line');
        lines.forEach((line) => {
            const top = parseInt(line.style.top || '0');
            const text = (line.textContent || '').replace(/\u00a0/g, ' ');
            allLines.set(top, text);
        });
    };

    while (Math.ceil(scrollContainer.scrollTop) < (scrollContainer.scrollHeight - scrollContainer.clientHeight)) {
        if (scrollContainer.scrollTop === lastScrollTop) break;
        lastScrollTop = scrollContainer.scrollTop;
        capture();
        scrollContainer.scrollTop += scrollContainer.clientHeight;
        await new Promise(resolve => setTimeout(resolve, 150));
    }
    capture();
    scrollContainer.scrollTop = originalScroll;

    return {
        code: Array.from(allLines.entries())
            .sort((a, b) => a[0] - b[0])
            .map(entry => entry[1])
            .join('\n'),
        languageId: null
    };
}
