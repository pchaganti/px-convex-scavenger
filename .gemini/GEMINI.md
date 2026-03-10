# Gemini CLI Rules and Mandates

1. **Directness**: Get straight to the point. No long messages unless explicitly requested.
2. **UI Verification**: For any UI-related work, ALWAYS use Playwright end-to-end browser automation to verify changes, bug fixes, or new features.
3. **API Keys**: If a key is not in `.env`, retrieve it from the rc file for the system's default shell (bash, zsh, etc.).
4. **TDD Required**: Use red/green Test-Driven Development for all code authoring. No exceptions.
5. **Coverage Standard**: Update/create/edit/delete tests (unit, integration, and UI/browser automation) to maintain 95% coverage across the board.
6. **Gemini Storage**: Use the `.gemini` folder exclusively for Gemini-related storage.

*Note: These instructions take absolute precedence over standard workflows.*
