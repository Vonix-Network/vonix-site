const fs = require('fs');
const path = require('path');

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            walk(filePath);
        } else if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
            let content = fs.readFileSync(filePath, 'utf8');
            let originalContent = content;

            const methods = 'map|forEach|filter|find|some|every|sort|reduce';

            // 1. Fix async/sync parameter without parentheses: .map(async x => or .map(x =>
            const singleNoParens = new RegExp(`\\.(${methods})\\s*\\(\\s*(async\\s+)?([a-zA-Z0-9_]+)\\s*=>`, 'g');
            content = content.replace(singleNoParens, (match, method, asyncPrefix, param) => {
                const prefix = asyncPrefix || '';
                return `.${method}(${prefix}(${param}: any) =>`;
            });

            // 2. Fix parameters with parentheses: .map(async (x) => or .map((x, i) =>
            const withParens = new RegExp(`\\.(${methods})\\s*\\(\\s*(async\\s+)?\\s*\\(([^)]+)\\)\\s*=>`, 'g');
            content = content.replace(withParens, (match, method, asyncPrefix, params) => {
                const prefix = asyncPrefix || '';

                // If it already has types, skip it
                if (params.includes(':')) return match;

                // If it contains destructuring, skip for now
                if (params.includes('[') || params.includes('{')) return match;

                const typedParams = params.split(',').map(p => {
                    const trimmed = p.trim();
                    if (!trimmed) return trimmed;
                    return `${trimmed}: any`;
                }).join(', ');

                return `.${method}(${prefix}(${typedParams}) =>`;
            });

            // Fix catch(e)
            content = content.replace(/catch\s*\(\s*([a-zA-Z0-9_]+)\s*\)\s*\{/g, 'catch ($1: any) {');

            if (content !== originalContent) {
                fs.writeFileSync(filePath, content, 'utf8');
                console.log(`Fixed ${filePath}`);
            }
        }
    }
}

walk('./src');
