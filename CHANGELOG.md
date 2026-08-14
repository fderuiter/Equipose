# [1.51.0](https://github.com/fderuiter/equipose-randomization/compare/v1.50.0...v1.51.0) (2026-08-14)


### Bug Fixes

* **ci:** create separate tsconfig for Cloudflare worker and test files to resolve ESLint project service parsing error ([3487dbb](https://github.com/fderuiter/equipose-randomization/commit/3487dbb2f33c55c5440feab1023d44734695a2f8))
* **tests:** handle empty CSV outputs in sequence parity checks ([c99941e](https://github.com/fderuiter/equipose-randomization/commit/c99941ede6f51c12f96aad1e4dd9eac9e2a7f453))


### Features

* **edge:** implement HTTP 301 redirects for capitalized valid SPA pages with spec coverage ([a98591f](https://github.com/fderuiter/equipose-randomization/commit/a98591f89838f2334d04d01f18b466164721e3ee))
* implement dual-seed PRNG isolation for clinical allocations and subject ID generation ([#789](https://github.com/fderuiter/equipose-randomization/issues/789)) ([8ef4475](https://github.com/fderuiter/equipose-randomization/commit/8ef4475780ea40862124e961e856133da33cdff9))
* **r-verify:** re-implement verify_audit_hash.R as dependency-free Base-R utility ([fad9d2c](https://github.com/fderuiter/equipose-randomization/commit/fad9d2cfbd539a114420275c1ac9431ec2c69680))
* Structured Syntax Regex Validation & Syntactic Variable Auditing for R and Python ([#788](https://github.com/fderuiter/equipose-randomization/issues/788)) ([316c6ca](https://github.com/fderuiter/equipose-randomization/commit/316c6caedf366de3d9d0ad0c5a56d38f3abe0730))

# [1.50.0](https://github.com/fderuiter/Equipose/compare/v1.49.0...v1.50.0) (2026-08-13)


### Features

* **core:** implement robust storage fallback and self-healing recovery ([6c2cef6](https://github.com/fderuiter/Equipose/commit/6c2cef6d541a8625463a688a1e9c9fa559021152))

# [1.49.0](https://github.com/fderuiter/Equipose/compare/v1.48.0...v1.49.0) (2026-08-13)


### Features

* **r-generator:** secure-by-design native nested R list structure for strata ([8ac3356](https://github.com/fderuiter/Equipose/commit/8ac33561e33cb49fd85545a5bc666f99aa47ebc0))

# [1.48.0](https://github.com/fderuiter/Equipose/compare/v1.47.0...v1.48.0) (2026-08-12)


### Bug Fixes

* **ci:** expose system R library paths to custom setup-r build to avoid downloading packages from blocked CRAN ([8076ac5](https://github.com/fderuiter/Equipose/commit/8076ac56e42f72ee1d379b8e1b43dd28b04c4d83))
* pre-install R packages r-cran-jsonlite and r-cran-digest in CI and add self-healing local fallback ([508c691](https://github.com/fderuiter/Equipose/commit/508c69110653d4f323e1cf365600c625c8d1aabe))
* **tests:** resolve type mismatch in crypto-hash-parity spec ([1f79d6b](https://github.com/fderuiter/Equipose/commit/1f79d6b2798a1489a5a76ba951f14d6d752bb98c))


### Features

* implement verified cross-language audit hash parity and CI test suite [REQ-21CFR11-005] ([2f08208](https://github.com/fderuiter/Equipose/commit/2f082084b9a135a3cfda94602802d374eba3f506))

# [1.47.0](https://github.com/fderuiter/Equipose/compare/v1.46.0...v1.47.0) (2026-08-12)


### Bug Fixes

* **a11y:** resolve color-contrast violation for disabled blinding toggle label by associating it semantically ([3de8189](https://github.com/fderuiter/Equipose/commit/3de818912d97cb3aa303d28daf4ab9cd73026c45))
* **docs:** resolve architecture diagram sync failure by mapping domain level boundaries and preventing empty source nodes ([e9a5a86](https://github.com/fderuiter/Equipose/commit/e9a5a866fca95fef8ea9a394ee3cc7ebb0b9854d))
* **e2e:** authorize simulated session context and fix layout height regression in screenshots ([8c4edde](https://github.com/fderuiter/Equipose/commit/8c4eddedef72c1650fcfd583ece7529b32c334d9))
* **e2e:** extract only the main schema script from downloaded companion ZIP package in fixtures generation test ([9c667bc](https://github.com/fderuiter/Equipose/commit/9c667bc562c0ae1882b1ed2c79a807ca422da52b))
* **e2e:** update blinding toggle label selector and resolve redundant click double-triggering bug ([1d56a08](https://github.com/fderuiter/Equipose/commit/1d56a08b50655242dd77c6d0e9dbeaa801bdc101))
* **e2e:** update E2E tests to assert on ZIP bundle file downloads ([9d1f572](https://github.com/fderuiter/Equipose/commit/9d1f5724f1b4981579c7a5d36f2adf2e6dee279a))
* **schema-management:** resolve forbidden core MT19937 imports using facade static methods ([17ae455](https://github.com/fderuiter/Equipose/commit/17ae45581eb3a24a421e99205795cd064785e4da))


### Features

* implement dual-tier role matrix with localized selectors and validation manifests ([ac01c6a](https://github.com/fderuiter/Equipose/commit/ac01c6a927cff4be85fc23e7027e7687ba132583))
* implement two-way registry verification and strategic pillar integrated reporting ([3540e0c](https://github.com/fderuiter/Equipose/commit/3540e0c5bc9333f06f5a22a11e14c43aa247697f))
* **schema-management:** implement modular companion test packages for R, Python, SAS, STATA exports ([6050160](https://github.com/fderuiter/Equipose/commit/6050160a5f9672ca6b39be41b4c88523533d9242))
* **security:** enforce domain-level network restrictions via static ESLint boundaries ([51371f6](https://github.com/fderuiter/Equipose/commit/51371f654f0975278ff6da4c911029432b2f1d1b))

# [1.46.0](https://github.com/fderuiter/Equipose/compare/v1.45.0...v1.46.0) (2026-08-11)


### Bug Fixes

* **ci:** fix SAS AST validation for empty strata and run syntax validator with tsx ([b6afe2b](https://github.com/fderuiter/Equipose/commit/b6afe2b68b18767afb07b0b525681c0d4398c896))
* **sas:** optimize SAS validation and safely handle special characters/spaces in strata factor names without dynamic RegExp ([dd2dc47](https://github.com/fderuiter/Equipose/commit/dd2dc478a11bf7e53d218bf45aa9ccea81acec2c))
* **security:** resolve Semgrep ReDoS warning for dynamic RegExp on SAS ast-validator ([c1a77b9](https://github.com/fderuiter/Equipose/commit/c1a77b958f4e8f68f53738a663443a3027c248b3))
* **test:** resolve TypeScript compilation errors in sanitizing-logger unit tests ([8dc33cc](https://github.com/fderuiter/Equipose/commit/8dc33ccd8263ff45d10fa7b532a1573d3c6b7d74))


### Features

* implement pure Python MT19937 PRNG and standardized dynamic matrix audit trail for R, Python, SAS, STATA ([#762](https://github.com/fderuiter/Equipose/issues/762)) ([19fc95b](https://github.com/fderuiter/Equipose/commit/19fc95bd82e3c5d5f41f7d2e6eacec32b471c77f))
* implement Semantic AST and Symbolic Validator for SAS and Stata scripts ([31e7ec0](https://github.com/fderuiter/Equipose/commit/31e7ec077a8a29ad642e4fd6cd0f77daa0778184))
* **telemetry:** implement property lookup isolation and defensive double-wrap for global logger ([034433a](https://github.com/fderuiter/Equipose/commit/034433a85031cc7b1f5dc4f5f22d4807d3279539))

# [1.45.0](https://github.com/fderuiter/Equipose/compare/v1.44.0...v1.45.0) (2026-08-11)


### Bug Fixes

* **ci:** run validate-adr.js directly with node instead of pnpm ([50baddd](https://github.com/fderuiter/Equipose/commit/50baddd86608719e7885fb17ae2953cd221e5393))
* **test:** remove Jasmine withContext method from theme service spec to fix Angular CLI build compilation failure ([4834c18](https://github.com/fderuiter/Equipose/commit/4834c181d24d22c14f21dd4192e49dbe7b381e4a))


### Features

* **adr:** implement automated ADR validation and retrofitted exemplar ([846890d](https://github.com/fderuiter/Equipose/commit/846890da09171c3d5001d22a24fbdceff74001ca))
* implement code-level strategic pillar annotations with validation scanner ([1c1e83c](https://github.com/fderuiter/Equipose/commit/1c1e83c74a7b92a8094112cf1903c9caca3e7bac))
* implement thread-safe mutex and locking boilerplate for dynamic Python scripts, enable dynamic minimization selection in UI and show concurrency warnings ([383ef7f](https://github.com/fderuiter/Equipose/commit/383ef7ff39f986ed9aec17ae94bf3a953215b616))
* implement trailing slash normalization for router and must-revalidate cache headers for sitemap and robots ([57ccc18](https://github.com/fderuiter/Equipose/commit/57ccc188d16205afbc3cd1d759f42e63811106f2))
* implement visual density service and adaptive compact/comfortable layouts ([a0f7551](https://github.com/fderuiter/Equipose/commit/a0f7551943363738263144b1b578c7cd29cf944c))

# [1.44.0](https://github.com/fderuiter/Equipose/compare/v1.43.0...v1.44.0) (2026-08-08)


### Features

* implement Pocock-Simon Minimization SEO meta tags, landing feature card, and About H2 section ([187d280](https://github.com/fderuiter/Equipose/commit/187d280603be95adcd8d2c55d21e486390a1bc41))

# [1.43.0](https://github.com/fderuiter/Equipose/compare/v1.42.0...v1.43.0) (2026-08-08)


### Bug Fixes

* **worker:** remove unused import causing workers build failure ([a04bf8e](https://github.com/fderuiter/Equipose/commit/a04bf8eb37e90db9084e43136987bd2c255baadd))


### Features

* **sas:** implement dynamic SAS Hash Objects for site tracking and bypass index translation ([bfaa94c](https://github.com/fderuiter/Equipose/commit/bfaa94c4cf6a8f8fef38091e80e3b29fa3d720c9))

# [1.42.0](https://github.com/fderuiter/Equipose/compare/v1.41.0...v1.42.0) (2026-08-08)


### Bug Fixes

* **e2e:** hide footer update indicator during visual regression checks to preserve layout baselines ([ec1a4d2](https://github.com/fderuiter/Equipose/commit/ec1a4d278feba1c322d7241835c60013f6bddef6))


### Features

* implement persistent footer update status indicator and manual check logic ([5616a65](https://github.com/fderuiter/Equipose/commit/5616a65244934d2c468f6d6035bc9aff6dee8974))

# [1.41.0](https://github.com/fderuiter/Equipose/compare/v1.40.0...v1.41.0) (2026-08-07)


### Bug Fixes

* **e2e:** inject visual stabilization stylesheet globally and align Chromium/Firefox baselines ([3b992e0](https://github.com/fderuiter/Equipose/commit/3b992e087f8f7edd763c808273c43c65a9c2e420))
* **e2e:** update browser visual regression snapshots and resolve toast/tooltip screenshot stability ([4cd9549](https://github.com/fderuiter/Equipose/commit/4cd9549ba36dfd14ece826f9bc7e3029a45037e1))
* **e2e:** update chromium and firefox step 5 warning toast visual regression snapshots to match CSS overrides ([ff5a75f](https://github.com/fderuiter/Equipose/commit/ff5a75f279d63bda4707813be2c10b634550c59c))


### Features

* decouple notifications, implement Step 3 validation tooltips and Step 5 stratification reset warning toasts with visual regression test coverage ([1b8762a](https://github.com/fderuiter/Equipose/commit/1b8762ab7e4a7323fcf93ca92730be5c54130777))
* implement standardized persona validation framework and automated traceability matrix scans ([610d807](https://github.com/fderuiter/Equipose/commit/610d8070c304aa5ffb6d6dfa74d83ed7b86f86b0))

# [1.40.0](https://github.com/fderuiter/Equipose/compare/v1.39.0...v1.40.0) (2026-08-07)


### Bug Fixes

* **security:** bypass dynamic RegExp warning in sanitizing-logger.util.ts ([524bd4d](https://github.com/fderuiter/Equipose/commit/524bd4d7921d2437bca31d3a1629858a307e156b))
* **security:** bypass dynamic RegExp warning in worker patternToRegExp ([7020a1b](https://github.com/fderuiter/Equipose/commit/7020a1ba6c1e78bf2edc705d110a61bf596d648b))
* **study-builder:** restore test environment check in window beforeunload to prevent E2E scenario state pollution ([67ef9ed](https://github.com/fderuiter/Equipose/commit/67ef9ed2504398b5170d8f3ed38edb961236739e))
* **study-builder:** wrap sessionStorage accesses in safe helpers to prevent crashing on unhandled SecurityError or TypeError ([5546d01](https://github.com/fderuiter/Equipose/commit/5546d017597728b3d626165b031196e79cdbd99b))


### Features

* enforce strict 5% visual regression limit with custom CSS stabilization ([3acce53](https://github.com/fderuiter/Equipose/commit/3acce53a16a80293ff8ac0bf4c75093142a9ba69))
* implement centralized sanitizing logger utility to redact clinical trial parameters in diagnostic logs and clipboards ([1395470](https://github.com/fderuiter/Equipose/commit/13954702da6b12d8b7f0c18d5b5462c0e5e7edc8))
* implement Dynamic Worker Middleware for Asset Header Injection ([54bc2b1](https://github.com/fderuiter/Equipose/commit/54bc2b128adee273b91148bc078181f2730760ea))
* implement score-based cache selection in update notification service with unit tests ([d5ff25f](https://github.com/fderuiter/Equipose/commit/d5ff25fda7fe18faf2a52d45e183b7e048178fc2))
* implement session-based render lock and retain draft config ([7d18cf2](https://github.com/fderuiter/Equipose/commit/7d18cf262642f1905353b4e1d147a0659f2b7232))
* implement shared keyboard navigation utilities and integrate into focus-manager and keyboard-scroll directives ([b0e2ef0](https://github.com/fderuiter/Equipose/commit/b0e2ef0308ed199ac1400fc41d01d56edb72f573))
* implement synchronous SHA-256 seed hashing, unified validation, and form-level integration ([218582f](https://github.com/fderuiter/Equipose/commit/218582f35a2ce023512481c55effbd3b26589437))
* **study-builder:** save draft on destroy and protect against saving post-clearance ([be9df79](https://github.com/fderuiter/Equipose/commit/be9df79a8d2a644ae31f0160ba8ad9d110b7ea2f))

# [1.39.0](https://github.com/fderuiter/Equipose/compare/v1.38.0...v1.39.0) (2026-08-06)


### Features

* enforce safety check and package-pinned execution in preview cleanup workflow ([480e098](https://github.com/fderuiter/Equipose/commit/480e0986b438908d01ec92deae53371c8063a8da))
* **study-builder:** implement draft schema migration pipeline with fallback isolation, warning banner, and JSON export ([9b5d21b](https://github.com/fderuiter/Equipose/commit/9b5d21bbde728a1f4eb827c9d11ef81f7c0632ce))

# [1.38.0](https://github.com/fderuiter/Equipose/compare/v1.37.0...v1.38.0) (2026-08-05)


### Bug Fixes

* **ci:** fix E2E tab switching race condition and resolve Semgrep RegExp warning ([987ebc9](https://github.com/fderuiter/Equipose/commit/987ebc9cfd234a1edc7f9b48a297674ea43f61a7))
* **security:** replace invalid nosem comment with nosemgrep to fix Semgrep ReDoS warning ([0a7a067](https://github.com/fderuiter/Equipose/commit/0a7a0672d934498dfbe22391a98bf6871fc128a6))
* skip service worker registration in testing and development ([ee93e34](https://github.com/fderuiter/Equipose/commit/ee93e34080455365bd11a8004e2e0e57da40472b))


### Features

* implement MIME Guard with client update broadcast and prompt ([37ef7a0](https://github.com/fderuiter/Equipose/commit/37ef7a0438f68a662a5af1db115796170eb39949))
* **pwa:** whitelist /index.html in service worker dynamically at build-time ([0a404f5](https://github.com/fderuiter/Equipose/commit/0a404f55f2f2ec21d9472f3752da1deefdcd15e5))

# [1.37.0](https://github.com/fderuiter/Equipose/compare/v1.36.0...v1.37.0) (2026-08-04)


### Features

* add PRNG parity warnings to SAS/Stata UI and script templates ([#709](https://github.com/fderuiter/Equipose/issues/709)) ([f741448](https://github.com/fderuiter/Equipose/commit/f7414483fe0bae120f12b4691fa2acd261e638c7))

# [1.36.0](https://github.com/fderuiter/Equipose/compare/v1.35.0...v1.36.0) (2026-08-03)


### Bug Fixes

* **a11y:** resolve race condition in focus restoration and trap with custom elements and outside click ([7f36b48](https://github.com/fderuiter/Equipose/commit/7f36b4882c290207d0dd867208c1ca6dadb7764e))
* **e2e:** bypass programmatic window reload under webdriver during chunk failures ([3b8cf2f](https://github.com/fderuiter/Equipose/commit/3b8cf2f28920f7c88376e186ded1e4e37d514d23))
* **e2e:** call test.slow() unconditionally for all projects in a11y.spec.ts to prevent timeout flakiness ([ea7880b](https://github.com/fderuiter/Equipose/commit/ea7880be59cf2f9c803bf1b2fe2e9d3786bb9e77))
* **e2e:** prevent race condition between success and error toasts by clearing toasts first ([d5b9785](https://github.com/fderuiter/Equipose/commit/d5b978507de1d9c2b872509c59d4119d7db40c0a))
* **e2e:** prevent WebKit internal reload crash and enhance asynchronous worker error propagation ([8885b25](https://github.com/fderuiter/Equipose/commit/8885b2587907a8bdabc8e8fb3b5c17a6312cda91))
* **e2e:** programmatically clear active toasts before triggering contrast validation toast ([9228fe8](https://github.com/fderuiter/Equipose/commit/9228fe8bd155f61569c6ece5f758ceba8816e6d7))
* **e2e:** resolve missing error toast in production build tests by exposing toastService globally ([47e2480](https://github.com/fderuiter/Equipose/commit/47e2480995495a578dfbd0fe472335bb80f83889))
* **e2e:** resolve race condition in weird-chars scenario configuration ([a808e40](https://github.com/fderuiter/Equipose/commit/a808e409bd82bb44042adc6759f98dea2fe72533))
* **e2e:** robustly bypass global error handler reloads on local and test environments ([2a7ebe3](https://github.com/fderuiter/Equipose/commit/2a7ebe337844a7120bf6fa5f8fc52e958d439ba2))
* **e2e:** robustly bypass global error handler reloads on localhost ([70fe144](https://github.com/fderuiter/Equipose/commit/70fe1440004807f032f76571b394243a56cca6d1))
* **e2e:** robustly bypass service worker reloads and add IPv6 loopbacks in test environments ([5e6fe0b](https://github.com/fderuiter/Equipose/commit/5e6fe0bacdaafa6076cb36594517ab048a8b5a56))
* purge draft state from localStorage upon successful hydration to keep state clean ([c979534](https://github.com/fderuiter/Equipose/commit/c979534b186d5cd8cb630b47eb4784523dd605cb))
* resolve angular test compilation errors in pdf layout and results grid unit tests ([8e9dd22](https://github.com/fderuiter/Equipose/commit/8e9dd226887003aee5a1bbcd25bd7dd2016de02f))
* **study-builder:** add localhost loopback check to robustly bypass beforeunload draft saving ([9a26009](https://github.com/fderuiter/Equipose/commit/9a2600926f75e437f4c088575f85e3be72ab7591))
* **study-builder:** bypass beforeunload draft auto-saving when running under automated tests ([e07e2b5](https://github.com/fderuiter/Equipose/commit/e07e2b5de0672aa6aee2caba2a966b0c567fb098))
* **study-builder:** robustly bypass beforeunload draft saving on local E2E testbeds ([f7ad351](https://github.com/fderuiter/Equipose/commit/f7ad3513f02ca64d3ed78dff4f61d010a74c3957))


### Features

* **a11y:** custom focus manager overhaul & mobile theme menu support ([2b83930](https://github.com/fderuiter/Equipose/commit/2b8393003a09226055c26897e79f10f31970a0a3))
* implement interactive code generator redirect when Web Workers are blocked or unavailable during Monte Carlo simulation ([46261c4](https://github.com/fderuiter/Equipose/commit/46261c457880dcbba4ea8f41e1863826886212ff))
* implement mobile visual snapshots, accessibility audits, and Monte Carlo checks ([89c8c7f](https://github.com/fderuiter/Equipose/commit/89c8c7fc832a7b2379ae7f389b606af6caed8194))
* implement reactive local self-healing and fallback for web workers ([2d5f88e](https://github.com/fderuiter/Equipose/commit/2d5f88e102c79fe56e1b9c74a5ef4235d742ea24))
* implement reliable client-side export testing infrastructure ([#702](https://github.com/fderuiter/Equipose/issues/702)) ([4c9bd88](https://github.com/fderuiter/Equipose/commit/4c9bd88cbc5043a035d58922a297c8484833c19b))
* implement self-healing runtime recovery with synchronous draft saving and loop prevention ([454992e](https://github.com/fderuiter/Equipose/commit/454992e7b8d37aae4b52fc71ca1c50044fe285b6))
* implement sticky flow layout and query mocking for update banner ([b600392](https://github.com/fderuiter/Equipose/commit/b600392af9807a3cd277301fcb0f9c04bbf26231))
* isolate PDF layout engine into a dynamic lazy-loaded module with interactive loading indicator ([a20faf9](https://github.com/fderuiter/Equipose/commit/a20faf9b2a8707e0cb1076f25c38823a57ebaf62))


### Performance Improvements

* **e2e:** disable color-contrast check on mobile viewport to prevent test timeout flakiness ([99d8c32](https://github.com/fderuiter/Equipose/commit/99d8c3238133b81f24e2396ca2d55929a7d144ad))
* terminate and recreate web worker upon Monte Carlo cancellation to prevent CPU leak ([8896d2c](https://github.com/fderuiter/Equipose/commit/8896d2cb7de88b1631ffc726bb5f621a2b29234b))

# [1.35.0](https://github.com/fderuiter/Equipose/compare/v1.34.0...v1.35.0) (2026-07-23)


### Bug Fixes

* **accessibility:** align semantic heading hierarchy and sync SEO metadata ([#689](https://github.com/fderuiter/Equipose/issues/689)) ([417ba48](https://github.com/fderuiter/Equipose/commit/417ba48e8c4b84027e8de26a164a9db9c0d41616))
* address e2e test failures via routing and test wait improvements ([ffee9de](https://github.com/fderuiter/Equipose/commit/ffee9de867098ac194273657c8152ab164efa620))
* **build:** remove rxjs dependency and align angular package versions to fix ci ([c25df68](https://github.com/fderuiter/Equipose/commit/c25df68928c6a1a1805797590b7c8eef6994ce53))
* **ci:** explicitly type variables in main.ts to resolve implicit any errors ([e3eaabe](https://github.com/fderuiter/Equipose/commit/e3eaabebdaeb124dfed315df0cbbaae2891240fc))
* **ci:** increase timeout for code generation fixtures to accommodate sequential execution in WebKit ([527b544](https://github.com/fderuiter/Equipose/commit/527b544b7c0dd75b52ae332a7f61bacbb51d1e8b))
* **ci:** remove package-lock.json to force Cloudflare to use pnpm ([15b49d1](https://github.com/fderuiter/Equipose/commit/15b49d1f9744f3fb53dcb3ab4bcd3f73bf4a711c))
* **ci:** synchronize pnpm-lock.yaml with updated package.json dependencies ([07128d1](https://github.com/fderuiter/Equipose/commit/07128d1a20502bdf5b83864b77128e3af78bc2a2))
* **ci:** update sync-architecture script to use ARCHITECTURE_REFERENCE.md ([a907751](https://github.com/fderuiter/Equipose/commit/a907751378c2ce451210ec2115226de82c4d89c3))
* **ci:** wrap if expressions starting with ! in quotes ([0e0aca7](https://github.com/fderuiter/Equipose/commit/0e0aca7b489f13b543c66dff096a3e75b0c9811b))
* **deploy:** prevent scripts from generating root redirect to fix Cloudflare loop ([4dfc475](https://github.com/fderuiter/Equipose/commit/4dfc47547282870c949f40bb79d34a324643d248))
* **deploy:** remove invalid redirect rule causing infinite loop in Cloudflare Pages ([4a5c91c](https://github.com/fderuiter/Equipose/commit/4a5c91c566271e8cc2bbacdcd233cd8b6593a5c7))
* **deploy:** use native SPA routing for Cloudflare Workers Assets ([7ec1b94](https://github.com/fderuiter/Equipose/commit/7ec1b94e2b257bbc753c2587cdf4cb32c4db1b6a))
* **e2e:** correct locators targeting native input inside custom components ([56d4cdf](https://github.com/fderuiter/Equipose/commit/56d4cdf3e4cb00e4e81511e48bf9796e5251a5f9))
* **e2e:** Fix accessibility and rendering tests for component refactor ([8736d09](https://github.com/fderuiter/Equipose/commit/8736d09519c79f884ff469575660fc88009e4c95))
* **e2e:** Fix navigation fallback, wait for UI transitions in determinism and cap strategy tests, and fix custom component inputs and ARIA bindings ([8d3d720](https://github.com/fderuiter/Equipose/commit/8d3d720dcef12250addd748d7938ad240f01167e))
* **e2e:** fix timeouts and missing UI updates in end-to-end tests ([941fa64](https://github.com/fderuiter/Equipose/commit/941fa6435e2382be77bcb9add17c39c538117fd8))
* **e2e:** prevent axe-core infinite loop and bypass strict stability checks ([9829c77](https://github.com/fderuiter/Equipose/commit/9829c774a7f4a7bc10273c19fd1a2d98356cf431))
* **e2e:** resolve playwright timeouts and form submission issues ([c3980f3](https://github.com/fderuiter/Equipose/commit/c3980f34047a42acc9b0dde49db27108f7d2bb18))
* **e2e:** restore robust unmasked toast elements screenshots and stabilize high contrast JSON export button selector ([e0ac772](https://github.com/fderuiter/Equipose/commit/e0ac7721f196d8eb91c3d80d07c5e858f5b5d69c))
* **e2e:** update input locators to reflect component refactoring ([0310e66](https://github.com/fderuiter/Equipose/commit/0310e6664383ed20325d2f7947691083bb748a51))
* **e2e:** update locators broken by inputId refactor ([8c7f771](https://github.com/fderuiter/Equipose/commit/8c7f771b68bed42b532aba54b09f8e697473f910))
* **e2e:** update zero-trust test to use tab role for language selection ([959f7b5](https://github.com/fderuiter/Equipose/commit/959f7b5b72c3763ae348d5e81e6ceb7f5efbbcbe))
* exclude wrangler packages from pnpm minimum release age policy ([29ef8f8](https://github.com/fderuiter/Equipose/commit/29ef8f87744994e000d9c0beb4bbf7757bab0e5d))
* **forms:** unified reactive subscriptions and list hydration ([f244d41](https://github.com/fderuiter/Equipose/commit/f244d414f23127541f36082be5a93ddc7f2fb016))
* **r-generation:** replace mt19937_int with random_int in R code generation templates ([bb3f99b](https://github.com/fderuiter/Equipose/commit/bb3f99bbb21bd4bf865043b5590b905519fb4a9b))
* **sw:** handle cloudflare pages 307 redirect for root path ([811061c](https://github.com/fderuiter/Equipose/commit/811061c7243a2786cb0e997fbecc233a483739a7))
* **test:** resolve CI Rscript discovery in regression checks ([b22eeef](https://github.com/fderuiter/Equipose/commit/b22eeefb7ad345d1e71a5c1ba686b6b6ab8666be))
* **tests:** update baseline visual snapshots for mobile-chrome toast states ([5840eea](https://github.com/fderuiter/Equipose/commit/5840eea7e8b3bc3ee7f784ecbddb25be28b80965))
* **test:** use (onClick) custom output for app-button to ensure reliable event handling in headless WebKit ([d0db9cc](https://github.com/fderuiter/Equipose/commit/d0db9cceeedecfb41ce774a09e4390d1690819d5))
* **test:** use process.env['PYTHON'] or python instead of hardcoded python3 for python parity test ([88dc48a](https://github.com/fderuiter/Equipose/commit/88dc48ad029d4455782dd43849ab2a0e24ce3330))
* **theme:** update light-mode global border-strong token to meet WCAG AA contrast ([6abd969](https://github.com/fderuiter/Equipose/commit/6abd969c36f50fad491e7d93c16d3567ffdb6d0c))
* **ui:** use correct onBlur output for app-text-input in minimization config ([9b8ebe2](https://github.com/fderuiter/Equipose/commit/9b8ebe24f5a2eb879b4b9c1accad56fcc3e19727))
* **unit-test:** safely access dropdownContainer in onGenerateCode ([a084f2a](https://github.com/fderuiter/Equipose/commit/a084f2ac869cc9195687f7d2d44f9f99642b7faa))


### Features

* Automate markdown linting and partition architecture documentation ([7ba1b7c](https://github.com/fderuiter/Equipose/commit/7ba1b7cbc64894495d20c6b6520db8662d8b3b84))
* automate post-build CSP generation and drop unsafe-eval ([#639](https://github.com/fderuiter/Equipose/issues/639)) ([de5468d](https://github.com/fderuiter/Equipose/commit/de5468df0b2d00032eafb81878fd14b595068f37))
* centralise randomization schema generation and block ratio validation ([d90d5d2](https://github.com/fderuiter/Equipose/commit/d90d5d25335b055c94cea358730e99a4f44ee557))
* complete support for Pocock-Simon Minimization in Dynamic Code Generator and UX fallback ([0d7fb65](https://github.com/fderuiter/Equipose/commit/0d7fb657b8a8e390c5c6115a0c85c766d9858887))
* deprecation warning system and theme unification ([#663](https://github.com/fderuiter/Equipose/issues/663)) ([c7cae40](https://github.com/fderuiter/Equipose/commit/c7cae4065f87e6f608eb4a4679b9f30f5912bc3f))
* implement build-time markdown generation and sitemap generation ([#688](https://github.com/fderuiter/Equipose/issues/688)) ([4eb4a98](https://github.com/fderuiter/Equipose/commit/4eb4a98a7abf311f47f9a625e176039a7db37ed8))
* intercept global chunk load errors and prompt manual reload ([#685](https://github.com/fderuiter/Equipose/issues/685)) ([1729549](https://github.com/fderuiter/Equipose/commit/1729549343dec64d3250737ff7597bc0172a987a))
* **lint:** add standalone targeted duplication check ([9bafe76](https://github.com/fderuiter/Equipose/commit/9bafe763e50183dd937168df35aa947e5206e472))
* **study-builder:** align inline block sizes filters and suspend preview on validation errors ([c688b85](https://github.com/fderuiter/Equipose/commit/c688b8541e82ee80d8daa2b3918efcc35205b369))
* Support Dual-Mode RTSM Code Export for R, Python, SAS, and Stata ([c1a9483](https://github.com/fderuiter/Equipose/commit/c1a94831c74543e62c3bf4e15170ffd34011578e))
* Support Dual-Mode RTSM Code Export for R, Python, SAS, and Stata ([09920fa](https://github.com/fderuiter/Equipose/commit/09920fa3c62e61f163725617a915a7199c647d1f))
* Support Dual-Mode RTSM Code Export for R, Python, SAS, and Stata ([a12a189](https://github.com/fderuiter/Equipose/commit/a12a18969914b7ba9fef03b184fb429900f0f64b))
* Support Dual-Mode RTSM Code Export for R, Python, SAS, and Stata ([f4b7ce8](https://github.com/fderuiter/Equipose/commit/f4b7ce863c973efd3eba1cf8c77d70c814d67d8e))
* support Pocock-Simon minimization in dynamic code generator and implement immediate UI fallbacks ([599c78e](https://github.com/fderuiter/Equipose/commit/599c78effee6940681c7ae7722256737bf746e3f))
* support Pocock-Simon minimization in dynamic code generator and implement immediate UI fallbacks ([00fbd2a](https://github.com/fderuiter/Equipose/commit/00fbd2a9878ecef51d5148036bc0a17bbabe3b95))
* support Pocock-Simon minimization in dynamic code generator and implement immediate UI fallbacks ([8f5a6d7](https://github.com/fderuiter/Equipose/commit/8f5a6d7edac0ce4295712c0df5f58bcc985ce85b))
* **ui:** Standardise Core Select and Component Refactoring ([dc720cc](https://github.com/fderuiter/Equipose/commit/dc720ccb79a3c4915c098f023a85f855cf5a8f0d))
* use esbuild native JSON module resolution for compile-time version injection ([2de822f](https://github.com/fderuiter/Equipose/commit/2de822fff97033f1a032599e54608f72d7bfe8a9))
* **visual-regression:** add automated visual tests for Monte Carlo simulation modal across all standard interface themes ([fc0959e](https://github.com/fderuiter/Equipose/commit/fc0959e274d02041f6502da9379ef7a5f6769928))

# [1.32.0](https://github.com/fderuiter/Equipose/compare/v1.31.0...v1.32.0) (2026-05-08)


### Features

* Implement Regulatory Validation Framework (ICH E9 / 21 CFR Part 11) ([#233](https://github.com/fderuiter/Equipose/issues/233)) ([6b729ae](https://github.com/fderuiter/Equipose/commit/6b729ae11ffcbf989f219a5a48abd1c5c13bb992))

# [1.31.0](https://github.com/fderuiter/Equipose/compare/v1.30.1...v1.31.0) (2026-05-07)


### Bug Fixes

* apply config form review feedback on accessibility and caps flow ([d102666](https://github.com/fderuiter/Equipose/commit/d102666be2254100d9e476d4ac28681a17f9e9d2))
* block step-3 navigation when minimization probabilities are invalid ([7ab708a](https://github.com/fderuiter/Equipose/commit/7ab708ad50169cd66def52ccd0b9f97dd01dc6aa))
* finalize review feedback with deferred caps and accessibility updates ([31519b8](https://github.com/fderuiter/Equipose/commit/31519b84573d3907c134fd2973542f7b7950901e))
* restore Stata option in Generate Code and e2e coverage ([5535f6b](https://github.com/fderuiter/Equipose/commit/5535f6b08549461dc00b8693c80959b37be0ede5))
* stabilize validators and finalize CDK wizard flow ([ceeff92](https://github.com/fderuiter/Equipose/commit/ceeff924fc7016a4768b34702b87a7dae89ab13b))
* tighten caps-step handling and finalize review-thread follow-ups ([e041fe6](https://github.com/fderuiter/Equipose/commit/e041fe68a2b7d3b10b3d810767df8dea5f8935bb))


### Features

* refactor config form into branching CDK multi-step wizard ([fa83b5b](https://github.com/fderuiter/Equipose/commit/fa83b5bd8b54a795f7c6262bf40e6ebc18920ca2))

## [1.30.1](https://github.com/fderuiter/Equipose/compare/v1.30.0...v1.30.1) (2026-04-29)


### Bug Fixes

* update frontend license text to AGPL-3.0 ([cd9139d](https://github.com/fderuiter/Equipose/commit/cd9139d09732029732be49735fa908c8474f82fe))

# [1.30.0](https://github.com/fderuiter/Equipose/compare/v1.29.3...v1.30.0) (2026-04-27)


### Features

* **ux:** add native tooltips to icon-only buttons ([7b610a6](https://github.com/fderuiter/Equipose/commit/7b610a62a85a0da87d5294f6b892cf6c6ac40d78))

## [1.29.3](https://github.com/fderuiter/Equipose/compare/v1.29.2...v1.29.3) (2026-04-24)


### Bug Fixes

* alias loop index correctly in minimization distribution UI ([9a80492](https://github.com/fderuiter/Equipose/commit/9a804922f81d5fe967e487873c0c32fffbefcc14))

## [1.29.2](https://github.com/fderuiter/Equipose/compare/v1.29.1...v1.29.2) (2026-04-24)


### Bug Fixes

* **code-generator:** Implement native statistical scripts for Pocock-Simon minimization ([#186](https://github.com/fderuiter/Equipose/issues/186)) ([32464d7](https://github.com/fderuiter/Equipose/commit/32464d7520452662fa9cbf8c077bec750218b7e5))
* implement uniform site allocation and robust cap enforcement for minimization algorithm ([654d29f](https://github.com/fderuiter/Equipose/commit/654d29fd7709a906a6d97814f6f108ec93e74150))
* **minimization:** add missing countB reference in specs ([0e4ef21](https://github.com/fderuiter/Equipose/commit/0e4ef215a1e90bb3ccedbd71d77ed163a1ff45a4))
* **minimization:** correct imbalance score, tie-breaking, and probability normalization math ([ea77476](https://github.com/fderuiter/Equipose/commit/ea77476ac9c9989bfc26c32f7524c0f7633e3808))
* **template:** resolve template type safety violations and update minimization architecture ([#187](https://github.com/fderuiter/Equipose/issues/187)) ([c9c270e](https://github.com/fderuiter/Equipose/commit/c9c270e6d85a39f9c67c5a1c371cee0f4b61d4cb))

## [1.29.1](https://github.com/fderuiter/Equipose/compare/v1.29.0...v1.29.1) (2026-04-23)


### Performance Improvements

* optimize imbalance score calculation in minimization algorithm ([da00f16](https://github.com/fderuiter/Equipose/commit/da00f16ad16f3f01296f69936424cb434a63d24b))

# [1.29.0](https://github.com/fderuiter/Clinical-Randomization-Generator/compare/v1.28.0...v1.29.0) (2026-04-15)


### Bug Fixes

* address all PR review comments on attrition simulation ([a9791db](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/a9791db1dbcdb0fd5d47e0bc26d250cc721bd93d))
* rename safeRate to normalizedAttritionRate; fix no-attrition summary card layout ([a06a659](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/a06a6595346da4573755df7d55b3b46ad274c1f6))
* replace tooltip span with button to fix aria-prohibited-attr a11y violation ([ee0534c](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/ee0534ca45160bcc6225c5b098d47833855cfd84))
* spelling normalized (American English) in worker comment ([2c1f847](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/2c1f8472a4b4fb27f31d748a20548da8654dc314))


### Features

* add attrition/dropout simulation to Monte Carlo balance verification ([a4d9385](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/a4d9385d3fa8743a07060286acefb8db5ade0729))

# [1.28.0](https://github.com/fderuiter/Clinical-Randomization-Generator/compare/v1.27.0...v1.28.0) (2026-04-15)


### Bug Fixes

* apply review feedback - deterministic a11y waits, curl server readiness, shared generateCryptoSeed ([19faffb](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/19faffbd8a0e09d5695208a74f3323ee076768f1))
* correct dl/dt/dd structure on About page to resolve definition-list a11y violation ([f66dc26](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/f66dc26bf086efa6c23ab14e88ddf7cf42e9e24c))
* remove codeql.yml to resolve conflict with repo's default CodeQL setup ([81ce2fc](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/81ce2fcc2ef49935dfeed2646d84c6d0120205c6))
* upgrade emerald/amber text contrast and add aria-label to tag-input for WCAG AA ([cefe565](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/cefe565f337747399200d87dec1a5441138d0b43))
* upgrade low-contrast text colors to meet WCAG AA color-contrast requirements ([3656acb](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/3656acba7d0c94345ba4f6c8ade70935353690af))


### Features

* CI/CD pipeline evolution - sharding, CodeQL, budgets, and a11y ([ce18ca0](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/ce18ca034143cbcc076c5aa67818f1fcf2a78d5f))

# [1.27.0](https://github.com/fderuiter/Clinical-Randomization-Generator/compare/v1.26.0...v1.27.0) (2026-04-15)


### Bug Fixes

* address code review — dynamic JSON-LD version, bibtex uses citationYear ([1c7480e](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/1c7480e275ac19a83d39d3de7f41309885e5e300))
* update E2E navigation tests — replace brittle text assertions with data-testid selectors ([9d582ee](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/9d582ee1344ab74ed30f023693f7100d8ee200d6))


### Features

* comprehensive website enhancement — SEO, favicons, mobile nav, landing, about, footer, a11y ([3b37718](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/3b3771823eff4645fc2b858b88fff6e2838e6fd8))

# [1.26.0](https://github.com/fderuiter/Clinical-Randomization-Generator/compare/v1.25.0...v1.26.0) (2026-04-14)


### Bug Fixes

* address second round of STATA review comments ([766b526](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/766b5262969135e3bbd406c7f7ba98b8a5578b51))
* address STATA code generation review comments ([7c745f1](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/7c745f13e5490cfced9474852fd5dd13ca5dbc8b))
* update E2E test filenames from randomization_code.* to randomization_schema.* ([68decc2](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/68decc22a6164cfd5c59e078882005a7296c6afe))
* update excel export watermark to mention STATA as supported language ([c93e681](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/c93e681f38d635548978afd4768cc3d3335098d0))


### Features

* add STATA code generation support ([b61b05e](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/b61b05e0bd5c0d2cbc96ea2022a033ca9fde686e))

# [1.25.0](https://github.com/fderuiter/Clinical-Randomization-Generator/compare/v1.24.0...v1.25.0) (2026-04-14)


### Features

* add native Excel (.xlsx) export with two-sheet workbook and strict text typing ([1d283ca](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/1d283cabc6648da516df72e1b4942b5cea4f531f))

# [1.24.0](https://github.com/fderuiter/Clinical-Randomization-Generator/compare/v1.23.0...v1.24.0) (2026-04-14)


### Bug Fixes

* address code review issues - newline, label rename, probability clarity ([8127bee](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/8127bee844fcff8eccea7bf605b5d7673f4addc5))
* apply all PR review feedback for minimization algorithm ([80d61b9](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/80d61b9030d719790b247bd7ec63febf65ac6c93))
* apply second round of PR review feedback for minimization ([1a82a9d](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/1a82a9d831f0c828d5626b4dd1515e5d85c48845))
* correct indentation in minimization-algorithm.ts ([bbe83bf](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/bbe83bf92bae7aa1b91d6bc67b7f0a15d9fae5c4))


### Features

* implement Pocock-Simon minimization (covariate-adaptive randomization) ([6ff8ebf](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/6ff8ebfe75278bb275cb77ab1d3396baca823aab))

# [1.23.0](https://github.com/fderuiter/Clinical-Randomization-Generator/compare/v1.22.0...v1.23.0) (2026-04-10)


### Bug Fixes

* correct typo in buildStratificationNarrative method name ([6653de3](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/6653de3593076337b63c5fdb140001ba0c4cce3b))


### Features

* add MethodologySpecificationService and integrate into exports and code generators ([42a950c](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/42a950cc1b64c5e82545069f643c9a283f5b4681))

# [1.22.0](https://github.com/fderuiter/Clinical-Randomization-Generator/compare/v1.21.0...v1.22.0) (2026-04-10)


### Bug Fixes

* align all Angular packages to consistent patch versions to resolve npm ci ERESOLVE failure ([e6a2c11](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/e6a2c11408ca01f57bccd9692ef4088ce66a5e61))
* use takeUntilDestroyed for SW subscription cleanup and align service-worker package version ([d57cf2a](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/d57cf2a0ac2cc90a56d8f70c1502b4d6225123b9))


### Features

* implement PWA architecture with service worker, manifest, and update notification ([ee6be4c](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/ee6be4cd86c76108a290d08cefc85181ea5d6f19))

# [1.21.0](https://github.com/fderuiter/Clinical-Randomization-Generator/compare/v1.20.0...v1.21.0) (2026-04-10)


### Bug Fixes

* add angularTemplateInliner Vite plugin to vitest.config.ts to resolve templateUrl at test time ([29fb093](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/29fb093c86ff4c88dd0b1ff587e337a15ddd085c))
* add provideRouter([]) to schema-verification spec to fix ActivatedRoute DI error ([8c5a642](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/8c5a6424cf1ce916f01bf5a8d30a4a10e95741ab))
* address code review feedback on exportJson - blinding, memory leak, filename sanitization, spy cleanup ([1ce28f7](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/1ce28f742d68b2a9a460a472b1bb4f0b6e93c336))
* apply PR review feedback - toast alerts, blob cleanup, disabled JSON button, dynamic year, sitemap, vitest query string fix ([49174fb](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/49174fbf76dcb5149bcf8975abc50d79a604e943))
* correct JSON export test expectation to use _blinded suffix for default state ([bae2507](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/bae25079ce953e27cc09b4046915b79d3220bdb7))
* gate JSON export behind isUnblinded, update verification copy and tests ([7f6383a](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/7f6383a94481e0df8ae68a6d841516e02407094d))
* use download icon for JSON export button ([24c7d27](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/24c7d27888d150fc5696462b15eedd53f109839d))
* use exact text match in navigation e2e test to avoid strict mode multi-element failure ([c280b81](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/c280b814157efe58cb3512b6ac4481e17f697fb3))


### Features

* add JSON export for schema reproducibility verification ([3383740](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/3383740b4230a35c76caebb7f65e8807d69d604f))
* rebrand to Equipose and add comprehensive SEO enhancements ([ccec012](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/ccec01286fd2dc3f3d785f55849234af309d406c))

# [1.20.0](https://github.com/fderuiter/Clinical-Randomization-Generator/compare/v1.19.0...v1.20.0) (2026-04-10)


### Features

* implement hierarchical block strategy engine with UI and code gen support ([f3f278e](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/f3f278e0a196eaeccfe845865eba589a373afa66))

# [1.19.0](https://github.com/fderuiter/Clinical-Randomization-Generator/compare/v1.18.0...v1.19.0) (2026-04-10)


### Bug Fixes

* add missing capStrategy/globalCap/levelDetails to store spec, fix NG8107 optional chain in generator template ([6fee554](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/6fee554186b99db79f8cb0fa37d127c527a65212))
* address code review - use .get() consistently in Python pruning, add null safety for empty levels in SAS ([846941a](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/846941afd620856807e0d060b4cb5e5ac332b950))
* address code review - use Map for marginal caps (prevents prototype pollution), implement MANUAL_MATRIX switch on computed cap edit ([ac0f4c3](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/ac0f4c332b8f78f158d18da4516ba5f5ae3d9238))
* apply all review feedback - canComputeMatrix guard, matrixComputed on globalCap, undefined marginalCap, blockNumber tracking, non-termination guards, test data fix, optional FormValue fields ([1012dab](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/1012dab3ea0db04ff50d8bc6e0596ebac85e1d0a))
* apply second round of review feedback - stronger MARGINAL_ONLY guard, undefined marginalCap in form, min=0 for caps, BlockNumber in generated code ([4ebf58e](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/4ebf58eb5bd91309ea8d195eae89bceb3a15f815))
* clarify computeProportionalCaps JSDoc preconditions, fix Sites→Strata factors label, enforce integer>=0 in parseMarginalCapInput ([8d56fc8](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/8d56fc8366722d43ee5c0311ecbb6d7888d5bdfb))
* preserve undefined marginalCaps in syncLevelDetails, use Number.isFinite in termination guard, align Validators.min(0) with HTML min="0" ([60647a6](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/60647a64f6685a54c40954bb436bd62bb77ad642))
* review 4084891193 - ARIA radiogroup, label for/id, globalCap validators, validateMarginalOnly guard, NaN validation, name-based levelDetails lookup + ARCHITECTURE.md update ([ebcd4a4](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/ebcd4a4c99d57906ec2973aa3fcd463a34bddc93))
* use explicit SAS assignment for block_num increment; improve cap-strategy bounds comment ([2a6ae99](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/2a6ae99cc98c637a003de638340eb83e3993df82))
* use Math.floor for integer seat distribution and add comment explaining matrixComputed guard ([6d58848](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/6d588484403b7a8dea897664a5c3850ab1e38ab4))


### Features

* add PROPORTIONAL and MARGINAL_ONLY support to R, Python, and SAS code generators ([903dae7](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/903dae7d3770bab0b525b5db8b22a80c9a7b0a7a))
* implement Advanced Stratum Cap Logic (Proportional/Dynamic) ([b2790ca](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/b2790ca23f412d02e7568946be2a9f08070febc2))

# [1.18.0](https://github.com/fderuiter/Clinical-Randomization-Generator/compare/v1.17.0...v1.18.0) (2026-04-09)


### Bug Fixes

* update generator spec selectors to avoid false match on BlockPreview legend ([7fa5fd5](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/7fa5fd57b885572eb5b6d870e046b01d79a0e9c6))


### Features

* implement BlockPreviewComponent for visual block allocation preview ([192c93f](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/192c93f7d28ecaf392cd90ca0a68127275bd60be))

# [1.17.0](https://github.com/fderuiter/Clinical-Randomization-Generator/compare/v1.16.0...v1.17.0) (2026-04-09)


### Bug Fixes

* restore missing copyAuditHash JSDoc comment removed during refactor ([9d3293e](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/9d3293eb8f42c93de8041a6e053ca37618589e58))


### Features

* implement high-performance virtual scroll grid with multi-column filtering and sorting ([bcd5df9](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/bcd5df9a9e9c5def8f55d627b56431d1ab086181)), closes [hi#performance](https://github.com/hi/issues/performance)

# [1.16.0](https://github.com/fderuiter/Clinical-Randomization-Generator/compare/v1.15.0...v1.16.0) (2026-04-09)


### Features

* add SchemaVerificationComponent for reproducibility QA ([a1cce52](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/a1cce52854656c0bc4cdd992b5b8ec3687f02ddd))

# [1.15.0](https://github.com/fderuiter/Clinical-Randomization-Generator/compare/v1.14.0...v1.15.0) (2026-04-09)


### Bug Fixes

* address code review feedback on crypto hash and clipboard handling ([ed75e6b](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/ed75e6ba6d8d78a8f5cae63d4ef9fa0cfbd4e71a))
* replace vi.mock relative import with crypto.subtle spy; guard exportPdf spy in test ([a1624d5](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/a1624d59d2cc7257b1af9c4be6d92949c090b3b1))


### Features

* add cryptographic audit hash and certificate of generation ([7675222](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/7675222f541bfa5cf2c45aab74d8375930f30405))

# [1.14.0](https://github.com/fderuiter/Clinical-Randomization-Generator/compare/v1.13.0...v1.14.0) (2026-04-09)


### Bug Fixes

* align Advanced Settings accordion with mobile/responsive patterns ([059739d](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/059739da8dbd9575a761398fddd3cd451cece9d9)), closes [#97](https://github.com/fderuiter/Clinical-Randomization-Generator/issues/97)
* **e2e:** expand Advanced Settings accordion before filling seed in code-generator test ([56dd010](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/56dd010de77c12109aeae5213196ec0654f73429)), closes [#seed](https://github.com/fderuiter/Clinical-Randomization-Generator/issues/seed)


### Features

* progressive disclosure accordion with CDK tooltips for advanced settings ([25b0297](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/25b0297a306b73ad6093c2b4480bf473167a3892)), closes [hi#contrast](https://github.com/hi/issues/contrast)

# [1.13.0](https://github.com/fderuiter/Clinical-Randomization-Generator/compare/v1.12.0...v1.13.0) (2026-04-09)


### Bug Fixes

* add group class and hover styles to grouped-view sticky column ([add648e](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/add648e7d6452618d96207703580e608f07c7fa0))
* address code review issues - add group class, fix touch targets, use focus-visible ([61b07b0](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/61b07b0911a15be8e338b61eeec9d43c29969a6f))


### Features

* implement responsive architecture with CDK viewport service and mobile adaptations ([2e3faef](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/2e3faefc6a695458a5fb80d00221fc12b306ae66))

# [1.12.0](https://github.com/fderuiter/Clinical-Randomization-Generator/compare/v1.11.0...v1.12.0) (2026-04-09)


### Features

* add Balance Verification tab with statistical aggregation engine ([f6b9fbe](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/f6b9fbe38a9f9e1d2ec16aebcb9e54d10dcba566))

# [1.11.0](https://github.com/fderuiter/Clinical-Randomization-Generator/compare/v1.10.0...v1.11.0) (2026-04-09)


### Bug Fixes

* address code review findings - remove unused import, guard null row in action methods ([1ba86bc](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/1ba86bca4545e920bcf50c3ca0596fde2fce70fb))
* **e2e:** add stable data-testid attributes and update E2E selectors for arm cell ([b342829](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/b3428299569bb18bec662c6be8f9e4676cf5a27e))


### Features

* add Toast system, kebab menu, and remove static error banner ([a5e6cab](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/a5e6cab50ed3cce96e5b487c40fbddcc9b382c89))

# [1.10.0](https://github.com/fderuiter/Clinical-Randomization-Generator/compare/v1.9.0...v1.10.0) (2026-04-09)


### Bug Fixes

* correct hasRnd expression and remove dead else-if branch in subject-id-engine ([f4b2bbb](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/f4b2bbb2848ee07618ed0e8c852f8a0d0b8b2f88))
* **e2e:** harden Complex preset Monte Carlo test against CI timeout ([5dca61c](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/5dca61c92a1e87ce9bfe2040bce4a6dd526e1b70))


### Features

* implement Subject ID generation enhancements with new token engine ([8367969](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/8367969aa94915cd8eaf99c37bb7852025a016b3))

# [1.9.0](https://github.com/fderuiter/Clinical-Randomization-Generator/compare/v1.8.0...v1.9.0) (2026-04-09)


### Features

* typographic system redesign for data-dense environments ([871f6f7](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/871f6f7c21381788980256472b00ced602b63d2f))

# [1.8.0](https://github.com/fderuiter/Clinical-Randomization-Generator/compare/v1.7.0...v1.8.0) (2026-04-09)


### Features

* add Group by Block view mode to ResultsGridComponent ([9ab0388](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/9ab038885a9c97f650cae144b37256cc483518b3))

# [1.7.0](https://github.com/fderuiter/Clinical-Randomization-Generator/compare/v1.6.0...v1.7.0) (2026-04-08)


### Bug Fixes

* add stable data-testid attributes to Monte Carlo modal and fix strict-mode locator collisions in Playwright tests ([07e1fea](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/07e1feade74d0ab3719dda942febe4743a37d1a7))
* resolve merge conflict with main (v1.6.0 Schema Analytics Dashboard) and remove stray conflict marker ([285cb18](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/285cb18afe88a2235d0ee0fcfebe3a5a1d1e8bcb))


### Features

* add Monte Carlo statistical validation feature ([0cd9e96](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/0cd9e9605b37154798f310d97b5b2b275b5f1a71))
* Monte Carlo Statistical Validation Report Generator ([b05ccc8](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/b05ccc80abfb501717e0979449fbd25ece3ce847))

# [1.6.0](https://github.com/fderuiter/Clinical-Randomization-Generator/compare/v1.5.1...v1.6.0) (2026-04-08)


### Bug Fixes

* use US English spelling in comments (Centralized, Initialize) ([f40037b](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/f40037bc7bd44c1a7a4807904b0af195eaac3811))


### Features

* add Schema Analytics Dashboard with Apache ECharts and cross-filtering ([f1b8a29](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/f1b8a29ffc4643d0aa313f6230b54e3f15fcec89))

## [1.5.1](https://github.com/fderuiter/Clinical-Randomization-Generator/compare/v1.5.0...v1.5.1) (2026-04-08)


### Bug Fixes

* address code review - remove unused param, add named constant for auto-seed range ([ea187a9](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/ea187a96a2bac974fe65c51dab476b236bbdd680))
* allow empty seed in code generator; auto-generate seed when not provided ([4970f8d](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/4970f8dfa154fcb76139cad79afb3a4a18c87256))

# [1.5.0](https://github.com/fderuiter/Clinical-Randomization-Generator/compare/v1.4.0...v1.5.0) (2026-04-08)


### Bug Fixes

* **e2e:** add data-testid to generated code pre element and update E2E selectors with timeouts ([bc6638e](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/bc6638e7dd9b1913c252610ff67ab1b54b964433))
* **e2e:** fill seed field before opening code generator modal to avoid MissingSeedError ([09d2162](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/09d216253aa13e084b070c94feaf9db8ebaa9c76))


### Features

* implement granular error hierarchy and structured error UI for code generation ([ed83edd](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/ed83eddb66079ac3c5a5f54138dd5c3077424128))

# [1.4.0](https://github.com/fderuiter/Clinical-Randomization-Generator/compare/v1.3.0...v1.4.0) (2026-04-08)


### Bug Fixes

* remove redundant tabular-nums class where font-mono is applied ([0a82353](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/0a82353aebc120c657d88690ae3aa8ad58aa6057))


### Features

* implement design system, dark mode, and ThemeService ([0864900](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/086490037f5abbbf5dd9d619faba6670102cb9e3))

# [1.3.0](https://github.com/fderuiter/Clinical-Randomization-Generator/compare/v1.2.0...v1.3.0) (2026-04-08)


### Bug Fixes

* **e2e:** fix flaky tests - direct navigation and explicit waits ([0c60603](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/0c60603942b49242216531a084e8c5de03187ecb))
* **e2e:** scope stratum levels locator to app-tag-input input to avoid non-fillable host match ([8264e99](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/8264e999891bf03db0b47887451573deff2766ad))
* **e2e:** update selectors and interactions for new visual builder UI ([e75583c](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/e75583cfb41518a130eb41457a08307810f2493f))


### Features

* interactive visual builder UI with tag inputs, arm cards, and drag-and-drop strata ([2f97dd6](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/2f97dd6c5b04a96b553a7e16443a26332fe4ca3a))

# [1.2.0](https://github.com/fderuiter/Clinical-Randomization-Generator/compare/v1.1.0...v1.2.0) (2026-04-08)


### Features

* Architectural refactor - DDD structure, Facade, SignalStore, Web Worker, ESLint boundaries ([00387a0](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/00387a0edbc168f1817d84559d76adbde530dac7))
* phases 5-7 - parity tests, legacy decommission, build verification ([7c76626](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/7c7662622754707206547af6b1fc5a478e202093)), closes [hi#volume](https://github.com/hi/issues/volume)

# [1.1.0](https://github.com/fderuiter/Clinical-Randomization-Generator/compare/v1.0.0...v1.1.0) (2026-04-02)


### Features

* add draft schema watermark to csv and pdf exports ([#17](https://github.com/fderuiter/Clinical-Randomization-Generator/issues/17)) ([fde3439](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/fde34393610477a74999a70ba1db30f888c64b80))

# 1.0.0 (2026-04-02)


### Bug Fixes

* github pages blank screen and remove old name ([4784a99](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/4784a99c8fd658bb7e6b75bfa68f6d1007ebee55))
* resolve dependency conflict in package.json ([e3e69c0](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/e3e69c08c21fb102c05427843b303462b5377e4f))
* revert playwright test port to 4200 for CI compatibility ([b01432e](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/b01432ee5ab65958182c30ca91b1f0617b9a1dcf))
* Upgrade Python Code Generator ([#6](https://github.com/fderuiter/Clinical-Randomization-Generator/issues/6)) ([e19e3a6](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/e19e3a67e0e7b873b2f0bb2a3a93b98361a9fe2a))


### Features

* add audit trails and semantic-release versioning ([96a1066](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/96a10663263b717d89c7884429cebfd73d5375b2))
* Configure AI Studio app for local development ([68be745](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/68be745706b88c25b67d890ba19d7fc71f278aff))
* Set up application routing and landing page ([90b9638](https://github.com/fderuiter/Clinical-Randomization-Generator/commit/90b963824fcee714c7eaddd7585805585dd66b0a))
