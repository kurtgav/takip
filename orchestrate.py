#!/usr/bin/env python3
"""
TAKIP Orchestrator
==================
Drives two AI agents unattended until the hackathon deadline:

  * BUILDER (Codex)  - writes the app from PRD.md. Restarted automatically
                       whenever it stops, with a resume prompt.
  * DOCS (Hermes)    - writes docs / test plan / submission text on a timer.
  * GIT              - the orchestrator is the ONLY one that commits and
                       pushes, on a fixed interval (no lock fights).

Timeline (Asia/Manila, configurable in orchestrator.json):
  start -> build/resume loop -> FEATURE FREEZE (stabilize only)
        -> HARD STOP (agents killed, final build check, final commit + push)
        -> DEADLINE (you submit by hand)

Usage (run from your project folder, next to PRD.md):
  python orchestrate.py --check     # verify everything is ready
  python orchestrate.py             # start, then leave it running
  Ctrl+C                            # stop early (makes a final commit)

Standard library only. Works on Windows, macOS and Linux (Python 3.8+).
"""

import argparse
import json
import os
import shutil
import signal
import subprocess
import sys
import threading
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

MNL = timezone(timedelta(hours=8))  # Asia/Manila, no DST
ROOT = Path.cwd()
STATE_DIR = ROOT / ".orchestrator"
LOG_DIR = ROOT / "logs"
PROMPT_DIR = ROOT / "prompts"
DONE_FILE = ROOT / "ORCHESTRATOR_DONE.md"
STABLE_FILE = ROOT / "ORCHESTRATOR_STABLE.md"
STATUS_FILE = ROOT / "ORCHESTRATOR_STATUS.md"
GITIGNORE_LINES = [
    "eval/private/",
    "node_modules/",
    "dist/",
    "logs/",
    ".orchestrator/",
    ".env",
    ".env.*",
]
MAX_FILE_BYTES = 95 * 1024 * 1024  # GitHub rejects files over 100 MB

stop_event = threading.Event()
git_lock = threading.Lock()
procs_lock = threading.Lock()
running_procs = {}  # name -> Popen

state = {
    "started": None,
    "builder": "waiting",
    "builder_runs": 0,
    "builder_last_exit": "-",
    "docs": "waiting",
    "docs_runs": 0,
    "docs_last_exit": "-",
    "last_commit": "-",
    "last_push": "-",
    "last_verify": "-",
    "warnings": [],
}


# --------------------------------------------------------------------------- utils

def now():
    return datetime.now(MNL)


def fmt(dt):
    return dt.strftime("%b %d %H:%M")


def parse_time(value):
    dt = datetime.fromisoformat(value)
    return dt.replace(tzinfo=MNL) if dt.tzinfo is None else dt.astimezone(MNL)


def log(msg):
    line = f"[{now():%H:%M:%S}] {msg}"
    print(line, flush=True)
    try:
        LOG_DIR.mkdir(exist_ok=True)
        with open(LOG_DIR / "orchestrator.log", "a", encoding="utf-8") as fh:
            fh.write(line + "\n")
    except OSError:
        pass


def warn(msg):
    state["warnings"] = (state["warnings"] + [f"{now():%H:%M} {msg}"])[-8:]
    log("WARNING: " + msg)


def sleep_until(deadline_dt, step=5):
    """Sleep until a datetime or until stop is requested."""
    while not stop_event.is_set() and now() < deadline_dt:
        time.sleep(min(step, max(0.1, (deadline_dt - now()).total_seconds())))


def sleep_for(seconds):
    sleep_until(now() + timedelta(seconds=seconds))


def load_config(path):
    with open(path, encoding="utf-8") as fh:
        cfg = json.load(fh)
    for key in ("feature_freeze", "docs_final_run", "hard_stop", "deadline"):
        cfg[key] = parse_time(cfg[key])
    return cfg


# --------------------------------------------------------------------------- processes

def resolve_command(template, name, prompt_text):
    """Write the prompt to a file and build the command line.

    Placeholders in the command template:
      {prompt}       short one-line instruction pointing at the prompt file
                     (safe on Windows, where multi-line arguments break .cmd shims)
      {prompt_file}  absolute path of the prompt file
      {prompt_text}  the full prompt text as one argument
    """
    STATE_DIR.mkdir(exist_ok=True)
    pfile = STATE_DIR / f"{name}_prompt.md"
    pfile.write_text(prompt_text, encoding="utf-8")
    short = (
        f"Read the file .orchestrator/{name}_prompt.md in the current folder and "
        f"follow every instruction in it exactly. Work fully autonomously and never "
        f"ask questions or wait for confirmation."
    )
    cmd = []
    for part in template:
        part = part.replace("{prompt_file}", str(pfile))
        part = part.replace("{prompt_text}", prompt_text)
        part = part.replace("{prompt}", short)
        cmd.append(part)
    exe = shutil.which(cmd[0])
    if not exe:
        raise FileNotFoundError(f"'{cmd[0]}' not found on PATH")
    cmd[0] = exe  # resolves codex.cmd / hermes.exe on Windows
    return cmd


def kill_tree(proc):
    if proc.poll() is not None:
        return
    try:
        if os.name == "nt":
            subprocess.run(["taskkill", "/T", "/F", "/PID", str(proc.pid)],
                           capture_output=True)
        else:
            os.killpg(os.getpgid(proc.pid), signal.SIGTERM)
            try:
                proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                os.killpg(os.getpgid(proc.pid), signal.SIGKILL)
    except (ProcessLookupError, OSError):
        pass


def run_agent(name, cmd, timeout_s, run_no):
    """Run one agent session. Returns (exit_code, seconds)."""
    LOG_DIR.mkdir(exist_ok=True)
    logfile = LOG_DIR / f"{name}-{run_no:03d}.log"
    kwargs = {}
    if os.name == "nt":
        kwargs["creationflags"] = subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        kwargs["start_new_session"] = True
    start = time.monotonic()
    with open(logfile, "w", encoding="utf-8", errors="replace") as out:
        proc = subprocess.Popen(cmd, cwd=ROOT, stdout=out, stderr=subprocess.STDOUT,
                                stdin=subprocess.DEVNULL, **kwargs)
        with procs_lock:
            running_procs[name] = proc
        try:
            while proc.poll() is None:
                if stop_event.is_set():
                    log(f"{name}: stopping (orchestrator shutdown)")
                    kill_tree(proc)
                    break
                if time.monotonic() - start > timeout_s:
                    log(f"{name}: session time limit reached, restarting it")
                    kill_tree(proc)
                    break
                time.sleep(3)
            proc.wait()
        finally:
            with procs_lock:
                running_procs.pop(name, None)
    return proc.returncode, time.monotonic() - start


# --------------------------------------------------------------------------- prompts

def read_prompt(filename):
    return (PROMPT_DIR / filename).read_text(encoding="utf-8")


def time_header(cfg):
    return (
        "# ORCHESTRATOR CONTEXT\n"
        f"- Current time (Asia/Manila): {now():%Y-%m-%d %H:%M}\n"
        f"- Feature freeze: {cfg['feature_freeze']:%Y-%m-%d %H:%M}\n"
        f"- Hard stop (you will be shut down): {cfg['hard_stop']:%Y-%m-%d %H:%M}\n"
        f"- Submission deadline / code freeze: {cfg['deadline']:%Y-%m-%d %H:%M}\n"
        "- An orchestrator script runs you. It restarts you when you stop and it "
        "makes ALL git commits and pushes. Never run git commit, git push, git reset, "
        "git checkout or git stash.\n"
        "- Never edit orchestrate.py, orchestrator.json, ORCHESTRATOR_STATUS.md, "
        "or anything in prompts/, logs/ or .orchestrator/.\n\n"
    )


# --------------------------------------------------------------------------- git

def git(*args, timeout=300):
    return subprocess.run(["git", *args], cwd=ROOT, capture_output=True, text=True,
                          timeout=timeout)


def ensure_gitignore():
    gi = ROOT / ".gitignore"
    existing = gi.read_text(encoding="utf-8").splitlines() if gi.exists() else []
    missing = [line for line in GITIGNORE_LINES if line not in existing]
    if missing:
        with open(gi, "a", encoding="utf-8") as fh:
            if existing and existing[-1].strip():
                fh.write("\n")
            fh.write("# added by orchestrator\n" + "\n".join(missing) + "\n")


def ensure_repo():
    if not (ROOT / ".git").exists():
        git("init")
        log("git: initialised new repository")
    ensure_gitignore()


def checkpoint(label, push=True):
    with git_lock:
        try:
            ensure_gitignore()
            git("add", "-A")
            staged = git("diff", "--cached", "--name-only", "-z").stdout.split("\0")
            big = [p for p in staged if p and (ROOT / p).is_file()
                   and (ROOT / p).stat().st_size > MAX_FILE_BYTES]
            if big:
                with open(ROOT / ".gitignore", "a", encoding="utf-8") as fh:
                    fh.write("# too large for GitHub (orchestrator)\n")
                    for p in big:
                        git("rm", "--cached", "--quiet", "--", p)
                        fh.write(p + "\n")
                git("add", ".gitignore")
                warn(f"excluded {len(big)} file(s) over 95 MB from git: {', '.join(big)}")
            if git("diff", "--cached", "--quiet").returncode == 0:
                return  # nothing new
            res = git("commit", "-m", f"checkpoint: {label} ({now():%b %d %H:%M} PHT)")
            if res.returncode != 0:
                warn("git commit failed: " + (res.stderr or res.stdout).strip()[:200])
                return
            state["last_commit"] = f"{now():%H:%M} {label}"
            log(f"git: committed ({label})")
            if push and git("remote").stdout.strip():
                res = git("push", "-u", "origin", "HEAD", timeout=180)
                if res.returncode == 0:
                    state["last_push"] = f"{now():%H:%M} ok"
                else:
                    state["last_push"] = f"{now():%H:%M} FAILED"
                    warn("git push failed: " + res.stderr.strip()[:200])
        except Exception as exc:  # never let git kill the orchestrator
            warn(f"git checkpoint error: {exc}")


# --------------------------------------------------------------------------- verify

def verify_build(cfg, label):
    cmd = cfg.get("verify_command")
    if not cmd or not (ROOT / "package.json").exists():
        state["last_verify"] = f"{now():%H:%M} skipped (no package.json)"
        return
    exe = shutil.which(cmd[0])
    if not exe:
        state["last_verify"] = f"{now():%H:%M} skipped ({cmd[0]} not found)"
        return
    log(f"verify: running {' '.join(cmd)} ({label})")
    LOG_DIR.mkdir(exist_ok=True)
    with open(LOG_DIR / f"verify-{label}.log", "w", encoding="utf-8", errors="replace") as out:
        try:
            rc = subprocess.run([exe, *cmd[1:]], cwd=ROOT, stdout=out,
                                stderr=subprocess.STDOUT, timeout=900).returncode
        except subprocess.TimeoutExpired:
            rc = "timeout"
    result = "PASS" if rc == 0 else f"FAIL ({rc}) - see logs/verify-{label}.log"
    state["last_verify"] = f"{now():%H:%M} {label}: {result}"
    log(f"verify: {result}")


# --------------------------------------------------------------------------- workers

def builder_worker(cfg):
    c = cfg["codex"]
    timeout_s = c["session_timeout_minutes"] * 60
    stabilize_runs = 0
    fails = 0
    while not stop_event.is_set():
        t = now()
        if t >= cfg["hard_stop"]:
            break
        if t >= cfg["feature_freeze"] or DONE_FILE.exists():
            if STABLE_FILE.exists() or stabilize_runs >= c["max_stabilize_runs"]:
                state["builder"] = "finished (stable)" if STABLE_FILE.exists() else "finished"
                log("builder: finished, no more sessions")
                break
            phase, prompt_file = "stabilize", "codex_stabilize.md"
            stabilize_runs += 1
        elif (ROOT / "PROGRESS.md").exists():
            phase, prompt_file = "resume", "codex_resume.md"
        else:
            phase, prompt_file = "build", "codex_build.md"

        prompt = time_header(cfg) + read_prompt(prompt_file)
        if phase != "stabilize":
            # never let a build session run past the feature freeze
            limit = min(timeout_s, (cfg["feature_freeze"] - t).total_seconds() + 60)
        else:
            limit = min(timeout_s, (cfg["hard_stop"] - t).total_seconds())
        try:
            cmd = resolve_command(c["command"], "codex", prompt)
        except FileNotFoundError as exc:
            state["builder"] = "ERROR: codex not found"
            warn(str(exc))
            return
        state["builder_runs"] += 1
        state["builder"] = f"running ({phase}) since {now():%H:%M}"
        log(f"builder: session #{state['builder_runs']} started ({phase})")
        rc, dur = run_agent("codex", cmd, max(60, limit), state["builder_runs"])
        state["builder_last_exit"] = f"{now():%H:%M} code {rc} after {dur/60:.0f} min"
        log(f"builder: session ended, code {rc}, {dur/60:.1f} min")
        checkpoint(f"builder session {state['builder_runs']} ({phase})", cfg["git"]["push"])

        if stop_event.is_set():
            break
        if rc != 0 and dur < 120:
            fails += 1
            wait = min(30 * 2 ** fails, 600)
            state["builder"] = f"crashed quickly, retrying in {wait}s"
            warn(f"builder exited fast with code {rc} (check logs/codex-"
                 f"{state['builder_runs']:03d}.log). Retry in {wait}s")
            sleep_for(wait)
        else:
            fails = 0
            state["builder"] = "restarting"
            sleep_for(10)
    if state["builder"].startswith("running") or state["builder"] == "restarting":
        state["builder"] = "stopped"


def docs_worker(cfg):
    h = cfg["hermes"]
    timeout_s = h["session_timeout_minutes"] * 60
    next_run = now() + timedelta(minutes=h["first_run_delay_minutes"])
    final_done = False
    fails = 0
    while not stop_event.is_set():
        target = next_run if final_done else min(next_run, cfg["docs_final_run"])
        state["docs"] = f"next run {target:%H:%M}"
        sleep_until(target)
        if stop_event.is_set() or now() >= cfg["hard_stop"]:
            break
        final_due = not final_done and now() >= cfg["docs_final_run"]
        try:
            cmd = resolve_command(h["command"], "hermes",
                                  time_header(cfg) + read_prompt("hermes_docs.md"))
        except FileNotFoundError as exc:
            state["docs"] = "ERROR: hermes not found"
            warn(str(exc))
            return
        state["docs_runs"] += 1
        label = "final" if final_due else "update"
        state["docs"] = f"running ({label}) since {now():%H:%M}"
        log(f"docs: session #{state['docs_runs']} started ({label})")
        limit = min(timeout_s, (cfg["hard_stop"] - now()).total_seconds())
        rc, dur = run_agent("hermes", cmd, max(60, limit), state["docs_runs"])
        state["docs_last_exit"] = f"{now():%H:%M} code {rc} after {dur/60:.0f} min"
        log(f"docs: session ended, code {rc}, {dur/60:.1f} min")
        checkpoint(f"docs session {state['docs_runs']} ({label})", cfg["git"]["push"])
        if final_due:
            final_done = True
        if rc != 0 and dur < 120:
            fails += 1
            next_run = now() + timedelta(seconds=min(60 * 2 ** fails, 1800))
            warn(f"docs agent exited fast with code {rc} (check logs/hermes-"
                 f"{state['docs_runs']:03d}.log)")
        else:
            fails = 0
            next_run = now() + timedelta(minutes=h["interval_minutes"])
        if final_done and next_run >= cfg["hard_stop"]:
            state["docs"] = "finished"
            break


def git_worker(cfg):
    interval = timedelta(minutes=cfg["git"]["checkpoint_minutes"])
    while not stop_event.is_set():
        sleep_for(interval.total_seconds())
        if not stop_event.is_set():
            checkpoint("periodic", cfg["git"]["push"])


# --------------------------------------------------------------------------- status

def write_status(cfg):
    t = now()

    def left(dt):
        s = int((dt - t).total_seconds())
        return "passed" if s <= 0 else f"{s // 3600}h {s % 3600 // 60:02d}m left"

    warnings = "\n".join(f"- {w}" for w in state["warnings"]) or "- none"
    STATUS_FILE.write_text(
        "# Orchestrator status\n\n"
        f"Updated: {t:%Y-%m-%d %H:%M:%S} (Asia/Manila)\n\n"
        "| Milestone | Time | Remaining |\n|---|---|---|\n"
        f"| Feature freeze | {fmt(cfg['feature_freeze'])} | {left(cfg['feature_freeze'])} |\n"
        f"| Hard stop | {fmt(cfg['hard_stop'])} | {left(cfg['hard_stop'])} |\n"
        f"| Deadline (submit) | {fmt(cfg['deadline'])} | {left(cfg['deadline'])} |\n\n"
        "| Worker | State | Sessions | Last exit |\n|---|---|---|---|\n"
        f"| Builder (Codex) | {state['builder']} | {state['builder_runs']} | {state['builder_last_exit']} |\n"
        f"| Docs (Hermes) | {state['docs']} | {state['docs_runs']} | {state['docs_last_exit']} |\n\n"
        f"- Builder reported done: {'yes' if DONE_FILE.exists() else 'no'}\n"
        f"- Builder reported stable: {'yes' if STABLE_FILE.exists() else 'no'}\n"
        f"- Last commit: {state['last_commit']}\n"
        f"- Last push: {state['last_push']}\n"
        f"- Last build check: {state['last_verify']}\n\n"
        f"## Warnings\n{warnings}\n\n"
        "Agent output: logs/ (codex-NNN.log, hermes-NNN.log, orchestrator.log)\n",
        encoding="utf-8",
    )


# --------------------------------------------------------------------------- check

def check(cfg):
    ok = True

    def item(passed, text, hint=""):
        nonlocal ok
        mark = "OK  " if passed else ("WARN" if hint.startswith("optional") else "FAIL")
        if mark == "FAIL":
            ok = False
        print(f"  [{mark}] {text}" + (f"  -> {hint}" if not passed and hint else ""))

    print("TAKIP orchestrator pre-flight check\n")
    item(sys.version_info >= (3, 8), f"Python {sys.version.split()[0]}", "need Python 3.8+")
    item((ROOT / "PRD.md").exists(), "PRD.md in this folder", "copy PRD.md here")
    for f in ("codex_build.md", "codex_resume.md", "codex_stabilize.md", "hermes_docs.md"):
        item((PROMPT_DIR / f).exists(), f"prompts/{f}", "copy the prompts folder here")
    item(bool(shutil.which("git")), "git installed", "install git")
    if shutil.which("git"):
        name = git("config", "user.name").stdout.strip()
        email = git("config", "user.email").stdout.strip()
        item(bool(name and email), "git user.name / user.email set",
             'git config --global user.name "You" && git config --global user.email you@example.com')
        if (ROOT / ".git").exists():
            item(bool(git("remote").stdout.strip()), "git remote 'origin' set",
                 "optional: create the GitHub repo and run git remote add origin <url>")
    for agent in ("codex", "hermes"):
        if cfg[agent]["enabled"]:
            exe = cfg[agent]["command"][0]
            item(bool(shutil.which(exe)), f"{agent}: '{exe}' on PATH",
                 f"install {agent} or fix the command in orchestrator.json")
    for tool in ("node", "npm"):
        item(bool(shutil.which(tool)), f"{tool} installed", "install Node.js LTS")
    t = now()
    item(cfg["feature_freeze"] < cfg["hard_stop"] <= cfg["deadline"],
         "freeze < hard stop <= deadline", "fix times in orchestrator.json")
    item(t < cfg["hard_stop"], f"now {t:%b %d %H:%M} is before hard stop "
         f"{fmt(cfg['hard_stop'])}", "update the times in orchestrator.json")
    print("\nCommands that will be used:")
    for agent in ("codex", "hermes"):
        if cfg[agent]["enabled"]:
            print(f"  {agent}: {' '.join(cfg[agent]['command'])}")
    print("\n" + ("READY. Start with: python orchestrate.py" if ok
                  else "Fix the FAIL items above, then run --check again."))
    return 0 if ok else 1


# --------------------------------------------------------------------------- main

def shutdown(cfg, reason):
    if stop_event.is_set():
        return
    log(f"shutting down: {reason}")
    stop_event.set()
    with procs_lock:
        procs = list(running_procs.values())
    for p in procs:
        kill_tree(p)


def main():
    ap = argparse.ArgumentParser(description="TAKIP hackathon orchestrator")
    ap.add_argument("--config", default="orchestrator.json")
    ap.add_argument("--check", action="store_true", help="pre-flight check only")
    ap.add_argument("--no-push", action="store_true", help="commit but never push")
    args = ap.parse_args()

    cfg = load_config(ROOT / args.config)
    if args.no_push:
        cfg["git"]["push"] = False
    if args.check:
        sys.exit(check(cfg))

    if now() >= cfg["hard_stop"]:
        sys.exit("Hard stop time has already passed. Update orchestrator.json.")

    LOG_DIR.mkdir(exist_ok=True)
    STATE_DIR.mkdir(exist_ok=True)
    ensure_repo()
    state["started"] = now()
    log(f"orchestrator started. Freeze {fmt(cfg['feature_freeze'])}, "
        f"hard stop {fmt(cfg['hard_stop'])}, deadline {fmt(cfg['deadline'])}")
    checkpoint("orchestrator start", cfg["git"]["push"])

    threads = [threading.Thread(target=git_worker, args=(cfg,), daemon=True)]
    if cfg["codex"]["enabled"]:
        threads.append(threading.Thread(target=builder_worker, args=(cfg,), daemon=True))
    else:
        state["builder"] = "disabled"
    if cfg["hermes"]["enabled"]:
        threads.append(threading.Thread(target=docs_worker, args=(cfg,), daemon=True))
    else:
        state["docs"] = "disabled"
    for th in threads:
        th.start()

    freeze_verified = False
    try:
        while True:
            write_status(cfg)
            t = now()
            if not freeze_verified and t >= cfg["feature_freeze"]:
                freeze_verified = True
                log("FEATURE FREEZE reached: builder switches to stabilize-only")
                threading.Thread(target=verify_build, args=(cfg, "freeze"),
                                 daemon=True).start()
            if t >= cfg["hard_stop"]:
                shutdown(cfg, "hard stop reached")
                break
            time.sleep(15)
    except KeyboardInterrupt:
        shutdown(cfg, "Ctrl+C")

    for th in threads:
        if th.name != threads[0].name:
            th.join(timeout=30)
    verify_build(cfg, "final")
    checkpoint("final (orchestrator stop)", cfg["git"]["push"])
    write_status(cfg)
    log("orchestrator stopped. Final status written to ORCHESTRATOR_STATUS.md")
    print(
        "\nNEXT (you): check the repo is PUBLIC and has no personal data, record the "
        "~1 min demo video, post on X/LinkedIn (tag Devin/Cognition, #AppBuildersPH), "
        f"and submit ONCE before {fmt(cfg['deadline'])}."
    )


if __name__ == "__main__":
    main()
