// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
    site: 'https://fjaviermmdev.github.io',
    compressHTML: true,
    trailingSlash: 'always',
    markdown: { syntaxHighlight: false },
    security: {
        csp: {
            directives: [
                "default-src 'self'",
                "base-uri 'none'",
                "object-src 'none'",
                "form-action 'none'",
                "connect-src 'none'",
                "frame-src 'none'",
                "worker-src 'none'",
                "img-src 'self'",
                "font-src 'self'",
            ],
        },
    },
});
