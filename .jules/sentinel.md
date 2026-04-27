## 2024-05-14 - Replace Math.random() with Web Crypto API
**Vulnerability:** Weak random number generation using `Math.random()` for security purposes, such as unique IDs in the toast service.
**Learning:** `Math.random()` is not cryptographically secure and predictable. It can lead to static analysis vulnerabilities and potential predictability in identifier generation.
**Prevention:** Always use cryptographically secure random number generation via the Web Crypto API, specifically `globalThis.crypto.randomUUID()` for unique IDs or `globalThis.crypto.getRandomValues()` for seeds/data, avoiding `Math.random()` entirely to ensure unpredictability and cross-environment compatibility.
