# Changelog

## [0.3.0](https://github.com/yusufaf/quizaroni/compare/web-v0.2.0...web-v0.3.0) (2026-06-07)


### Features

* Add drag-and-drop uploads and improve UX across study set workflows ([d3e97c6](https://github.com/yusufaf/quizaroni/commit/d3e97c664ac687762a74db879c0d643af29761b4))
* Add image gallery with lightbox, time format settings, and theme polish ([9bb39cd](https://github.com/yusufaf/quizaroni/commit/9bb39cd3c500236903228bc0cac601d31f08acdb))
* Add internationalization (i18n) with English and Spanish support ([fca2775](https://github.com/yusufaf/quizaroni/commit/fca27756424f099001c37c8a5c6cea035e40ca65))
* Add local-first data layer with Dexie.js and PWA support ([a9ffaa3](https://github.com/yusufaf/quizaroni/commit/a9ffaa375d5a09b1f291bb4899acbcc725f54b89))
* Add notes download, card index toggle, and improve label management UX ([65d6814](https://github.com/yusufaf/quizaroni/commit/65d6814dfe2e7578e6a948d06ffe948f2e33cec2))
* Add notes search, study set table search, and advanced card management ([801307b](https://github.com/yusufaf/quizaroni/commit/801307bf92ec338fee6a952cc4f3918d10c7159e))
* add upload icon to Choose JSON File button ([79b9a73](https://github.com/yusufaf/quizaroni/commit/79b9a73c2850a0b749a6a668dc4c7bc0ac29e11c))
* Add user-customizable font size scaling for accessibility ([9fbd3e7](https://github.com/yusufaf/quizaroni/commit/9fbd3e73835e0a2d9ef1d3fb4c8bf52e7e3261bc))
* implement multi-label support in frontend UI ([99114ef](https://github.com/yusufaf/quizaroni/commit/99114ef22ec5124c660c9dc817255ebc2a482e29))
* port gamification to pnpm monorepo structure (issue [#4](https://github.com/yusufaf/quizaroni/issues/4)) ([49b20cb](https://github.com/yusufaf/quizaroni/commit/49b20cb596f3e799eb2b7019688eb22ce25eaa4e))
* **srs:** wire up spaced repetition in apps/web ([#7](https://github.com/yusufaf/quizaroni/issues/7)) ([37d12f2](https://github.com/yusufaf/quizaroni/commit/37d12f2dd81b618352f85c35dd043d8af526abd0))
* **tts:** add voice selection and apply across TTS playback ([80c51ee](https://github.com/yusufaf/quizaroni/commit/80c51ee29d55f384b900b5b5b92de3230b84d507))
* **web:** real favicon/PWA icon set from new logo ([4520d11](https://github.com/yusufaf/quizaroni/commit/4520d1157c2fc6627b30df59a9a6ef2a00764dcb))
* **web:** show logo image in navbar ([02e6dce](https://github.com/yusufaf/quizaroni/commit/02e6dceacaf53096322fc65d1f15b2cf407afabb))


### Bug Fixes

* add safety check for undefined labels in HomeStudySetCard ([15e5a42](https://github.com/yusufaf/quizaroni/commit/15e5a42598a59b5c4e0ef50841b77626cc3efd05))
* **api:** correct models/user import casing; move pnpm overrides to workspace root ([e9ee992](https://github.com/yusufaf/quizaroni/commit/e9ee9925240e774e40daef8bc0e16bfe1452c1fc))
* **deps:** add missing dexie dependency to fix production build ([276f75a](https://github.com/yusufaf/quizaroni/commit/276f75ab3cc6cf8d439744842b67324e1acdaf4d))
* **hooks:** scope pre-commit lint/fmt to handleable file types ([b68bbf5](https://github.com/yusufaf/quizaroni/commit/b68bbf573e8db4a8115fc40dc19c4440412b70bb))
* **vite:** dedupe react to resolve duplicate-copy hook errors ([de5a892](https://github.com/yusufaf/quizaroni/commit/de5a892a02e956c8326fa3c19462a54906b96866))
* **web:** bump SW cache to v2 + no-cache sw/manifest headers ([e2d2c07](https://github.com/yusufaf/quizaroni/commit/e2d2c07c035b70e7b57d1770f1d92ebbb15491ef))
* **web:** repair emotion prebundle + IPv6 HMR in dev ([ca4f670](https://github.com/yusufaf/quizaroni/commit/ca4f670986e22bda4444ff023af0d5fb82ec2373))
* **web:** run vp staged from package dir in pre-commit hook ([03a8f7a](https://github.com/yusufaf/quizaroni/commit/03a8f7a87c0822c2df8fc89e9e4b2c14bc20f3e5))
