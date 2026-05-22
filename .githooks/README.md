Local git hook setup

This repository uses a repo-local pre-push hook to write a separate history file per remote.

Where files are written:
- .local/commit-history/goodyear.log
- .local/commit-history/origin.log
- .local/commit-history/personal.log

Log format:
timestamp|remote|branch|commit|subject

Enable hook path in this repository clone:
git config core.hooksPath .githooks

Notes:
- Files under .local/commit-history are ignored by git and stay local to your machine.
- The hook appends only commits being pushed for each remote and avoids duplicate commit hashes.