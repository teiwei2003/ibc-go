module.exports = {
    locales: {
        '/': {
            title: "Ibc-Go Docs",
            description: "Ibc-Go is an open source, public blockchain protocol that provides fundamental infrastructure for a decentralized economy and enables open participation in the creation of new financial primitives to power the innovation of money.",
        },
        '/zh/': {
            title: "Ibc-Go 文档",
            description: "Ibc-Go is an open source, public blockchain protocol that provides fundamental infrastructure for a decentralized economy and enables open participation in the creation of new financial primitives to power the innovation of money.",
        },
        '/ja/': {
            title: "Ibc-Go ドキュメント",
            description: "Ibc-Go is an open source, public blockchain protocol that provides fundamental infrastructure for a decentralized economy and enables open participation in the creation of new financial primitives to power the innovation of money.",
        }
    },
    markdown: {
        extendMarkdown: (md) => {
            md.use(require("markdown-it-footnote"));
        },
    },
    plugins: [
        [
            "@vuepress/register-components",
            {
                componentsDir: "theme/components",
            },
        ],
        [
            "vuepress-plugin-mathjax",
            {
                target: "svg",
                macros: {
                    "*": "\\times",
                },
            },
        ],
    ],
    head: [
        [
            "link",
            {
                rel: "stylesheet",
                type: "text/css",
                href: "https://cloud.typography.com/7420256/6416592/css/fonts.css",
            },
        ],
        [
            "link",
            {
                rel: "stylesheet",
                type: "text/css",
                href: "https://www.terra.money/static/fonts/jetbrainsMono.css?updated=190220"
            },
        ],
        [
            "link",
            {
                rel: "stylesheet",
                type: "text/css",
                href: "https://fonts.googleapis.com/css?family=Material+Icons|Material+Icons+Outlined",
            },
        ],

        [
            "link",
            {
                rel: "stylesheet",
                type: "text/css",
                href: "https://fonts.googleapis.com/css?family=Noto+Sans+KR:400,500,700&display=swap",
            },
        ],
        [
            "link",
            {
                rel: "icon",
                type: "image/png",
                href: "/img/favicon.png",
            },
        ],
        [
            "script",
            {},
            `window.onload = function() {
requestAnimationFrame(function() {
    if (location.hash) {
    const element = document.getElementById(location.hash.slice(1))

    if (element) {
        element.scrollIntoView()
    }
    }
})
}`,
        ],
    ],
    themeConfig: {
        locales: {
            '/': {
                selectText: 'Languages',
                label: 'English',
                nav: [
                    { text: "Top", link: "/" },
                    { text: "App Modules", link: "/app_modules/interchain-accounts/" },
                    { text: "Architecture", link: "/architecture/" },
                    { text: "IBC", link: "/ibc/" },
                    { text: "Migrations", link: "/migrations/" },
                    { text: "Roadmap", link: "/roadmap/" },
                    {
                        text: "GitHub",
                        link: "https://github.com/highwayns/cosmos-sdk",
                        icon: "/img/github.svg",
                    },
                ],
                sidebar: {
                    "/app_modules/interchain-accounts/": [
                        "/app_modules/interchain-accounts/",
                        "/app_modules/interchain-accounts/ica_auth",
                        "/app_modules/interchain-accounts/integration",
                    ],
                    "/architecture/": [
                        "/architecture/",
                        "/architecture/adr-001-coin-source-tracing",
                        "/architecture/adr-015-ibc-packet-receiver",
                        "/architecture/adr-025-ibc-passive-channels",
                        "/architecture/adr-026-ibc-client-recovery-mechanisms",
                        "/architecture/adr-027-ibc-wasm",
                    ],
                    "/ibc/": [
                        "/ibc/",
                        {
                            title: "middleware",
                            children: [
                                "/ibc/middleware/integration",
                            ],
                            collapsable: true,
                        },
                        {
                            title: "upgrades",
                            children: [
                                "/ibc/upgrades/developer-guide",
                                "/ibc/upgrades/genesis-restart",
                                "/ibc/upgrades/quick-guide",
                            ],
                            collapsable: true,
                        },
                        "/ibc/apps",
                        "/ibc/events",
                        "/ibc/integration",
                        "/ibc/params",
                        "/ibc/proposals",
                        "/ibc/proto-docs",
                        "/ibc/relayer",
                    ],
                    "/migrations/": [
                        "/migrations/",
                        "/migrations/sdk-to-v1",
                        "/migrations/v1-to-v2",
                        "/migrations/v2-to-v3",
                    ],
                    "/roadmap/": [
                        "/roadmap/",
                    ],
                    "/": [{
                        title: "Overview",
                        children: [
                            "/DOCS_README",
                        ],
                        collapsable: false,
                    }, ],
                },
            },
            '/zh/': {
                selectText: '选择语言',
                // 该语言在下拉菜单中的标签
                label: '简体中文',
                nav: [
                    { text: "首页", link: "/zh/" },
                    { text: "App Modules", link: "/zh/app_modules/interchain-accounts/" },
                    { text: "Architecture", link: "/zh/architecture/" },
                    { text: "IBC", link: "/zh/ibc/" },
                    { text: "Migrations", link: "/zh/migrations/" },
                    { text: "Roadmap", link: "/zh/roadmap/" },
                    {
                        text: "GitHub",
                        link: "https://github.com/highwayns/cosmos-sdk",
                        icon: "/img/github.svg",
                    },
                ],
                sidebar: {
                    "/zh/app_modules/interchain-accounts/": [
                        "/zh/app_modules/interchain-accounts/",
                        "/zh/app_modules/interchain-accounts/ica_auth",
                        "/zh/app_modules/interchain-accounts/integration",
                    ],
                    "/zh/architecture/": [
                        "/zh/architecture/",
                        "/zh/architecture/adr-001-coin-source-tracing",
                        "/zh/architecture/adr-015-ibc-packet-receiver",
                        "/zh/architecture/adr-025-ibc-passive-channels",
                        "/zh/architecture/adr-026-ibc-client-recovery-mechanisms",
                        "/zh/architecture/adr-027-ibc-wasm",
                    ],
                    "/zh/ibc/": [
                        "/zh/ibc/",
                        {
                            title: "middleware",
                            children: [
                                "/zh/ibc/middleware/integration",
                            ],
                            collapsable: true,
                        },
                        {
                            title: "upgrades",
                            children: [
                                "/zh/ibc/upgrades/developer-guide",
                                "/zh/ibc/upgrades/genesis-restart",
                                "/zh/ibc/upgrades/quick-guide",
                            ],
                            collapsable: true,
                        },
                        "/zh/ibc/apps",
                        "/zh/ibc/events",
                        "/zh/ibc/integration",
                        "/zh/ibc/params",
                        "/zh/ibc/proposals",
                        "/zh/ibc/proto-docs",
                        "/zh/ibc/relayer",
                    ],
                    "/zh/migrations/": [
                        "/zh/migrations/",
                        "/zh/migrations/sdk-to-v1",
                        "/zh/migrations/v1-to-v2",
                        "/zh/migrations/v2-to-v3",
                    ],
                    "/zh/roadmap/": [
                        "/zh/roadmap/",
                    ],
                    "/zh/": [{
                        title: "Overview",
                        children: [
                            "/zh/DOCS_README",
                        ],
                        collapsable: false,
                    }, ],
                },
            },
            '/ja/': {
                selectText: '言語選択',
                // 该语言在下拉菜单中的标签
                label: '日本語',
                nav: [
                    { text: "トップ", link: "/ja/" },
                    { text: "App Modules", link: "/ja/app_modules/interchain-accounts/" },
                    { text: "Architecture", link: "/ja/architecture/" },
                    { text: "IBC", link: "/ja/ibc/" },
                    { text: "Migrations", link: "/ja/migrations/" },
                    { text: "Roadmap", link: "/ja/roadmap/" },
                    {
                        text: "GitHub",
                        link: "https://github.com/highwayns/cosmos-sdk",
                        icon: "/img/github.svg",
                    },
                ],
                sidebar: {
                    "/ja/app_modules/interchain-accounts/": [
                        "/ja/app_modules/interchain-accounts/",
                        "/ja/app_modules/interchain-accounts/ica_auth",
                        "/ja/app_modules/interchain-accounts/integration",
                    ],
                    "/ja/architecture/": [
                        "/ja/architecture/",
                        "/ja/architecture/adr-001-coin-source-tracing",
                        "/ja/architecture/adr-015-ibc-packet-receiver",
                        "/ja/architecture/adr-025-ibc-passive-channels",
                        "/ja/architecture/adr-026-ibc-client-recovery-mechanisms",
                        "/ja/architecture/adr-027-ibc-wasm",
                    ],
                    "/ja/ibc/": [
                        "/ja/ibc/",
                        {
                            title: "middleware",
                            children: [
                                "/ja/ibc/middleware/integration",
                            ],
                            collapsable: true,
                        },
                        {
                            title: "upgrades",
                            children: [
                                "/ja/ibc/upgrades/developer-guide",
                                "/ja/ibc/upgrades/genesis-restart",
                                "/ja/ibc/upgrades/quick-guide",
                            ],
                            collapsable: true,
                        },
                        "/ja/ibc/apps",
                        "/ja/ibc/events",
                        "/ja/ibc/integration",
                        "/ja/ibc/params",
                        "/ja/ibc/proposals",
                        "/ja/ibc/proto-docs",
                        "/ja/ibc/relayer",
                    ],
                    "/ja/migrations/": [
                        "/ja/migrations/",
                        "/ja/migrations/sdk-to-v1",
                        "/ja/migrations/v1-to-v2",
                        "/ja/migrations/v2-to-v3",
                    ],
                    "/ja/roadmap/": [
                        "/ja/roadmap/",
                    ],
                    "/ja/": [{
                        title: "Overview",
                        children: [
                            "/ja/DOCS_README",
                        ],
                        collapsable: false,
                    }, ],
                },
            },
        },
        sidebarDepth: 3,
        // overrideTheme: 'dark',
        // prefersTheme: 'dark',
        // overrideTheme: { light: [6, 18], dark: [18, 6] },
        // theme: 'default-prefers-color-scheme',
        logo: "/img/logo-cosmos.svg",
        lastUpdated: "Updated on",
        repo: "teiwei2003/Ibc-go",
        editLinks: true,
        editLinkText: "Edit this page on GitHub",
        docsBranch: 'main',
        docsDir: "docs",
        algolia: {
            apiKey: "5957091e293f7b97f2994bde312aed99",
            indexName: "terra-project",
        },
    },
};