# Institutional Review Board (IRB) Compliance & Privacy Safeguards

This document provides trial managers, principal investigators, and clinical trial compliance officers with an ethics-board friendly, plain-language description of the privacy, security, and blinding controls built into Equipose. It translates technical specifications into the standardized justifications required for Institutional Review Board (IRB) and Research Ethics Board (REB) approvals.

---

## 1. Executive Summary for Ethics Boards

Equipose is a client-side clinical trial randomization and schema configuration system designed to support zero-trust data privacy. Unlike traditional web applications that transmit sensitive trial specifications and participant configurations to external servers, **Equipose operates entirely within the local web browser sandbox**.

### The Core Ethics Safeguards
* **Absolute Data Privacy (Zero-Trust):** No trial configuration, stratification schema, or subject-level allocation record is ever transmitted over the network or stored on third-party servers. All computation happens locally in the user's browser.
* **Rigorous Blinding Preservation:** Active study designs enforce strict blinding filters. Participant treatment allocations are programmatically redacted in both the UI displays and document exports to ensure study staff remain blinded to active configurations.
* **Role-Based Persona Controls:** The system maps user profiles (Biostatistician, Trial Manager, Compliance Officer) to strict programmatic privileges, ensuring that only authorized, unblinded personas can access or export raw configurations.

---

## 2. Zero-Trust Network Isolation Safeguards

### Ethics Board Terminology
* **Data Exfiltration:** The unauthorized transfer of sensitive information from inside a study team's environment to an external third party.
* **Browser Sandbox:** A security mechanism for separating running programs, preventing malicious or unauthorized scripts from accessing external resources.

### Plain-Language Explanation
Traditional web applications present a persistent risk of data leakage because every keypress, configuration change, and subject assignment is synced to a remote backend database. In contrast, Equipose enforces a **zero-trust network isolation model**.

When the application loads, it acts as a fully self-contained machine. Every mathematical calculation, subject ID generation, and block-balancing algorithm is executed inside a local Web Worker thread (a separate background process in the browser) and UI thread.

### Verification and Enforcement
To prove to ethics boards that this network isolation is active and cannot be bypassed, the build pipeline runs automated end-to-end security audits. These audit tests intercept all network traffic during typical workflows and assert that:
1. **Zero external requests** are allowed. Any attempt by the application to send data to an analytics ping, third-party tracker, CDN, or cloud database is automatically intercepted and blocked.
2. **WebSocket and Web Worker sandboxing** are enforced, blocking background connections and preventing side-channel data exfiltration.

This programmatic guarantee ensures that study designs remain 100% confidential and localized, mitigating the risk of data breaches.

---

## 3. Client-Side Data Blinding Safeguards

### Ethics Board Terminology
* **Unintentional Unblinding (Blinding Break):** A scenario where study coordinators, monitors, or trial managers accidentally view randomized treatment allocations before study lock, introducing bias.
* **Structural Redaction:** The automated masking of sensitive data fields to ensure they cannot be displayed or extracted.

### Plain-Language Explanation
Maintaining the integrity of double-blind and single-blind trials requires robust guardrails against accidental exposure. Equipose integrates programmatic client-side data blinding.

Under default active trial contexts, treatment allocations (e.g., Active Drug vs. Placebo) are structurally replaced in the user interface and all output reports (PDF, Excel, CSV) with a secure, generalized placeholder: `*** BLINDED ***`.

Crucially, this blinding occurs at the service level before any text is rendered to the screen or compiled into an export file. The raw randomization schedule is never cached in insecure local browser storages or exposed in developer console logs.

### Verification and Enforcement
To ensure blinding logic remains unbroken:
1. Automated tests verify that when a blinded role is active, all tables, export modules, and downloaded files contain the redacted `*** BLINDED ***` markers instead of the raw treatment designations.
2. In-app validation scripts block any attempts to manually toggle unblinding controls unless the current session matches an authorized unblinded persona under audited conditions.

---

## 4. Persona Access Controls & Authorization Matrix

Equipose uses a programmatic authority mapping model to match strategic user profiles to data visibility rules:

| User Persona | Ethical Responsibility | System Authorization Rule | Blinding Status |
| :--- | :--- | :--- | :--- |
| **Biostatistician** | Verifies statistical reproducibility, block balance, and allocation determinism from a seed. | Authorized to bypass blinding filters to run raw statistical checks. | **Unblinded** |
| **Trial Manager** | Configures stratification criteria and protocol parameters without introducing bias. | Strictly blinded. Structural exports are disabled in Draft/Simulation modes to prevent pre-launch leaks. | **Blinded (Default)** |
| **Compliance Officer** | Audits regulatory alignment (21 CFR Part 11, ICH GCP) and automated traceability maps. | System verification access. Ensures build-time traceability is 100% covered by active tests. | **N/A (Auditor)** |

### Failsafe Design Rules
* **Draft Export Restrictions:** To prevent unverified or draft schedules from leaking into clinical execution, the system programmatically disables all export buttons (PDF, CSV, XLSX) whenever the active project is designated as a `Draft` or `Simulation`.
* **Traceability-Integrated RTM:** Every persona rule and security control is programmatically mapped to automated verification tests. The build pipeline is configured to fail instantly if any IRB or security requirement lacks active test coverage.
