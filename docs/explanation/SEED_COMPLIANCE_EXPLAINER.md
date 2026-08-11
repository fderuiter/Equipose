# Seed Compression & Regulatory Compliance Explainer

## 1. Context & Business Value

In regulated clinical trials (governed by FDA 21 CFR Part 11 and ICH E9 guidelines), ensuring the absolute traceability and reproducibility of randomization sequences is paramount. Clinical auditors, biostatisticians, and external trial sponsors must be able to verify that the random number generation process is mathematically sound, reproducible across divergent software environments (such as SAS, R, and Stata), and completely immune to overflows or numeric drift.

Historically, documentation gaps and incorrect descriptions of seeding algorithms (such as outdated references to `djb2`-style hashing functions) have introduced audit friction and integration delays. To accelerate regulatory reviews, eliminate self-service integration friction, and establish a single source of truth, this document details the mathematical underpinnings of Equipose's seed compression, cross-platform emulation, and automated regression verification.

---

## 2. The Two-Stage Seeding Algorithm

Equipose uses a rigorous two-stage seeding algorithm to translate arbitrary-length user-provided seed strings (or random string seeds) safely into a bounded, 31-bit non-negative integer seed. This seed is guaranteed to fit within the native ranges of all standard statistical analysis platforms (R, SAS, Python, and Stata) without causing overflow, negative-value interpretation errors, or floating-point precision loss.

The implementation consists of **Stage 1: Cryptographic SHA-256 Hashing** followed by **Stage 2: 31-bit FNV-1a Bitwise Compression**.

```
                           +---------------------------+
                           |     Input Seed String     |
                           +-------------+-------------+
                                         |
                                         v
                     /-----------------------------------\
                    /  Is it exactly 32 hex characters?   \
                    \            (0-9, a-f)               /
                     \-------------------+---------------/
                                         |
                               +---------+---------+
                            No |               Yes |
                               v                   v
                     +-------------------+   +-------------+
                     |  Compute SHA-256  |   |  Coerce to  |
                     |  Cryptographic    |   |  Lowercase  |
                     |  Hash of String   |   +------+------+
                     +---------+---------+          |
                               |                    |
                               v                    |
                     +-------------------+          |
                     | Take first 32 hex |          |
                     | chars (128 bits)  |          |
                     +---------+---------+          |
                               |                    |
                               +---------+----------+
                                         |
                                         v
                           +---------------------------+
                           |  128-bit Hex String (32)  |
                           +-------------+-------------+
                                         |
                                         v
                           +---------------------------+
                           |   FNV-1a 32-bit Hash      |
                           |   Offset: 2166136261      |
                           +-------------+-------------+
                                         |
                                         v
                           +---------------------------+
                           | Loop each hex char code:  |
                           |   1. hash ^= charCode     |
                           |   2. Shift-add multiply   |
                           |   3. Coerce 32-bit signed |
                           +-------------+-------------+
                                         |
                                         v
                           +---------------------------+
                           |  Unsigned shift (>>> 0)   |
                           |  & modulo (mod 2^31 - 1)  |
                           +-------------+-------------+
                                         |
                                         v
                           +---------------------------+
                           | 31-bit Integer:           |
                           | [0, 2147483646]           |
                           +---------------------------+
```

### Stage 1: Cryptographic SHA-256 Hashing (`get128BitHash`)
1. The input seed string (which can be of arbitrary length) is evaluated.
2. **Pre-hash Bypass:** If the string is already a valid 32-character hexadecimal string matching `/^[0-9a-f]{32}$/i`, it represents a 128-bit integer in hexadecimal notation. In this case, the string is directly coerced to lowercase and used, bypassing SHA-256 hashing.
3. **Hashing Process:** If the input is not a 32-character hex string, it is hashed using a standard SHA-256 cryptographic hashing algorithm (`syncSha256(seed)`).
4. **Length Truncation:** The first 32 characters of the resulting SHA-256 hex representation are extracted, representing exactly **128 bits** of high-entropy cryptographic material.

### Stage 2: 31-Bit FNV-1a Bitwise Compression (`get31BitSeed`)
To convert the 128-bit hex string into a safe, non-negative 31-bit integer, we use a customized 32-bit Fowler-Noll-Vo (FNV-1a) bitwise hashing algorithm. FNV-1a is chosen for its excellent dispersion, low collision rate, and computational efficiency in bitwise math.

The algorithm runs as follows:
1. **Initialize Hash:** The hash is initialized with the standard FNV 32-bit offset basis:
   $$\text{Offset Basis} = 2166136261$$
2. **Iterate Characters:** For each character $c_i$ in the 32-character hex string ($i = 0$ to $31$):
   * **XOR Step:** XOR the current 32-bit hash value with the ASCII character code of the current hexadecimal digit:
     $$\text{hash} = \text{hash} \oplus \text{codePoint}(c_i)$$
   * **Shift-Add Multiplication Step:** Instead of multiplying directly by the 32-bit FNV-1a prime ($16777619$), which would cause floating-point precision loss in JavaScript's standard IEEE 754 double-precision floats, we use a precise bit-shift and addition sequence. Since $16777619 = 1 + 2^1 + 2^4 + 2^7 + 2^8 + 2^{24}$, we perform:
     $$\text{hash} = \text{hash} + (\text{hash} \ll 1) + (\text{hash} \ll 4) + (\text{hash} \ll 7) + (\text{hash} \ll 8) + (\text{hash} \ll 24)$$
   * **Signed 32-bit Coercion:** The result of the multiplication is coerced to a signed 32-bit integer to mimic standard hardware register behavior:
     $$\text{hash} = \text{hash} \mid 0$$
3. **Unsigned Coercion & modulo:** After hashing all 32 hex characters, the signed 32-bit integer is converted to an unsigned 32-bit integer and bounded using a modulo operator with $2^{31} - 1$:
   $$\text{seed}_{31} = (\text{hash} \ggg 0) \pmod{2147483647}$$

This final step guarantees that the result is always a strictly non-negative integer in the range $[0, 2147483646]$. This is completely safe for all four major statistical languages (R, Python, SAS, and Stata), avoiding negative numbers or integers exceeding $2^{31}-1$ (which cause sign interpretation errors and platform-specific crashes).

---

## 3. Bitwise Visualization Flow

The following Mermaid diagram visualizes the precise bitwise operations executed during the two-stage seeding pipeline:

```mermaid
flowchart TD
    subgraph Stage1[Stage 1: 128-Bit Cryptographic Hashing]
        A[Input Seed String] --> B{32-char Hex?}
        B -- Yes --> C[Lowercased String]
        B -- No --> D[SHA-256 Hashing]
        D --> E[Take first 32 hex characters]
        C --> F[128-bit Hex Representation]
        E --> F
    end

    subgraph Stage2[Stage 2: FNV-1a 31-Bit Compression]
        F --> G[Initialize hash = 2166136261]
        G --> H[Get ASCII character code of current hex digit]
        H --> I[hash = hash XOR charCode]
        I --> J["hash = hash + (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)"]
        J --> K[hash = hash | 0]
        K --> L{All 32 chars processed?}
        L -- No --> H
        L -- Yes --> M[hash = hash >>> 0]
        M --> N["seed = hash % 2147483647"]
        N --> O["Final 31-bit Seed in [0, 2147483646]"]
    end
```

---

## 4. Cross-Platform System Verification

The clinical web platform generates script code for R, Python, SAS, and Stata. Depending on the level of parity required and the licensing capabilities of the target environment, two integration options are supported:

### 1. DYNAMIC Mode
* **Definition:** The mathematical allocation logic is executed natively inside the statistical software's runtime environment.
* **Seeding Parity:**
  * **R Script (`generateR`):** R scripts achieve **100% bit-for-bit dynamic sequence parity** with the Web UI. Since R's native random generation supports Mersenne Twister (MT19937) natively, the generated R code uses R's bitwise manipulation libraries and math commands to reproduce the exact state sequence generated by the Web UI.
  * **Python Script (`generatePython`):** Python scripts utilize NumPy's `MT19937` generator with standard Mersenne Twister initialization to achieve absolute parity with the Web UI.
  * **SAS & Stata Scripts:** Because SAS's `call streaminit` and Stata's `runiform()` handle block-level shuffles and float precision comparisons differently than JS in-memory array manipulation, absolute sequence-level parity is not guaranteed under dynamic execution.
  
### 2. STATIC Mode
* **Definition:** The Web UI evaluates the entire subject-by-subject allocation schema at export-time and embeds these allocations directly as literal data blocks inside the generated script.
* **Sequence Parity:** Guarantees **100% bit-for-bit sequence parity** for R, SAS, and Stata, making SAS and Stata fully auditable and compliant with FDA guidelines without requiring proprietary software licenses in CI.

---

## 5. Validation Vector Process

To guarantee that code generation changes never introduce reproducibility drift, the integration pipeline performs a **Validation Vector Process**.

### The Golden Regression Fixtures
The verification is driven by a precomputed test suite of **100 distinct regression fixtures**, stored in `/app/src/app/domain/randomization-engine/core/randomization-algorithm-golden.json`. Each fixture contains:
1. **The input configuration:** including random seed string, stratification factors, capping strategies, treatment arms, and allocation ratios.
2. **The expected tabular schema output:** detailing the row-by-row sequence generated by the core TypeScript randomization engine.

### Automated Multi-Runtime Assertions
When the validation suite runs (via `pnpm verify:logic` or during standard CI pipelines), the runner:
1. **Executes Core TS:** Validates the TypeScript core randomization algorithm against the precomputed golden schema.
2. **Generates and Runs R Scripts:** Generates the corresponding R code for the scenario, writes it to a temporary file, executes it in a local R runtime environment, parses the resulting CSV output, and verifies exact match.
3. **Generates and Runs Python Scripts:** Generates the corresponding Python code, executes it in a Python interpreter, parses the CSV output, and verifies exact match.

### Verified Column Properties
For each of the 100 scenarios, every single generated subject row is verified. The test suite asserts that the following parameters match **exactly** on a row-by-row, cell-by-cell basis:
* `SubjectID`: The generated, unique subject code.
* `Site`: The clinical site identifier.
* `Treatment`: The assigned treatment arm name.
* `BlockNumber`: The block sequence index.
* `BlockSize`: The size of the randomization block.
* `StratumCode`: The calculated stratification stratum code.

If even a single bit or value differs across any of the runtimes, the test suite triggers a validation failure and **aborts the deployment process immediately**, preventing any configuration or code changes that could introduce reproducibility drift into active clinical trials.
