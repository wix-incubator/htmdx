# Changelog

## [4.11.0](https://github.com/wix-incubator/htmdx/compare/v4.10.1...v4.11.0) (2026-07-28)


### Features

* **markdown:** add emphasis, blockquotes, breaks, autolinks and escapes ([#84](https://github.com/wix-incubator/htmdx/issues/84)) ([622b546](https://github.com/wix-incubator/htmdx/commit/622b546baec4e77d6ab9327e671eb7a36dc9fa86))
* **markdown:** render heading levels four through six ([#82](https://github.com/wix-incubator/htmdx/issues/82)) ([4c3d438](https://github.com/wix-incubator/htmdx/commit/4c3d438e0a59bc4ce89b358a1ce01640a217ceab))

## [4.10.1](https://github.com/wix-incubator/htmdx/compare/v4.10.0...v4.10.1) (2026-07-27)


### Bug Fixes

* **react:** render ordered lists and stop dropping nested list lines ([#78](https://github.com/wix-incubator/htmdx/issues/78)) ([e88917b](https://github.com/wix-incubator/htmdx/commit/e88917ba6c196c4f4f898f344080ffd7e36e6675))
* **runtime:** give inline code an accent chip instead of gray-on-gray ([#80](https://github.com/wix-incubator/htmdx/issues/80)) ([c078394](https://github.com/wix-incubator/htmdx/commit/c078394643f84622836c3f18fee13ce6b544f212))

## [4.10.0](https://github.com/wix-incubator/htmdx/compare/v4.9.0...v4.10.0) (2026-07-26)


### Features

* **runtime:** render around a failing block and copy a full-scan fix request ([#76](https://github.com/wix-incubator/htmdx/issues/76)) ([19fd560](https://github.com/wix-incubator/htmdx/commit/19fd56071fe4cc3ce28ebf760571428fe3ae9aed))


### Bug Fixes

* make invalid component-body errors actionable ([#72](https://github.com/wix-incubator/htmdx/issues/72)) ([9b40f94](https://github.com/wix-incubator/htmdx/commit/9b40f9429f858274725778512620f07a1e02f254)), closes [#51](https://github.com/wix-incubator/htmdx/issues/51)

## [4.9.0](https://github.com/wix-incubator/htmdx/compare/v4.8.0...v4.9.0) (2026-07-26)


### Features

* **cli:** ship the agent guidance from the runtime and print it with htmdx skill ([#69](https://github.com/wix-incubator/htmdx/issues/69)) ([373f71d](https://github.com/wix-incubator/htmdx/commit/373f71dc637ca100d357be098814ee453f30af8f))
* **react:** highlight code blocks and give raw pre the same chrome ([#73](https://github.com/wix-incubator/htmdx/issues/73)) ([d76dfa0](https://github.com/wix-incubator/htmdx/commit/d76dfa0a1d797178f168cf64695238b1e5c8f14a))
* **react:** render mermaid diagrams from fenced code blocks ([#71](https://github.com/wix-incubator/htmdx/issues/71)) ([5dcc43d](https://github.com/wix-incubator/htmdx/commit/5dcc43d88d562519c44233e5b287f6eb2a6ab488))


### Bug Fixes

* **build:** pin the browser bundle to the production JSX transform ([#68](https://github.com/wix-incubator/htmdx/issues/68)) ([6cf1747](https://github.com/wix-incubator/htmdx/commit/6cf1747accac418d75e619e9961c14b9dc3eb5b9))

## [4.8.0](https://github.com/wix-incubator/htmdx/compare/v4.7.0...v4.8.0) (2026-07-26)


### Features

* **react:** allow declarative SVG motion ([#65](https://github.com/wix-incubator/htmdx/issues/65)) ([8a77b21](https://github.com/wix-incubator/htmdx/commit/8a77b21f234f9f6533bed3c699a4faf7cd8f0ab9))
* **react:** render inline SVG from its own allowlist ([#62](https://github.com/wix-incubator/htmdx/issues/62)) ([e3e48b5](https://github.com/wix-incubator/htmdx/commit/e3e48b527f32ee8effdd800198dc52d1ac2f8f6a))

## [4.7.0](https://github.com/wix-incubator/htmdx/compare/v4.6.0...v4.7.0) (2026-07-26)


### Features

* **cli:** add compile and components commands, and a validate alias ([#64](https://github.com/wix-incubator/htmdx/issues/64)) ([d363c65](https://github.com/wix-incubator/htmdx/commit/d363c65902fab2d3e5cb8700cbaaeaf0f4e922a8))
* **layout:** accept creator-kit as an alias for the default layout ([#61](https://github.com/wix-incubator/htmdx/issues/61)) ([f46e5d4](https://github.com/wix-incubator/htmdx/commit/f46e5d4a9c58c91003526836dcc49d6b8d8a0f26))

## [4.6.0](https://github.com/wix-incubator/htmdx/compare/v4.5.1...v4.6.0) (2026-07-26)


### Features

* add validate(), the testing subpath, and an htmdx lint CLI ([#55](https://github.com/wix-incubator/htmdx/issues/55)) ([077e452](https://github.com/wix-incubator/htmdx/commit/077e452a97bad355e69e2df5259ddf69fe686429))
* **layouts:** add document layout selection ([#49](https://github.com/wix-incubator/htmdx/issues/49)) ([b91d9ee](https://github.com/wix-incubator/htmdx/commit/b91d9eea5d46ff1a9eb01ea2b669f7c5e3e83434))
* **react:** render allowlisted raw HTML alongside Markdown ([#56](https://github.com/wix-incubator/htmdx/issues/56)) ([3479281](https://github.com/wix-incubator/htmdx/commit/347928161b4b38ff6d647da270a97c6d35f3060a))


### Bug Fixes

* keep code spans literal inside component bodies ([#53](https://github.com/wix-incubator/htmdx/issues/53)) ([ab67396](https://github.com/wix-incubator/htmdx/commit/ab67396799edbd80cfef75b5601d899219498223))

## [4.5.1](https://github.com/wix-incubator/htmdx/compare/v4.5.0...v4.5.1) (2026-07-21)


### Bug Fixes

* add automatic card content spacing ([#46](https://github.com/wix-incubator/htmdx/issues/46)) ([84aca2c](https://github.com/wix-incubator/htmdx/commit/84aca2cfecddb52c4582bd5c75c5350395fce016))

## [4.5.0](https://github.com/wix-incubator/htmdx/compare/v4.4.0...v4.5.0) (2026-07-21)


### Features

* render safe Markdown and HTML images ([#42](https://github.com/wix-incubator/htmdx/issues/42)) ([3abf2d0](https://github.com/wix-incubator/htmdx/commit/3abf2d0007bd6312d5faa3c94345ce80cf301e64))

## [4.4.0](https://github.com/wix-incubator/htmdx/compare/v4.3.0...v4.4.0) (2026-07-21)


### Features

* **components:** add Foldout built-in and BulletList/Stat UI finalizations ([#43](https://github.com/wix-incubator/htmdx/issues/43)) ([11236d9](https://github.com/wix-incubator/htmdx/commit/11236d9d3891df2470717d9f62bcf784b0790084))

## [4.3.0](https://github.com/wix-incubator/htmdx/compare/v4.2.0...v4.3.0) (2026-07-20)


### Features

* add runtime error fix requests ([#40](https://github.com/wix-incubator/htmdx/issues/40)) ([f4acb01](https://github.com/wix-incubator/htmdx/commit/f4acb0123b5cc3505df427fb8efc8f8c4049cfd8))

## [4.2.0](https://github.com/wix-incubator/htmdx/compare/v4.1.0...v4.2.0) (2026-07-20)


### Features

* **components:** stretch/card Stat items; add BulletList built-in ([#37](https://github.com/wix-incubator/htmdx/issues/37)) ([781701a](https://github.com/wix-incubator/htmdx/commit/781701acc63f0250c7b35319c42e3dcadccb861a))

## [4.1.0](https://github.com/wix-incubator/htmdx/compare/v4.0.1...v4.1.0) (2026-07-19)


### Features

* **components:** hero swap, Sources label/size, IntentList badge colors ([#36](https://github.com/wix-incubator/htmdx/issues/36)) ([e41cf20](https://github.com/wix-incubator/htmdx/commit/e41cf202ae26360189fa3fc48f03d87ce7cb379c))
* enlarge in-section titles +15% and theme-align Sources chip ([#34](https://github.com/wix-incubator/htmdx/issues/34)) ([de63a77](https://github.com/wix-incubator/htmdx/commit/de63a77b8baba3b564142a22f2850ef8614ca52d))
