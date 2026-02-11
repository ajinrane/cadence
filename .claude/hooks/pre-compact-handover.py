#!/usr/bin/env python3
"""
Pre-compact handover hook.
Triggered automatically before Claude Code compacts the conversation.
Reads the full transcript, sends it to Claude for summarization,
and saves the result as a HANDOVER doc in the project root.
"""
import subprocess
import sys
from datetime import datetime
def main():
    transcript = sys.stdin.read()

    if not transcript.strip():
        print("No transcript provided, skipping handover generation.")
        return

    timestamp = datetime.now().strftime("%Y-%m-%d-%H%M")
    filename = f"HANDOVER-{timestamp}.md"

    prompt = f"""You are generating a handover document for a coding session that is about to be compacted.
This document will be used to restore context in future sessions.
Summarize the following conversation transcript into a structured handover document with these sections:
## Session Summary
Brief overview of what was accomplished.
## Changes Made
List every file that was created, modified, or deleted and what changed.
## Key Decisions
Any architectural or design decisions made and the reasoning.
## Current State
What's working, what's broken, what's in progress.
## Open Issues
Any bugs, errors, or unfinished work.
## Next Steps
What should be done next based on where the session left off.
## Important Context
Anything else a fresh Claude Code session would need to know to continue seamlessly.
Be specific and detailed — this is the only record of what happened in this session.
TRANSCRIPT:
{transcript}"""
    try:
        result = subprocess.run(
            ["claude", "-p", prompt],
            capture_output=True,
            text=True,
            timeout=120
        )

        if result.returncode == 0 and result.stdout.strip():
            handover_content = f"# Handover — {timestamp}\n\nAuto-generated before context compaction.\n\n{result.stdout.strip()}"
            with open(filename, "w") as f:
                f.write(handover_content)
            print(f"Handover document saved: {filename}")
        else:
            fallback = f"# Handover — {timestamp}\n\nAuto-generation failed. Raw transcript tail:\n\n{transcript[-5000:]}"
            with open(filename, "w") as f:
                f.write(fallback)
            print(f"Fallback handover saved: {filename}")

    except subprocess.TimeoutExpired:
        fallback = f"# Handover — {timestamp}\n\nGeneration timed out. Raw transcript tail:\n\n{transcript[-5000:]}"
        with open(filename, "w") as f:
            f.write(fallback)
    except FileNotFoundError:
        fallback = f"# Handover — {timestamp}\n\nClaude CLI not available. Raw transcript tail:\n\n{transcript[-5000:]}"
        with open(filename, "w") as f:
            f.write(fallback)
if __name__ == "__main__":
    main()