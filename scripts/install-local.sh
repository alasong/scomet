#!/bin/bash
# 一键安装本地修改的 comet 到 Claude Code

set -e

echo "==> 构建项目..."
pnpm build

echo "==> 链接本地包到全局..."
npm link

echo "==> 安装到当前项目的 Claude Code..."
comet init --platform claude-code --yes

echo "==> 完成！版本: $(comet --version)"
