import { LanguageDetails } from "~/types";


export const LANG_TO_EXT: Record<string, LanguageDetails> = {
    'bat': { ext: 'bat', type: 'text/plain', name: 'Batch' },
    'javascript': { ext: 'js', type: 'text/javascript', name: 'JavaScript' },
    'typescript': { ext: 'ts', type: 'text/javascript', name: 'TypeScript' },
    'c': { ext: 'c', type: 'text/plain', name: 'C' },
    'cpp': { ext: 'cpp', type: 'text/plain', name: 'C++' },
    'csharp': { ext: 'cs', type: 'text/plain', name: 'C#' },
    'css': { ext: 'css', type: 'text/css', name: 'CSS' },
    'dart': { ext: 'dart', type: 'text/plain', name: 'Dart' },
    'dockerfile': { ext: 'dockerfile', type: 'text/plain', name: 'Dockerfile' },
    'go': { ext: 'go', type: 'text/plain', name: 'Go' },
    'graphql': { ext: 'graphql', type: 'text/plain', name: 'GraphQL' },
    'html': { ext: 'html', type: 'text/html', name: 'HTML' },
    'java': { ext: 'java', type: 'text/x-java-source', name: 'Java' },
    'json': { ext: 'json', type: 'application/json', name: 'JSON' },
    'kotlin': { ext: 'kt', type: 'text/plain', name: 'Kotlin' },
    'lua': { ext: 'lua', type: 'text/plain', name: 'Lua' },
    'markdown': { ext: 'md', type: 'text/markdown', name: 'Markdown' },
    'perl': { ext: 'pl', type: 'text/plain', name: 'Perl' },
    'pgsql': { ext: 'sql', type: 'text/plain', name: 'PostgreSQL' },
    'php': { ext: 'php', type: 'text/x-php', name: 'PHP' },
    'plaintext': { ext: 'txt', type: 'text/plain', name: 'Text' },
    'powershell': { ext: 'ps1', type: 'text/plain', name: 'PowerShell' },
    'python': { ext: 'py', type: 'text/x-python', name: 'Python' },
    'r': { ext: 'r', type: 'text/plain', name: 'R' },
    'ruby': { ext: 'rb', type: 'text/plain', name: 'Ruby' },
    'rust': { ext: 'rs', type: 'text/plain', name: 'Rust' },
    'scala': { ext: 'scala', type: 'text/plain', name: 'Scala' },
    'scss': { ext: 'scss', type: 'text/x-scss', name: 'SCSS' },
    'shell': { ext: 'sh', type: 'text/plain', name: 'Shell' },
    'sql': { ext: 'sql', type: 'text/plain', name: 'SQL' },
    'swift': { ext: 'swift', type: 'text/plain', name: 'Swift' },
    'xml': { ext: 'xml', type: 'text/xml', name: 'XML' },
    'yaml': { ext: 'yml', type: 'text/yaml', name: 'YAML' },
    'jsx': { ext: 'jsx', type: 'text/javascript', name: 'React (JSX)' },
    'tsx': { ext: 'tsx', type: 'text/javascript', name: 'React (TSX)' },
};

export function detectLanguage(code: string, monacoLangId: string | null = null): LanguageDetails {
    const c = code.trim();

    if (monacoLangId === 'javascript' || monacoLangId === 'typescript') {
        const isReact = c.includes('import React') || c.includes('from "react"') || c.includes("from 'react'") || c.match(/<[A-Z][a-zA-Z]*\s/);

        if (monacoLangId === 'typescript') {
            return isReact
                ? { ext: 'tsx', type: 'text/javascript', name: 'React (TSX)' }
                : { ext: 'ts', type: 'text/javascript', name: 'TypeScript' };
        } else {
            return isReact
                ? { ext: 'jsx', type: 'text/javascript', name: 'React (JSX)' }
                : { ext: 'js', type: 'text/javascript', name: 'JavaScript' };
        }
    }

    if (monacoLangId) {
        const langDetails = LANG_TO_EXT[monacoLangId.toLowerCase()];
        if (langDetails) {
            return langDetails;
        }
    }
    //svg
    if (c.startsWith('<svg') || c.includes('xmlns="http://www.w3.org/2000/svg"')) {
        return { ext: 'svg', type: 'image/svg+xml', name: 'SVG' };
    }

    if (c.includes('import React') || c.includes('export default function') || c.includes('className=') || c.includes('useState')) {
        return { ext: 'jsx', type: 'text/javascript', name: 'React' };
    }
    return { ext: 'txt', type: 'text/plain', name: 'Text' };
}
