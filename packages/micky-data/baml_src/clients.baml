client<llm> OpenCodeZenClaudeHaikuClient {
  provider anthropic
  options {
    base_url "https://opencode.ai/zen"
    api_key env.OPENCODE_API_KEY
    model "claude-haiku-4-5"
  }
}
