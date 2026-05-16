# Runs once per session (via sentinel file). Reads the first user message,
# keyword-matches it, and outputs additionalContext telling Claude which
# deferred MCP tools are relevant - avoiding unnecessary schema loads.

$raw = [Console]::In.ReadToEnd()
try { $data = $raw | ConvertFrom-Json } catch { exit 0 }

# One-shot per session: skip if we already ran for this session_id
$sid = $data.session_id
if ($sid) {
    $sentinel = "$env:TEMP\claude-mcp-gate-$sid.tmp"
    if (Test-Path $sentinel) { exit 0 }
    New-Item $sentinel -ItemType File -Force | Out-Null
}

# Extract prompt text (field name varies by event)
$msg = ''
foreach ($field in @('message', 'prompt', 'content', 'text')) {
    if ($data.$field) { $msg = $data.$field.ToLower(); break }
}

# Keywords that signal Railway/infra MCP is needed
$infraWords = @(
    'deploy', 'railway', 'service', 'environment', 'env var',
    'variable', 'log', 'logs', 'database', 'postgres', 'redis',
    'domain', 'scale', 'bucket', 'volume', 'infra', 'production',
    'prod', 'staging', 'mcp', 'railway mcp'
)

$needsMcp = $false
foreach ($word in $infraWords) {
    if ($msg.Contains($word)) { $needsMcp = $true; break }
}

if ($needsMcp) {
    $ctx = "Railway MCP tools (mcp__railway__*) are relevant for this session - load and use them as needed. Vercel MCP is not used in this project."
} else {
    $ctx = "This task appears to be code/UI work with no deployment or infrastructure changes. Skip loading Railway and Vercel MCP tool schemas to preserve context - only load them if the task explicitly shifts to deployment or infra."
}

[PSCustomObject]@{
    hookSpecificOutput = [PSCustomObject]@{
        hookEventName     = "UserPromptSubmit"
        additionalContext = $ctx
    }
} | ConvertTo-Json -Compress | Write-Output
