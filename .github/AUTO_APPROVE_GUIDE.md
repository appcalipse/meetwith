# Auto-Approve and Auto-Merge Configuration

This repository is configured with automated approval and merging workflows to streamline the development process while maintaining code quality.

## 🤖 Automated Workflows

### 1. Auto-Approve Workflow (`.github/workflows/auto-approve.yml`)

Automatically approves pull requests that meet specific criteria.

**Triggers:**
- When a PR is opened, synchronized, or reopened

**Auto-approval criteria:**
- PRs from trusted bots (dependabot, copilot, github-actions)
- PRs with labels: `auto-approve`, `auto-merge`, or `dependencies`
- PRs with safe commit prefixes: `chore:`, `deps:`, `fix:`, `test:`, `docs:`
- PRs with titles containing "dependencies" or "dependency"

**What it does:**
1. Checks if PR meets auto-approval criteria
2. Approves the PR with a comment
3. Adds `auto-merge` label automatically

### 2. Auto-Merge Workflow (`.github/workflows/auto-merge.yml`)

Automatically merges pull requests after all checks pass.

**Triggers:**
- When a PR is opened, synchronized, reopened, or labeled
- When a PR review is submitted
- When check suites complete
- When status checks update

**Auto-merge criteria:**
- PR has label: `auto-merge`, `automerge`, or `dependencies`
- PR is from a trusted bot (dependabot, copilot, github-actions)
- PR is not in draft mode
- All CI checks have passed successfully

**What it does:**
1. Verifies PR meets auto-merge criteria
2. Checks all CI checks have passed (tests, lint, typecheck, build)
3. Merges the PR using squash merge
4. Adds a comment confirming the merge

### 3. Dependabot (`.github/dependabot.yml`)

Automatically creates PRs for dependency updates.

**Configuration:**
- **npm packages**: Weekly updates on Mondays at 09:00
- **GitHub Actions**: Monthly updates
- Automatically labeled with `dependencies`, `auto-approve`, `auto-merge`
- Assigned to repository owner

## 🏷️ Labels

### Auto-Approve Labels
Add any of these labels to a PR to trigger auto-approval:
- `auto-approve` - Explicitly request auto-approval
- `auto-merge` - Request both approval and merge
- `dependencies` - Dependency updates (automatically added by Dependabot)

### Manual Control
- Remove the `auto-merge` label to prevent automatic merging
- Convert PR to draft to pause automation
- Close/reopen PR to reset automation state

## 🔒 Safety Features

1. **Draft Protection**: Draft PRs are never auto-merged
2. **Check Requirements**: All CI checks must pass before merge
3. **Manual Override**: Remove labels or convert to draft to prevent automation
4. **Comment Trail**: Automated actions leave comments for transparency
5. **Error Handling**: Failed merges are reported with explanatory comments

## 🚀 Usage Examples

### For Developers

#### Enable auto-merge for your PR:
```bash
# Add the label via GitHub CLI
gh pr edit <PR_NUMBER> --add-label "auto-merge"

# Or via web interface: Add "auto-merge" label to your PR
```

#### Quick dependency update PR:
```bash
# Use conventional commit format
git commit -m "chore(deps): update dependencies"
# PR will be auto-approved and auto-merged
```

### For Bots

Dependabot PRs are automatically:
1. Created with `dependencies` label
2. Auto-approved by the workflow
3. Auto-merged when all checks pass

## ⚙️ Repository Settings Required

For full automation to work, configure these GitHub repository settings:

### Branch Protection Rules (Settings → Branches)
1. Enable branch protection for `main` (and other protected branches)
2. ✅ Require status checks to pass before merging
3. ✅ Require branches to be up to date before merging
4. Select required checks:
   - `test` (from test.yml workflow)
   - Lint
   - Type check
   - Build
5. ⚠️ Do NOT enable "Require pull request reviews" if you want bots to auto-merge
   - OR: Enable it but allow workflows to bypass (see below)

### Allow GitHub Actions to Create and Approve PRs
1. Go to Settings → Actions → General
2. Under "Workflow permissions":
   - ✅ Select "Read and write permissions"
   - ✅ Check "Allow GitHub Actions to create and approve pull requests"

### Allow Auto-Merge
1. Go to Settings → General
2. Under "Pull Requests":
   - ✅ Check "Allow auto-merge"
   - ✅ Check "Allow squash merging" (or your preferred merge method)

## 🔄 Workflow Integration

The workflows integrate with existing CI:

```
PR Opened/Updated
    ↓
Auto-Approve Workflow
    ↓ (approves if criteria met)
Test Workflow (test.yml)
    ↓ (runs lint, typecheck, tests, build)
Auto-Merge Workflow
    ↓ (merges if all checks pass)
Deploy Workflow (deploy.yml)
    ↓ (deploys if merged to main/develop/pre-prod)
```

## 🛠️ Customization

### Change merge method
Edit `.github/workflows/auto-merge.yml`:
```yaml
merge_method: 'squash'  # Change to 'merge' or 'rebase'
```

### Modify auto-approval criteria
Edit `.github/workflows/auto-approve.yml` to add/remove conditions.

### Adjust Dependabot schedule
Edit `.github/dependabot.yml`:
```yaml
schedule:
  interval: "weekly"  # Change to daily/monthly
  day: "monday"       # Change day
  time: "09:00"       # Change time
```

## 📝 Testing the Workflows

### Test auto-approve:
1. Create a PR with title: `chore: test auto-approve`
2. Watch for auto-approval comment
3. Check that `auto-merge` label was added

### Test auto-merge:
1. Create a PR with `auto-merge` label
2. Wait for all checks to pass
3. Watch for automatic merge

### Test Dependabot:
1. Wait for weekly scheduled run
2. Review auto-created PRs
3. Verify they have correct labels

## 🐛 Troubleshooting

### PR not auto-approved?
- Check PR title matches criteria
- Verify user/bot is in trusted list
- Check workflow run logs in Actions tab

### PR not auto-merged?
- Ensure all CI checks passed
- Verify `auto-merge` label is present
- Check PR is not in draft mode
- Review workflow logs for errors

### Dependabot PRs not created?
- Check `.github/dependabot.yml` syntax
- Verify schedule settings
- Check Dependabot logs in Insights → Dependency graph → Dependabot

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [Branch Protection Rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches)

## 🔐 Security Considerations

- Only trusted bots are auto-approved
- All checks must pass before merge
- Manual review can override automation
- Audit trail maintained in PR comments
- Labels can be managed by repository admins only (with proper permissions)
