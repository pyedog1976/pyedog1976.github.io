module.exports = {
    content: [
        "_site/**/*.html",
        "_site/**/*.js"
    ],
    // Only purge the Sass bundle. Do not run PurgeCSS on vendor *.min.css or on
    // dark-sci-min.css: extractors miss classes used in complex layouts (e.g.
    // HISTORY chess trace), which breaks positioning on GitHub Actions only.
    css: [
        "_site/assets/css/main.css",
    ],
    output: "_site/assets/css/",
    skippedContentGlobs: [
        "_site/assets/**/*.html"
    ]
};
