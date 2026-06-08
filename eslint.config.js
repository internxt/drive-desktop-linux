const {
    defineConfig,
    globalIgnores,
} = require("eslint/config");

const globals = require("globals");
const tsParser = require("@typescript-eslint/parser");
const js = require("@eslint/js");

const {
    FlatCompat,
} = require("@eslint/eslintrc");

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

module.exports = defineConfig([{
    extends: compat.extends("@internxt/eslint-config-internxt"),

    rules: {
        "no-await-in-loop": "warn",

        "@typescript-eslint/no-use-before-define": ["warn", {
            functions: false,
            classes: true,
            variables: true,
        }],

        "array-callback-return": "warn",

        "max-len": ["warn", {
            code: 120,
            ignorePattern: "^it",
            ignoreUrls: true,
            ignoreStrings: true,
            ignoreTemplateLiterals: true,
        }],

        "@typescript-eslint/ban-ts-comment": "warn",
        "no-async-promise-executor": "warn",
        "@typescript-eslint/no-explicit-any": "warn",
        "@typescript-eslint/no-unused-vars": "warn",
        "@typescript-eslint/no-unsafe-declaration-merging": "warn",
        "object-shorthand": ["warn", "always"],
    },

    languageOptions: {
        parser: tsParser,
    },

    settings: {
        "import/resolver": {
            node: {},

            webpack: {
                config: require.resolve("./.erb/configs/webpack.config.eslint.ts"),
            },

            typescript: {},
        },

        "import/parsers": {
            "@typescript-eslint/parser": [".ts", ".tsx"],
        },
    },
}, globalIgnores(["src/infra/schemas.d.ts", "assets/assets.d.ts"]), {
    files: ["**/*.ts", "**/*.tsx"],

    languageOptions: {
        parserOptions: {
            project: ["./tsconfig.json"],
        },

        globals: {
            ...globals.jest,
        },
    },
}, globalIgnores([
    "**/logs",
    "**/*.log",
    "**/pids",
    "**/*.pid",
    "**/*.seed",
    "**/coverage",
    "**/.eslintcache",
    "**/node_modules",
    "**/.DS_Store",
    "**/dist",
    "**/build",
    "release/app/dist",
    "release/build",
    ".erb/**",
    "**/.idea",
    "**/npm-debug.log.*",
    "**/*.css.d.ts",
    "**/*.sass.d.ts",
    "**/*.scss.d.ts",
    "src/workers/backups/process.ts",
    "src/workers/backups/*",
    "src/workers/filesystems/*",
    "src/apps/renderer/localize/i18n.service.ts",
    "src/test/*",
    "tests/vitest/*",
    // Root-level config and build scripts — not part of the application codebase
    "beforeBuild.js",
    "eslint.config.js",
    "tailwind.config.js",
    ".prettierrc.js",
    "vitest.config.main.ts",
    "vitest.config.renderer.ts",
    "vitest.setup.main.ts",
    "vitest.setup.renderer.ts",
    "scripts/**",
])]);
