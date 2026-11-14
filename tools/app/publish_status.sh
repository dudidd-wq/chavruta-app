#!/bin/bash
# Refresh the public status page (data/project-status.*) from the box pipeline files.
# Runs on the box only (the pipeline data lives there). Opens a PR, waits for the
# PR check, and merges only when it passes. Publishes nothing when nothing changed,
# except a freshness refresh when the page is older than MAX_AGE_H hours.
set -euo pipefail
MIRROR=${MIRROR:-/workspace/chavruta/github/chavruta-app/mirror.git}
DATA_ROOT=${DATA_ROOT:-/workspace/chavruta/phase0}
REPO=${REPO:-dudidd-wq/chavruta-app}
MAX_AGE_H=${MAX_AGE_H:-6}
LOG=${LOG:-/workspace/chavruta/phase0/ops/status_publish.log}
exec 9>/tmp/chavruta-status-publish.lock
flock -n 9 || { echo "$(date '+%F %T') already running" >>"$LOG"; exit 0; }

WT=$(mktemp -d /tmp/status-publish-XXXX)
cleanup() { git -C "$MIRROR" worktree remove --force "$WT" >/dev/null 2>&1 || rm -rf "$WT"; }
trap cleanup EXIT
git -C "$MIRROR" fetch -q --refmap='' origin '+refs/heads/main:refs/remotes/origin/main'
rmdir "$WT"; git -C "$MIRROR" worktree add -q --detach "$WT" origin/main
cd "$WT"
python3 tools/app/build_project_status.py --data-root "$DATA_ROOT" --out data/project-status.json >/dev/null

changed=$(python3 - <<'PY'
import json, subprocess, datetime
new = json.load(open("data/project-status.json"))
try:
    old = json.loads(subprocess.check_output(["git", "show", "HEAD:data/project-status.json"]))
except Exception:
    print("yes"); raise SystemExit
strip = lambda d: {k: v for k, v in d.items() if k not in ("generated", "generated_label")}
if strip(new) != strip(old):
    print("yes"); raise SystemExit
age = datetime.datetime.fromisoformat(new["generated"]) - datetime.datetime.fromisoformat(old["generated"])
import os
print("yes" if age.total_seconds() > float(os.environ.get("MAX_AGE_H", "6")) * 3600 else "no")
PY
)
if [ "$changed" != "yes" ]; then echo "$(date '+%F %T') no change" >>"$LOG"; exit 0; fi
python3 tools/ci/pr_check.py >/dev/null

BR="status-refresh-$(date +%Y%m%d-%H%M)"
git switch -q -c "$BR"
git add data/project-status.json data/project-status.js
git -c user.name='chavruta-status[bot]' -c user.email='chavruta-status@users.noreply.github.com' \
  commit -q -m "רענון עמוד מצב המערכת ($(date '+%d.%m %H:%M'))"
git push -q "https://github.com/$REPO.git" "HEAD:refs/heads/$BR"
URL=$(gh pr create -R "$REPO" --base main --head "$BR" \
  --title "רענון עמוד מצב המערכת ($(date '+%d.%m %H:%M'))" \
  --body "רענון אוטומטי של data/project-status.* מקובצי הצנרת בתיבה (tools/app/publish_status.sh). מספרים מצטברים בלבד, בלי טקסט מקורות.")
sleep 15
if gh pr checks "$URL" --watch --fail-fast >/dev/null 2>&1; then
  gh pr merge "$URL" --squash --delete-branch >/dev/null
  echo "$(date '+%F %T') merged $URL" >>"$LOG"
else
  echo "$(date '+%F %T') CI failed, left open: $URL" >>"$LOG"
  exit 1
fi
