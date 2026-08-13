#!/usr/bin/env Rscript
# [REQ-21CFR11-005]
#
# Compliance Audit Hash Verification Utility - R (Base-R Re-implementation)
#
# This script programmatically reconstructs and verifies the SHA-256 audit hash
# embedded in randomization exports (RandomizationResult structure) to satisfy
# the regulatory requirements of 21 CFR Part 11 and ICH E9.
#
# This implementation uses only Base-R capabilities and host system command piping
# to calculate SHA-256 hashes, completely eliminating third-party dependencies (like jsonlite and digest).
#
# Logic:
# 1. Read the target JSON file as a character string.
# 2. Parse the JSON string into standard nested R list structures via a custom parser.
# 3. Extract 'config', 'generatedAt' (under metadata), and 'schema' fields.
# 4. Recursively sort all list keys alphabetically, preserving type attributes.
# 5. Normalize all numeric values to strings with exactly 10 decimal places.
# 6. Stringify the sorted list to a compact deterministic JSON string using a custom serializer.
# 7. Compute the SHA-256 hash using the host system's native cryptographic command.
# 8. Compare the computed hash with 'metadata$auditHash'.
#
# Exit Code:
# - 0: Hash verified successfully (or self-test passed).
# - 1: Verification failed or error occurred.

# Custom Tokenizer & Parser for JSON (Pure Base-R)
tokenize_json <- function(json_str) {
  # Regex to extract JSON tokens: strings, numbers, booleans, null, and delimiters
  pattern <- '"(?:[^"\\\\]|\\\\.)*"|-?(?:0|[1-9]\\d*)(?:\\.\\d+)?(?:[eE][+-]?\\d+)?|true|false|null|[\\{\\}\\[\\]:,]'
  matches <- gregexpr(pattern, json_str, perl = TRUE)
  tokens <- regmatches(json_str, matches)[[1]]
  return(tokens)
}

unescape_string <- function(s) {
  if (!grepl("\\\\", s, fixed = TRUE)) {
    return(s)
  }
  chars <- strsplit(s, "")[[1]]
  n <- length(chars)
  if (n == 0) return("")
  res <- character(n)
  res_idx <- 1
  i <- 1
  while (i <= n) {
    if (chars[i] == "\\") {
      if (i < n) {
        next_char <- chars[i + 1]
        if (next_char == "n") {
          res[res_idx] <- "\n"
        } else if (next_char == "r") {
          res[res_idx] <- "\r"
        } else if (next_char == "t") {
          res[res_idx] <- "\t"
        } else if (next_char == '"') {
          res[res_idx] <- '"'
        } else if (next_char == "\\") {
          res[res_idx] <- "\\"
        } else {
          res[res_idx] <- next_char
        }
        i <- i + 2
      } else {
        res[res_idx] <- "\\"
        i <- i + 1
      }
    } else {
      res[res_idx] <- chars[i]
      i <- i + 1
    }
    res_idx <- res_idx + 1
  }
  return(paste(res[1:(res_idx - 1)], collapse = ""))
}

parse_json <- function(tokens) {
  idx <- 1
  n_tokens <- length(tokens)
  
  parse_value <- function() {
    if (idx > n_tokens) {
      stop("Unexpected end of JSON input")
    }
    
    token <- tokens[idx]
    
    if (token == "{") {
      return(parse_object())
    } else if (token == "[") {
      return(parse_array())
    } else if (substr(token, 1, 1) == '"') {
      val <- substr(token, 2, nchar(token) - 1)
      val <- unescape_string(val)
      idx <<- idx + 1
      return(val)
    } else if (token == "true") {
      idx <<- idx + 1
      return(TRUE)
    } else if (token == "false") {
      idx <<- idx + 1
      return(FALSE)
    } else if (token == "null") {
      idx <<- idx + 1
      return(NULL)
    } else {
      val <- as.numeric(token)
      if (is.na(val)) {
        stop(paste("Invalid JSON token:", token))
      }
      idx <<- idx + 1
      return(val)
    }
  }
  
  parse_object <- function() {
    idx <<- idx + 1
    obj <- list()
    attr(obj, "json_type") <- "object"
    
    if (tokens[idx] == "}") {
      idx <<- idx + 1
      return(obj)
    }
    
    while (TRUE) {
      if (substr(tokens[idx], 1, 1) != '"') {
        stop(paste("Expected string key in object, got:", tokens[idx]))
      }
      key <- substr(tokens[idx], 2, nchar(tokens[idx]) - 1)
      key <- unescape_string(key)
      idx <<- idx + 1
      
      if (tokens[idx] != ":") {
        stop(paste("Expected ':', got:", tokens[idx]))
      }
      idx <<- idx + 1
      
      val <- parse_value()
      obj[[key]] <- val
      
      if (tokens[idx] == "}") {
        idx <<- idx + 1
        break
      } else if (tokens[idx] == ",") {
        idx <<- idx + 1
      } else {
        stop(paste("Expected ',' or '}', got:", tokens[idx]))
      }
    }
    return(obj)
  }
  
  parse_array <- function() {
    idx <<- idx + 1
    arr <- list()
    attr(arr, "json_type") <- "array"
    
    if (tokens[idx] == "]") {
      idx <<- idx + 1
      return(arr)
    }
    
    while (TRUE) {
      val <- parse_value()
      arr[[length(arr) + 1]] <- val
      
      if (tokens[idx] == "]") {
        idx <<- idx + 1
        break
      } else if (tokens[idx] == ",") {
        idx <<- idx + 1
      } else {
        stop(paste("Expected ',' or ']', got:", tokens[idx]))
      }
    }
    return(arr)
  }
  
  res <- parse_value()
  if (idx <= n_tokens) {
    stop("Trailing characters after valid JSON")
  }
  return(res)
}

# Custom Deterministic JSON Serializer (Pure Base-R)
escape_string <- function(s) {
  s <- gsub('\\\\', '\\\\\\\\', s)
  s <- gsub('"', '\\\\"', s)
  s <- gsub('\n', '\\\\n', s)
  s <- gsub('\r', '\\\\r', s)
  s <- gsub('\t', '\\\\t', s)
  return(paste0('"', s, '"'))
}

to_json <- function(val) {
  if (is.null(val)) {
    return("null")
  } else if (is.logical(val)) {
    if (length(val) != 1) {
      stop("Logical vector of length != 1 is not supported as a scalar")
    }
    return(if (val) "true" else "false")
  } else if (is.character(val)) {
    if (length(val) != 1) {
      elems <- vapply(val, escape_string, FUN.VALUE = character(1))
      return(paste0("[", paste(elems, collapse = ","), "]"))
    }
    return(escape_string(val))
  } else if (is.numeric(val)) {
    if (length(val) != 1) {
      elems <- as.character(val)
      return(paste0("[", paste(elems, collapse = ","), "]"))
    }
    return(as.character(val))
  } else if (is.list(val)) {
    type_attr <- attr(val, "json_type")
    
    nms <- names(val)
    is_object <- FALSE
    if (!is.null(type_attr)) {
      if (type_attr == "object") {
        is_object <- TRUE
      } else {
        is_object <- FALSE
      }
    } else if (!is.null(nms) && !any(nms == "")) {
      is_object <- TRUE
    }
    
    if (is_object) {
      if (length(val) == 0) {
        return("{}")
      }
      pairs <- character(length(val))
      keys <- names(val)
      for (i in seq_along(val)) {
        k <- keys[i]
        v <- val[[i]]
        pairs[i] <- paste0(escape_string(k), ":", to_json(v))
      }
      return(paste0("{", paste(pairs, collapse = ","), "}"))
    } else {
      if (length(val) == 0) {
        return("[]")
      }
      elems <- vapply(val, to_json, FUN.VALUE = character(1))
      return(paste0("[", paste(elems, collapse = ","), "]"))
    }
  } else {
    stop(paste("Unsupported type for JSON serialization:", class(val)))
  }
}

# Recursively sort named list keys and format numbers
sort_keys_deep <- function(val) {
  if (is.logical(val)) {
    return(val)
  } else if (is.numeric(val)) {
    return(sprintf("%.10f", val))
  } else if (is.list(val)) {
    type_attr <- attr(val, "json_type")
    
    nms <- names(val)
    is_object <- FALSE
    if (!is.null(type_attr)) {
      if (type_attr == "object") {
        is_object <- TRUE
      } else {
        is_object <- FALSE
      }
    } else if (!is.null(nms) && !any(nms == "")) {
      is_object <- TRUE
    }
    
    if (is_object) {
      if (length(val) == 0) {
        res <- list()
        attr(res, "json_type") <- "object"
        return(res)
      }
      sorted_names <- sort(names(val))
      res <- list()
      for (name in sorted_names) {
        res[[name]] <- sort_keys_deep(val[[name]])
      }
      attr(res, "json_type") <- "object"
      return(res)
    } else {
      res <- lapply(val, sort_keys_deep)
      attr(res, "json_type") <- "array"
      return(res)
    }
  } else {
    return(val)
  }
}

# Host system cryptographic utility piping
compute_sha256 <- function(json_str) {
  temp_file <- tempfile(pattern = "audit_hash_", fileext = ".json")
  on.exit(if (file.exists(temp_file)) file.remove(temp_file))
  
  writeBin(charToRaw(json_str), temp_file)
  
  hash <- NULL
  
  clean_hash <- function(raw_out) {
    out_str <- paste(raw_out, collapse = " ")
    matches <- regexpr("[a-fA-F0-9]{64}", out_str)
    if (matches != -1) {
      return(tolower(regmatches(out_str, matches)))
    }
    return(NULL)
  }
  
  if (.Platform$OS.type == "windows") {
    tryCatch({
      out <- system2("powershell", args = c("-NoProfile", "-NonInteractive", "-Command", 
                                            sprintf("(Get-FileHash -Path '%s' -Algorithm SHA256).Hash", temp_file)),
                     stdout = TRUE, stderr = FALSE)
      hash <- clean_hash(out)
    }, error = function(e) {})
    
    if (is.null(hash)) {
      tryCatch({
        out <- system2("certutil", args = c("-hashfile", temp_file, "SHA256"), stdout = TRUE, stderr = FALSE)
        hash <- clean_hash(out)
      }, error = function(e) {})
    }
  } else {
    tryCatch({
      out <- system2("sha256sum", args = temp_file, stdout = TRUE, stderr = FALSE)
      hash <- clean_hash(out)
    }, error = function(e) {})
    
    if (is.null(hash)) {
      tryCatch({
        out <- system2("shasum", args = c("-a", "256", temp_file), stdout = TRUE, stderr = FALSE)
        hash <- clean_hash(out)
      }, error = function(e) {})
    }
    
    if (is.null(hash)) {
      tryCatch({
        out <- system2("openssl", args = c("dgst", "-sha256", temp_file), stdout = TRUE, stderr = FALSE)
        hash <- clean_hash(out)
      }, error = function(e) {})
    }
  }
  
  if (is.null(hash)) {
    stop("Failed to compute SHA-256 hash: no native cryptographic utility found or command failed.")
  }
  
  return(hash)
}

calculate_audit_hash <- function(result_data) {
  metadata <- result_data$metadata
  if (is.null(metadata)) metadata <- list()
  
  config <- metadata$config
  if (is.null(config)) {
    config <- list()
    attr(config, "json_type") <- "object"
  }
  
  generatedAt <- metadata$generatedAt
  if (is.null(generatedAt)) generatedAt <- ""
  
  schema <- result_data$schema
  if (is.null(schema)) {
    schema <- list()
    attr(schema, "json_type") <- "array"
  }
  
  payload <- list(
    config = config,
    generatedAt = generatedAt,
    schema = schema
  )
  
  sorted_payload <- sort_keys_deep(payload)
  json_str <- to_json(sorted_payload)
  computed_hash <- compute_sha256(json_str)
  
  return(list(hash = computed_hash, json = json_str))
}

main <- function() {
  args <- commandArgs(trailingOnly = TRUE)
  
  if (length(args) < 1) {
    cat("No input file specified. Running built-in self-test...\n")
    
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
    # Set explicit types for mock arrays to ensure proper fallback serialization
    attr(mock_result$metadata$strata, "json_type") <- "array"
    attr(mock_result$metadata$config$strata, "json_type") <- "array"
    attr(mock_result$metadata$config$stratumCaps, "json_type") <- "array"
    attr(mock_result$schema, "json_type") <- "array"
    
    res <- calculate_audit_hash(mock_result)
    mock_result$metadata$auditHash <- res$hash
    
    cat("\n--- Self-Test Results ---\n")
    cat(sprintf("Serialized Payload: %s\n", res$json))
    cat(sprintf("Computed SHA-256 Hash: %s\n", res$hash))
    
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
    json_lines <- readLines(file_path, warn = FALSE, encoding = "UTF-8")
    json_str <- paste(json_lines, collapse = "\n")
    tokens <- tokenize_json(json_str)
    data <- parse_json(tokens)
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
