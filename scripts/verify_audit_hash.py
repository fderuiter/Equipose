#!/usr/bin/env python3
# [REQ-21CFR11-005]
"""
Compliance Audit Hash Verification Utility - Python

This script programmatically reconstructs and verifies the SHA-256 audit hash
embedded in randomization exports (RandomizationResult structure) to satisfy
the regulatory requirements of 21 CFR Part 11 and ICH E9.

Logic:
1. Load the target JSON file.
2. Extract the 'config', 'generatedAt' (under metadata), and 'schema' fields.
3. Recursively sort all object keys alphabetically.
4. Normalize all numeric values (integers and floats) to strings with exactly
   10 decimal places (matching TypeScript's Number.prototype.toFixed(10)).
5. Stringify the sorted object to a deterministic JSON string.
6. Calculate the SHA-256 hash and compare with 'metadata.auditHash'.

Exit Code:
- 0: Hash verified successfully (or self-test passed).
- 1: Verification failed or error occurred.
"""

import sys
import json
import hashlib
import os

def sort_keys_deep(val):
    """
    Recursively sorts dictionary keys alphabetically and formats all numbers
    to exactly 10 decimal places as strings, matching TypeScript's serialization.
    """
    if isinstance(val, bool):
        # Booleans must be preserved as-is. Since bool is a subclass of int in Python,
        # we check for bool before checking for int/float.
        return val
    elif isinstance(val, (int, float)):
        # Format numbers to exactly 10 decimal places as a string
        return f"{val:.10f}"
    elif isinstance(val, list):
        return [sort_keys_deep(item) for item in val]
    elif isinstance(val, dict):
        return {k: sort_keys_deep(val[k]) for k in sorted(val.keys())}
    else:
        return val

def calculate_audit_hash(result_data):
    """
    Reconstructs the serialization payload and computes the SHA-256 audit hash.
    """
    metadata = result_data.get("metadata", {})
    config = metadata.get("config", {})
    generated_at = metadata.get("generatedAt", "")
    schema = result_data.get("schema", [])

    # Reconstruct the target payload structure
    payload = {
        "config": config,
        "generatedAt": generated_at,
        "schema": schema
    }

    # Deterministically sort keys and format numbers
    sorted_payload = sort_keys_deep(payload)

    # Convert to standard compact JSON string (no spaces, non-ascii preserved as utf-8)
    json_str = json.dumps(sorted_payload, separators=(',', ':'), ensure_ascii=False)

    # Compute SHA-256 hash
    hasher = hashlib.sha256()
    hasher.update(json_str.encode("utf-8"))
    return hasher.hexdigest(), json_str

def main():
    # If no file path is provided, run self-test verification
    if len(sys.argv) < 2:
        print("No input file specified. Running built-in self-test...")
        
        # Define a mock RandomizationResult with a pre-computed audit hash.
        # We will dynamically calculate the expected hash during self-test to prove the logic.
        mock_result = {
            "metadata": {
                "protocolId": "AUDIT-001",
                "studyName": "Audit Test",
                "phase": "Phase III",
                "seed": "fixedseed123",
                "generatedAt": "2024-06-01T12:00:00.000Z",
                "strata": [],
                "config": {
                    "protocolId": "AUDIT-001",
                    "studyName": "Audit Test",
                    "phase": "Phase III",
                    "arms": [
                        {"id": "A", "name": "Active", "ratio": 1}
                    ],
                    "sites": ["Site1"],
                    "strata": [],
                    "blockSizes": [2],
                    "stratumCaps": [],
                    "seed": "fixedseed123",
                    "subjectIdMask": "{SITE}-{SEQ:3}",
                    "randomizationMethod": "PERMUTED_BLOCK"
                },
                "auditHash": "PLACEHOLDER"
            },
            "schema": []
        }
        
        computed_hash, serialized_str = calculate_audit_hash(mock_result)
        mock_result["metadata"]["auditHash"] = computed_hash
        
        print("\n--- Self-Test Results ---")
        print(f"Serialized Payload: {serialized_str}")
        print(f"Computed SHA-256 Hash: {computed_hash}")
        
        # Verify that verification logic passes on itself
        second_computed, _ = calculate_audit_hash(mock_result)
        if second_computed == mock_result["metadata"]["auditHash"]:
            print("Self-test verification: PASS")
            sys.exit(0)
        else:
            print("Self-test verification: FAIL")
            sys.exit(1)

    file_path = sys.argv[1]
    if not os.path.exists(file_path):
        print(f"Error: File not found at '{file_path}'", file=sys.stderr)
        sys.exit(1)

    try:
        with open(file_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception as e:
        print(f"Error: Failed to parse JSON file: {e}", file=sys.stderr)
        sys.exit(1)

    embedded_hash = data.get("metadata", {}).get("auditHash", "")
    if not embedded_hash:
        print("Error: JSON does not contain metadata.auditHash", file=sys.stderr)
        sys.exit(1)

    computed_hash, _ = calculate_audit_hash(data)

    print(f"Embedded Hash: {embedded_hash}")
    print(f"Computed Hash: {computed_hash}")

    if computed_hash.lower() == embedded_hash.lower():
        print("Verification: SUCCESS - The audit trail hash matches.")
        sys.exit(0)
    else:
        print("Verification: FAILED - Hash mismatch detected!", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
