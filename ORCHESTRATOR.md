# TAKIP Orchestrator: How to Run

One script runs everything until the deadline. You start it once and leave it.

| What | Who does it |
|---|---|
| Writes the app from `PRD.md`, restarted automatically whenever it stops | **Codex** (builder) |
| Writes test plan, demo script, judge Q&A, submission text, social post (every 2 h + a final run) | **Hermes** (docs) |
| Commits every 20 min and pushes to GitHub, blocks files over 95 MB, keeps `eval/private/` out of git | **Orchestrator** |
| Switches Codex to "stabilize only" at the feature freeze | **Orchestrator** |
| Kills agents at the hard stop, runs a final build check, makes the final commit and push | **Orchestrator** |
| Records the video, posts it, submits once | **You** |

## Timeline (Asia/Manila, edit in `orchestrator.json`)

| Time | What happens |
|---|---|
| Start | Codex builds (phases 1–7 from the PRD); Hermes starts 15 min later |
| **07:00** | Feature freeze: Codex only fixes bugs and finishes docs |
| 07:15 | Hermes final docs run |
| **09:15** | Hard stop: agents stopped, final `npm run build` check, final commit + push |
| **10:00** | Deadline. Submit before this. |

> Want to record the video earlier? Move `feature_freeze` to 06:00 and `hard_stop` to 08:00.

---

## Setup (15 minutes)

**1. Put the kit in your project folder.** Unzip it so the folder looks like this:
```
takip/
├─ orchestrate.py
├─ orchestrator.json
├─ ORCHESTRATOR.md
├─ PRD.md
└─ prompts/
   ├─ codex_build.md
   ├─ codex_resume.md
   ├─ codex_stabilize.md
   └─ hermes_docs.md
```

**2. Create the GitHub repo and connect it** (create it empty on github.com first):
```bash
cd takip
git init
git remote add origin https://github.com/YOUR-NAME/takip.git
```
Make sure `git push` works from this folder once (sign in if asked), or pushes will fail overnight.

**3. Test each agent by hand once** with a tiny task. This confirms the commands in `orchestrator.json` are right for your installed versions:
```bash
codex exec --full-auto "Create a file hello.txt containing hi"
hermes chat -q "Create a file hello2.txt containing hi"
```
- If either command fails, run `codex exec --help` / `hermes --help` and fix the `"command"` lines in `orchestrator.json`. Keep `{prompt}` as the last item; the script replaces it with the instruction.
- Hermes must run **without asking for approval** (check its help/config for an auto-approve or "yolo" option) and must be set to **DeepSeek V4.1 Flash**.
- Delete `hello.txt` and `hello2.txt` afterwards.

**4. Run the pre-flight check:**
```bash
python orchestrate.py --check
```
(On Windows use `py orchestrate.py --check` if `python` isn't found.) Fix every `FAIL`.

**5. Stop the laptop from sleeping and keep it plugged in.**
- Windows: Settings → System → Power → Sleep: **Never**
- Mac: run `caffeinate -dis` in another terminal

## Start
```bash
python orchestrate.py
```
Leave the window open. That's it.

## While it runs
- Open **`ORCHESTRATOR_STATUS.md`** any time: timers, what each agent is doing, last commit/push, last build check, warnings. It updates every 15 seconds.
- Agent output is in `logs/` (`codex-001.log`, `hermes-001.log`, `orchestrator.log`).
- Codex progress is in `PROGRESS.md` and `DECISIONS.md`.
- **Don't edit files Codex is working on.** Test the app in your browser and on your phone instead.

## Stop early
Press **Ctrl+C** once. It stops both agents, runs a build check, and makes a final commit and push.
To restart, run `python orchestrate.py` again: Codex resumes from `PROGRESS.md`.

## Your checkpoints
| Time | You |
|---|---|
| ~1:00 AM | `npm install` then `npm run dev`; try it on your phone; test airplane mode |
| ~3:00 AM | Test with your own photos in `eval/private/` (never committed) |
| 07:15 | Read `docs/demo-script.md`; record the ~1 min video |
| 08:00 | Post on X/LinkedIn (`docs/social-post.md`): tag Devin/Cognition, #AppBuildersPH |
| 09:15 | Orchestrator stops. Check the repo is **public** with no personal data |
| Before 10:00 | Submit **once** using `docs/submission.md` |

## Troubleshooting
| Symptom in status / logs | Fix |
|---|---|
| `codex: ... not found on PATH` | Install Codex CLI, or put the full path in `orchestrator.json` |
| Codex fails on `npm install` or downloads (no network) | Change the codex command to `["codex", "exec", "--dangerously-bypass-approvals-and-sandbox", "{prompt}"]` |
| `builder exited fast with code ...` repeatedly | Open the named log in `logs/`. Usually login, rate limit or a wrong flag. The script retries with growing waits. |
| `git push failed` | Run `git push` yourself once to sign in; the next checkpoint pushes everything |
| `git commit failed` | Set your name/email: `git config --global user.name "You"` and `git config --global user.email you@example.com` |
| `excluded ... over 95 MB` | Expected for big model files. Codex is told to load those on first launch instead |

## Disclosure
This script is an AI development tool. List it in your submission next to OpenAI Codex and Hermes (DeepSeek V4.1 Flash). `docs/submission.md` already includes it.
