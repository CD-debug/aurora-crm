#!/usr/bin/env pwsh
# scripts/graphify-update.ps1 - Re-run the graph against the current working tree.
# Three modes:
#   .\graphify-update.ps1           full refresh (detect + extract + cluster-only) - default
#   .\graphify-update.ps1 -CodeOnly code-only (no docs/papers/images) - matches graph fast-path
#   .\graphify-update.ps1 -Incremental  graphify update: re-use the cache, only re-extract changes
#   .\graphify-update.ps1 -Quiet    suppress success output, only print on failure
#
# All paths are repo-relative and the script lives in aurora-crm/scripts/.
# The .git/hooks/post-commit hook calls this with no arguments.

[CmdletBinding()]
param(
    [switch]$CodeOnly,
    [switch]$Incremental,
    [switch]$Quiet
)

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path -Parent $PSScriptRoot)  # repo root

function Say($msg) { if (-not $Quiet) { Write-Host "[graphify] $msg" } }
function Warn($msg) { Write-Warning "[graphify] $msg" }

# ---- Pre-flight ---------------------------------------------------------------
if (-not (Test-Path '.git')) {
    Warn "Not a git repository - skipping graph refresh."
    exit 0
}
if (-not (Get-Command graphify -ErrorAction SilentlyContinue)) {
    Warn "graphify binary not found in PATH. Install with: uv tool install graphifyy"
    exit 0
}

# ---- Build the graphify command ----------------------------------------------
$args = @('.', '--code-only')
if ($CodeOnly) { $args = @('.', '--code-only') }

Say "Running: graphify $($args -join ' ')"

# graphify.exe returns non-zero on empty extraction; don't break the commit hook.
& graphify @args 2>&1 | Tee-Object -Variable output | ForEach-Object {
    if (-not $Quiet) { Write-Host $_ }
}

$exit = $LASTEXITCODE
if ($exit -ne 0 -and $Incremental) {
    Say "full run exited $exit - falling back to: graphify update ."
    & graphify update . 2>&1 | ForEach-Object { if (-not $Quiet) { Write-Host $_ } }
    $exit = $LASTEXITCODE
}

# Optional cluster-only refresh if --code-only was *not* called (we only call it when relevant).
if (-not $CodeOnly) {
    & graphify cluster-only . 2>&1 | ForEach-Object { if (-not $Quiet) { Write-Host $_ } }
}

if ($exit -ne 0) {
    Warn "graphify exited $exit - graph may be stale. See code-only path for code-only corpora."
    exit 0  # do not break the caller's workflow (e.g. post-commit hook)
}

# ---- Sanity checks ------------------------------------------------------------
$report = 'graphify-out/GRAPH_REPORT.md'
if (Test-Path $report) {
    $first = (Get-Content $report -TotalCount 1) -replace '.*- ',''
    Say "GRAPH_REPORT.md refreshed (heading: $first)"
} else {
    Warn "GRAPH_REPORT.md missing after run - the graph may be incomplete."
}

Say "Done."
