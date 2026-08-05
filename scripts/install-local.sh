#!/bin/bash
# 一键安装本地修改的 comet 到 Qoder CLI 和 Claude Code

set -e

echo "==> 构建项目..."
pnpm build

echo "==> 链接本地包到全局..."
npm link

echo "==> 安装到 ~/.qoder/skills/ ..."
comet init --scope global --yes

echo "==> 同步到 ~/.claude/skills/ ..."
rm -rf ~/.claude/skills/comet
cp -R ~/.qoder/skills/comet ~/.claude/skills/

# 同步其他 comet 相关 skills
for skill in comet-any comet-archive comet-build comet-classic comet-design \
             comet-hotfix comet-native comet-open comet-tweak comet-verify \
             openspec-apply-change openspec-archive-change openspec-bulk-archive-change \
             openspec-continue-change openspec-explore openspec-ff-change openspec-new-change \
             openspec-onboard openspec-propose openspec-sync-specs openspec-verify-change; do
    if [ -d ~/.qoder/skills/$skill ]; then
        rm -rf ~/.claude/skills/$skill
        cp -R ~/.qoder/skills/$skill ~/.claude/skills/
    fi
done

echo "==> 完成！版本: $(comet --version)"
echo "    ~/.qoder/skills/comet/ ✓"
echo "    ~/.claude/skills/comet/ ✓"
