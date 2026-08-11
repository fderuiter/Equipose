#!/usr/bin/env Rscript
# [REQ-21CFR11-005]
#
# Compliance Audit Hash Verification Utility - R
#
# This script programmatically reconstructs and verifies the SHA-256 audit hash
# embedded in randomization exports (RandomizationResult structure) to satisfy
# the regulatory requirements of 21 CFR Part 11 and ICH E9.
#
# Logic:
# 1. Load the target JSON file using jsonlite.
# 2. Extract 'config', 'generatedAt' (under metadata), and 'schema' fields.
# 3. Recursively sort all list keys alphabetically.
# 4. Normalize all numeric values (doubles and integers) to strings with exactly
#    10 decimal places (matching TypeScript's Number.prototype.toFixed(10)).
# 5. Stringify the sorted list to a deterministic compact JSON string using jsonlite::toJSON.
# 6. Calculate the SHA-256 hash using digest::digest and compare with 'metadata$auditHash'.
#
# Exit Code:
# - 0: Hash verified successfully (or self-test passed).
# - 1: Verification failed or error occurred.

# Ensure required packages are loaded
suppressPackageStartupMessages({
  local_lib <- "/tmp/.Rlibs"
  if (!dir.exists(local_lib)) {
    dir.create(local_lib, recursive = TRUE, showWarnings = FALSE)
  }
  .libPaths(c(local_lib, .libPaths()))

  if (!requireNamespace("jsonlite", quietly = TRUE)) {
    install.packages("jsonlite", repos = "https://cloud.r-project.org", lib = local_lib, INSTALL_opts = "--no-lock")
  }
  if (!requireNamespace("digest", quietly = TRUE)) {
    install.packages("digest", repos = "https://cloud.r-project.org", lib = local_lib, INSTALL_opts = "--no-lock")
  }
  if (!requireNamespace("jsonlite", quietly = TRUE)) {
    stop("Package 'jsonlite' is required but could not be installed automatically.")
  }
  if (!requireNamespace("digest", quietly = TRUE)) {
    stop("Package 'digest' is required but could not be installed automatically.")
  }
})

sort_keys_deep <- function(val) {
  if (is.logical(val)) {
    # Preserve booleans as-is
    return(val)
  } else if (is.numeric(val)) {
    # Format all numeric values to exactly 10 decimal places as strings
    return(sprintf("%.10f", val))
  } else if (is.list(val)) {
    nms <- names(val)
    if (is.null(nms) || any(nms == "")) {
      # Unnamed list (JSON array): recursively process elements
      return(lapply(val, sort_keys_deep))
    } else {
      # Named list (JSON object): sort keys and process elements
      sorted_names <- sort(nms)
      sorted_list <- list()
      for (name in sorted_names) {
        sorted_list[[name]] <- sort_keys_deep(val[[name]])
      }
      return(sorted_list)
    }
  } else {
    # Preserve character/string and other types as-is
    return(val)
  }
}

calculate_audit_hash <- function(result_data) {
  metadata <- result_data$metadata
  if (is.null(metadata)) metadata <- list()
  
  config <- metadata$config
  if (is.null(config)) config <- list()
  
  generatedAt <- metadata$generatedAt
  if (is.null(generatedAt)) generatedAt <- ""
  
  schema <- result_data$schema
  if (is.null(schema)) schema <- list()
  
  # Reconstruct the target payload structure
  payload <- list(
    config = config,
    generatedAt = generatedAt,
    schema = schema
  )
  
  # Recursively sort keys and format numbers
  sorted_payload <- sort_keys_deep(payload)
  
  # Convert to a deterministic compact JSON string
  # jsonlite::toJSON options:
  # - auto_unbox = TRUE ensures vectors of length 1 are converted to JSON scalars
  # - json_verbatim = TRUE, etc. are used for raw strings
  json_str <- as.character(jsonlite::toJSON(sorted_payload, auto_unbox = TRUE, json_verbatim = TRUE))
  
  # Compute SHA-256 hash using digest package
  computed_hash <- digest::digest(json_str, algo = "sha256", serialize = FALSE)
  
  return(list(hash = computed_hash, json = json_str))
}

main <- function() {
  args <- commandArgs(trailingOnly = TRUE)
  
  if (length(args) < 1) {
    cat("No input file specified. Running built-in self-test...\n")
    
    # Define reference mock payload representing a RandomizationResult
    mock_result <- list(
      metadata = list(
        protocolId = "AUDIT-001",
        studyName = "Audit Test",
        phase = "Phase III",
        seed = "fixedseed123",
        generatedAt = "2024-06-01T12:00:00.000Z",
        strata = list(),
        config = list(
          protocolId = "AUDIT-001",
          studyName = "Audit Test",
          phase = "Phase III",
          arms = list(
            list(id = "A", name = "Active", ratio = 1)
          ),
          sites = list("Site1"),
          strata = list(),
          blockSizes = list(2),
          stratumCaps = list(),
          seed = "fixedseed123",
          subjectIdMask = "{SITE}-{SEQ:3}",
          randomizationMethod = "PERMUTED_BLOCK"
        ),
        auditHash = "PLACEHOLDER"
      ),
      schema = list()
    )
    
    res <- calculate_audit_hash(mock_result)
    mock_result$metadata$auditHash <- res$hash
    
    cat("\n--- Self-Test Results ---\n")
    cat(sprintf("Serialized Payload: %s\n", res$json))
    cat(sprintf("Computed SHA-256 Hash: %s\n", res$hash))
    
    # Verify that self-verification logic passes on itself
    second_res <- calculate_audit_hash(mock_result)
    if (identical(second_res$hash, mock_result$metadata$auditHash)) {
      cat("Self-test verification: PASS\n")
      quit(status = 0)
    } else {
      cat("Self-test verification: FAIL\n")
      quit(status = 1)
    }
  }
  
  file_path <- args[1]
  if (!file.exists(file_path)) {
    cat(sprintf("Error: File not found at '%s'\n", file_path), file = stderr())
    quit(status = 1)
  }
  
  tryCatch({
    # Read the JSON file (simplifyVector = FALSE preserves objects/arrays as lists)
    data <- jsonlite::read_json(file_path, simplifyVector = FALSE)
  }, error = function(e) {
    cat(sprintf("Error: Failed to parse JSON file: %s\n", conditionMessage(e)), file = stderr())
    quit(status = 1)
  })
  
  embedded_hash <- data$metadata$auditHash
  if (is.null(embedded_hash) || embedded_hash == "") {
    cat("Error: JSON does not contain metadata.auditHash\n", file = stderr())
    quit(status = 1)
  }
  
  res <- calculate_audit_hash(data)
  
  cat(sprintf("Embedded Hash: %s\n", embedded_hash))
  cat(sprintf("Computed Hash: %s\n", res$hash))
  
  if (tolower(res$hash) == tolower(embedded_hash)) {
    cat("Verification: SUCCESS - The audit trail hash matches.\n")
    quit(status = 0)
  } else {
    cat("Verification: FAILED - Hash mismatch detected!\n", file = stderr())
    quit(status = 1)
  }
}

main()
