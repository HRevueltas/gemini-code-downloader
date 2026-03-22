import { ICONS } from "~/constants/icons";
import { ExtractionResult } from "~/types";
import injectScriptUrl from '../inject/main.ts?script';

interface ListContext {
    type: 'UL' | 'OL' | null;
    index: number;
    depth: number;
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

    if (tag === 'MATH-BLOCK' || el.classList.contains('math-node')) {
        const latex = el.getAttribute('data-math') || '';
        return tag === 'MATH-BLOCK' ? `\n$$\n${latex}\n$$\n` : `$${latex}$`;
    }

    // Skip UI-only nodes
    if ([
        'RESPONSE-ELEMENT',
        'SOURCES-CAROUSEL-INLINE',
        'SOURCE-FOOTNOTE',
        'BUTTON',
        'MAT-ICON',
        'THINKING-PANEL'
    ].includes(tag)) {
        return '';
    }

    if (tag === 'TABLE') {
        let tableMd = '\n\n';
        const rows = Array.from(el.querySelectorAll('tr'));

        rows.forEach((row, i) => {
            const cells = Array.from(row.querySelectorAll('th, td'));
            let rowMd = '|';

            cells.forEach((cell) => {
                let cellContent = Array.from(cell.childNodes)
                    .map((c) => extractMarkdownFromNode(c))
                    .join('')
                    .trim();

                cellContent = cellContent.replace(/\|/g, '\\|').replace(/\n/g, ' ');
                rowMd += ` ${cellContent} |`;
            });

            tableMd += `${rowMd}\n`;
            if (i === 0) {
                tableMd += `|${cells.map(() => '---').join('|')}|\n`;
            }
        });

        return `${tableMd}\n`;
    }

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

    const markdown = extractMarkdownFromNode(container)
        .replace(/\n{3,}/g, '\n\n')
        .trim();

    if (!markdown) return null;

    return {
        code: markdown,
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
        if (simpleLines.length > 0) return { code: Array.from(simpleLines).map(l => (l.textContent || '').replace(/\u00a0/g, ' ')).join('\n'), languageId: null };
        throw new Error("No container found");
    }

    btn.innerHTML = ICONS.LOADING;
    btn.classList.add('scanning');

    const allLines = new Map();
    let lastScrollTop = -1;
    const originalScroll = scrollContainer.scrollTop;
    scrollContainer.scrollTop = 0;
    await new Promise(r => setTimeout(r, 100));

    const capture = () => {
        const lines = document.querySelectorAll<HTMLElement>('.view-line');
        lines.forEach((line: HTMLElement) => {
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
        code: Array.from(allLines.entries()).sort((a, b) => a[0] - b[0]).map(entry => entry[1]).join('\n'),
        languageId: null
    };
}