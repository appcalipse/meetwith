# Quick Start: Auto-Approve Configuration ✅

## 🎯 What Was Configured

This repository now has **automatic approval and merging** for pull requests!

### ✨ New Features

1. **Auto-Approve** - PRs are automatically approved if they:
   - Come from trusted bots (Dependabot, Copilot, GitHub Actions)
   - Have labels: `auto-approve`, `auto-merge`, or `dependencies`
   - Have safe titles like `chore:`, `deps:`, `fix:`, `test:`, `docs:`

2. **Auto-Merge** - Approved PRs are automatically merged when:
   - All CI checks pass (lint, typecheck, tests, build)
   - PR has `auto-merge` label
   - PR is not a draft

3. **Dependabot** - Automatically creates PRs for:
   - npm package updates (weekly, Mondays at 09:00)
   - GitHub Actions updates (monthly)
   - PRs are auto-labeled and auto-approved

## 🚀 Quick Usage

### To enable auto-merge on YOUR PR:
```bash
# Option 1: Add label via command line
gh pr edit <PR_NUMBER> --add-label "auto-merge"

# Option 2: Use conventional commit format
git commit -m "chore: your message here"
# PR will be auto-approved!

# Option 3: Add label in GitHub web interface
# Just click "Labels" and select "auto-merge"
```

### To disable automation:
```bash
# Remove the label
gh pr edit <PR_NUMBER> --remove-label "auto-merge"

# Or convert to draft
gh pr ready --undo <PR_NUMBER>
```

## ⚙️ Required GitHub Settings

**⚠️ IMPORTANT:** You must configure these repository settings for full automation:

### 1. Enable Workflow Permissions
Go to: **Settings → Actions → General → Workflow permissions**
- ✅ Select "Read and write permissions"
- ✅ Check "Allow GitHub Actions to create and approve pull requests"

### 2. Enable Auto-Merge
Go to: **Settings → General → Pull Requests**
- ✅ Check "Allow auto-merge"
- ✅ Check "Allow squash merging"

### 3. Configure Branch Protection (Optional but Recommended)
Go to: **Settings → Branches → Add rule for `main`**
- ✅ Require status checks before merging
- ✅ Select required checks: `test`, lint, typecheck, build
- ⚠️ Do NOT require reviews (if you want full automation)

## 📁 Files Created

- `.github/workflows/auto-approve.yml` - Auto-approval workflow
- `.github/workflows/auto-merge.yml` - Auto-merge workflow
- `.github/dependabot.yml` - Dependency update configuration
- `.github/AUTO_APPROVE_GUIDE.md` - Full documentation

## 🔍 How to Test

1. **Create a test PR:**
   ```bash
   git checkout -b test-auto-approve
   echo "test" >> README.md
   git add README.md
   git commit -m "chore: test auto-approve"
   git push origin test-auto-approve
   gh pr create --title "chore: test auto-approve" --body "Testing automation"
   ```

2. **Watch the magic happen:**
   - Auto-approve workflow will approve it
   - `auto-merge` label will be added
   - After checks pass, it will auto-merge

3. **Check workflow logs:**
   - Go to Actions tab
   - Look for "Auto-approve PRs" and "Auto-merge PRs" runs

## 💡 Pro Tips

- Use conventional commit prefixes (`chore:`, `fix:`, `feat:`, etc.) for auto-approval
- Add `auto-merge` label to skip waiting for manual approval
- Convert to draft to pause automation while working
- Check workflow run logs if something doesn't work as expected

## 🆘 Troubleshooting

**PR not auto-approved?**
- Check the title has a safe prefix or proper label
- View workflow logs in Actions tab

**PR not auto-merged?**
- Ensure all checks passed (green checkmarks)
- Verify `auto-merge` label exists
- Make sure PR is not in draft mode

**Need help?**
- Read full guide: `.github/AUTO_APPROVE_GUIDE.md`
- Check workflow logs in Actions tab
- Review [GitHub Actions docs](https://docs.github.com/en/actions)

---

✅ **Configuration Complete!** Your repository is now fully automated.

Remember to configure the GitHub settings above to enable all features.
