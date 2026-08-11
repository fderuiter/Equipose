# How-To: Verify Clinical Export Audit Trail Hash

This guide provides step-by-step instructions for clinical biostatistician and external validation engineers to programmatically reconstruct and verify the SHA-256 audit trail hash (`metadata.auditHash`) embedded in clinical randomization exports.

Automating this verification enables seamless clinical trial compliance under **21 CFR Part 11 (Electronic Records)** by ensuring the absolute integrity of clinical records post-export without manual inspection of core TypeScript code.

---

## Prerequisites

Before running the verification scripts, ensure you have the appropriate environment set up:

### For Python Verification
- **Python 3.7+**
- Uses only standard libraries (`json`, `hashlib`, `sys`, `os`). No additional package installation is required.

### For R Verification
- **R (any recent release)**
- Requires the following highly stable, industry-standard packages:
  - `jsonlite` (for parsing JSON)
  - `digest` (for computing SHA-256 hashes)
- Install these packages via the R console if they are not already installed:
  ```R
  install.packages("jsonlite")
  install.packages("digest")
  ```

---

## Step-by-Step Execution

### Option A: Using Python (`scripts/verify_audit_hash.py`)

1. **Download or Locate the Script**:
   Find the script at `scripts/verify_audit_hash.py` within the repository.

2. **Execute the Script**:
   Run the script from your terminal, passing the absolute or relative path to your exported JSON randomization schedule:
   ```bash
   python3 scripts/verify_audit_hash.py /path/to/exported_randomization.json
   ```

3. **Verify the Output**:
   - If the calculated hash matches the embedded `metadata.auditHash`, the script outputs a success message and exits with status code `0`:
     ```text
     Embedded Hash: 8701cac6902a53c9d7626c9648df0db26370b1347236bff440797e9575b7f031
     Computed Hash: 8701cac6902a53c9d7626c9648df0db26370b1347236bff440797e9575b7f031
     Verification: SUCCESS - The audit trail hash matches.
     ```
   - If there is a mismatch or the data is tampered with, the script prints an error and exits with status code `1`.

---

### Option B: Using R (`scripts/verify_audit_hash.R`)

1. **Download or Locate the Script**:
   Find the script at `scripts/verify_audit_hash.R` within the repository.

2. **Execute the Script**:
   Run the script using `Rscript`, passing the path to your exported JSON randomization schedule:
   ```bash
   Rscript scripts/verify_audit_hash.R /path/to/exported_randomization.json
   ```

3. **Verify the Output**:
   - If verified, the script outputs a success message and exits with status code `0`:
     ```text
     Embedded Hash: 8701cac6902a53c9d7626c9648df0db26370b1347236bff440797e9575b7f031
     Computed Hash: 8701cac6902a53c9d7626c9648df0db26370b1347236bff440797e9575b7f031
     Verification: SUCCESS - The audit trail hash matches.
     ```
   - If verification fails, it exits with status code `1`.

---

## How the Hashing Parity is Achieved

To maintain 100% parity with the TypeScript randomization engine's serialization, both Python and R scripts implement the following strict deterministic guidelines:

1. **Payload Extraction**:
   Only three core sections of the randomization export are hashed (to prevent circular references from the `auditHash` itself):
   - `config`
   - `generatedAt`
   - `schema`

2. **Deep Key Sorting**:
   All dictionary/list keys are recursively sorted in alphabetical order before stringification. This ensures that differences in property insertion order in different runtime environments do not affect the hash output.

3. **Precision Formatting (10 Decimal Places)**:
   Every numeric value (both integer and float) is normalized and formatted to exactly 10 decimal places as a string (using `toFixed(10)`-equivalent logic: `"{:.10f}"` in Python, `sprintf("%.10f")` in R). Because they are formatted to strings, they are wrapped in double quotes in the final serialized JSON, ensuring exact bite-level string representation parity across all environments.

4. **Deterministic JSON Serialization**:
   Whitespace is completely eliminated (compact serialization, e.g. using `separators=(',', ':')` in Python and auto-unboxing single elements in R) to produce an identical UTF-8 payload byte sequence prior to hashing with standard SHA-256.
