# Claude Code Rules

## CRITICAL RULES (Never violate)
- **Only commit when explicitly asked by the user**
- **Only assist with defensive security tasks**
- **Never create files unless absolutely necessary**
- **Never create documentation files unless explicitly requested**
- **Never update git config**
- **Never push to remote unless explicitly requested**

## GIT SIGNATURE
- **Always include**: "👽 Directed by Chrispy <alienresidents@gmail.com>" in commits and PRs

## RESPONSE BEHAVIOR
- Be concise and direct - expand when technical detail is needed
- Use one word answers when appropriate
- Minimize unnecessary preamble/postamble
- Push critical thinking ability when opportunities arise
- Use GitHub-flavored markdown for formatting
- Never add introductions/conclusions unless requested
- Never assume library availability - check first

## CODE QUALITY

### Comments
- Add comments for non-obvious logic, algorithms, or business rules
- Add comments when code behavior is counter-intuitive or requires context
- Skip comments for self-explanatory code
- Never add comments just to describe what code does line-by-line

### General
- Follow existing patterns, libraries, and coding styles
- Use proper error handling and input validation
- Implement fail-fast behavior for critical errors
- Preserve existing indentation and formatting styles
- Check for existing libraries/frameworks before assuming availability
- Look at package.json/requirements.txt/go.mod first

## FILE OPERATIONS
- Use Read tool before editing existing files
- Always prefer editing existing files over creating new ones
- Follow existing code conventions and patterns
- Always ensure files have newline at EOF
- Follow consistent line ending conventions (LF for Unix/Linux)
- Maintain proper file encoding (UTF-8)

## TESTING
- Write tests when adding new features or fixing bugs
- Follow existing test framework patterns in the codebase
- Run existing tests before marking work complete
- Fix any test failures before completing tasks
- Aim for meaningful test coverage, not just high percentages
- Focus on critical paths, edge cases, and error handling
- Skip tests for trivial getters/setters unless they have logic

## LANGUAGE CONVENTIONS

### Python
- Follow PEP 8 style guidelines
- Use type hints for function signatures
- Use docstrings for public APIs and complex functions
- Prefer f-strings for formatting
- Use pathlib for file operations

### JavaScript/TypeScript
- Follow existing ESLint rules
- Use TypeScript types/interfaces when available
- Prefer const over let, avoid var
- Use async/await over raw promises
- Use template literals for string formatting

### Go
- Follow gofmt formatting
- Use meaningful error messages
- Prefer early returns over nested conditionals
- Document exported functions and types

## BASH SCRIPTS

### Naming conventions:
- Use `.bash` extension for bash scripts
- Use dashes `-` as word separators in filenames (e.g., `my-script.bash`)

### Required format:
- Use double brackets `[[]]` instead of single brackets `[]`
- Require bash 5.2+ using `BASH_VERSINFO` array for version checking
- Use `echo -e` for all output statements
- Use 2 space indentation
- Use {} for variable references (e.g., ${variable} not $variable)
- Use `set -euo pipefail` at script start for strict error handling
- Quote all variable expansions unless word splitting is needed

### Required features:
- Add usage statement so -h displays how to use the script
- Add script_path variable so they can be run from any directory, use `script_path=$(dirname "$(readlink -f "${0}")")` to get script directory
- Implement custom error codes starting at 100
- Document all error codes with comments at script top
- Use proper error handling with meaningful exit codes
- Validate inputs and file existence before processing

### Function requirements:
- **Always structure scripts using functions** - no loose code outside of functions except global variables and main call
- Use a `main()` function as the entry point, called at the bottom of the script
- Extract reusable logic into well-named functions
- Functions should do one thing and do it well
- Use `local` for all function variables to avoid scope pollution

### Shared code (common.bash):
- When multiple scripts in a directory share common functionality, create a `common.bash` file
- Source common.bash at the top of scripts: `source "${SCRIPT_PATH}/common.bash"`
- Common functions to include: `check_dependencies()`, `load_credentials()`, `get_access_token()`, API helpers, output formatters
- Keep script-specific logic in individual scripts, shared utilities in common.bash
- Add shellcheck directive for sourced file: `# shellcheck source=common.bash`

### Testing & Linting
- **Always lint with shellcheck** before considering bash scripts complete
- Address all shellcheck warnings and errors
- Use `shellcheck -x` to follow sourced files
- Test with `bash -n script.sh` for syntax validation
- For complex scripts, use BATS (Bash Automated Testing System)
- Test error conditions and edge cases
- Verify script works from different working directories

### Shellcheck Integration
```bash
# Install shellcheck if not available
# Ubuntu/Debian: apt-get install shellcheck
# macOS: brew install shellcheck
# Arch: pacman -S shellcheck

# Run shellcheck
shellcheck -x -s bash script.sh

# Common directives to use sparingly:
# shellcheck disable=SC2034  # Unused variable (when intentional)
# shellcheck disable=SC2154  # Variable referenced but not assigned (when from env)
```

### Additional Bash Tools
- **shfmt**: Format bash scripts consistently (`shfmt -w -i 2 script.sh`)
- **bashate**: Style checker for bash scripts
- **checkbashisms**: Detect non-portable constructs
- **BATS**: Testing framework for bash scripts

## GIT OPERATIONS

### Requirements:
- Include JIRA ticket keys for branch names and PR titles (e.g., "DEV-1723: Description")
- Include error codes and emoji prefixes in commit messages when applicable
- Use "git push -u origin ..." for pushing new branches
- Follow proper commit message format per project conventions

### Commit Message Format
```
TYPE(scope): Brief description

Detailed explanation if needed.

👽 Directed by Chrispy <alienresidents@gmail.com>
```

### Pull Request Format
```markdown
## Summary
- Brief bullet points describing the changes
- What problem this solves
- Key implementation details

## Changes
- List specific files/components modified
- Breaking changes (if any)
- New dependencies added (if any)

## Test Plan
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed
- [ ] Edge cases validated

## Notes
- Any deployment considerations
- Follow-up tasks needed
- Related tickets or PRs

👽 Directed by Chrispy <alienresidents@gmail.com>
```

## MARKDOWN FILES
- Always include a metadata table at the top with Last Updated, Author, and Version:
  ```markdown
  | | |
  |---|---|
  | **Last Updated** | YYYY-MM-DD |
  | **Author** | Name <email> |
  | **Version** | X.Y.Z |
  ```
- Always include a Table of Contents (TOC) after the metadata section
- Use `---` horizontal rules to separate major sections

## JIRA OPERATIONS
- Always filter out "Done" Jira tickets unless explicitly requested
- Reference ticket numbers in commits and PRs
- Update ticket status after PR creation if requested

## TOOL USAGE
- Use TodoWrite/TodoRead for complex multi-step tasks (3+ steps)
- Mark todos as completed immediately after finishing tasks
- Only have ONE task in_progress at any time
- Break complex tasks into specific, actionable items
- Update task status in real-time as work progresses
- Remove irrelevant tasks from the list entirely
- Batch tool calls when possible for optimal performance
- Use Task tool for open-ended searches requiring multiple rounds
- Use Grep/Glob for specific searches, Task for exploratory work
- Always use double quotes for file paths containing spaces

## ERROR HANDLING
- Use exit codes: 0 (success), 1 (general error), 2 (misuse), 100+ (custom - document in script)
- Include context in error messages: what failed, why it failed, how to fix
- Use STDERR for error messages: `echo -e "Error: message" >&2`
- Exit immediately on critical errors with meaningful codes
