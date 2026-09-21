"""15-day Cursor SDK orchestration for remaining cloud/demo work.

The core product lives in this repo. Use this script only when you have a
CURSOR_API_KEY and want Cloud Agents to continue EC2 deploy, demo capture,
or prompt experiments. Always set cloud= explicitly so you do not silently
get a local agent.

Usage:
  export CURSOR_API_KEY=cursor_...
  python orchestration/cursor_sdk_15day.py --prompt "Deploy compose on EC2 using aws/deploy_ec2.sh"
"""

from __future__ import annotations

import argparse
import os
import sys

from cursor_sdk import Agent, CloudAgentOptions, CursorAgentError


REPO = "https://github.com/Skrishna12/Autonomous-Sports-Commentary"


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--prompt", required=True)
    parser.add_argument("--model", default="composer-2.5")
    parser.add_argument("--ref", default="main")
    args = parser.parse_args()
    api_key = os.environ.get("CURSOR_API_KEY")
    if not api_key:
        print("CURSOR_API_KEY is required", file=sys.stderr)
        return 1
    try:
        with Agent.create(
            model=args.model,
            api_key=api_key,
            cloud=CloudAgentOptions(
                repos=[{"url": REPO, "ref": args.ref}],
                auto_create_pr=True,
                skip_reviewer_request=True,
            ),
        ) as agent:
            print("agent_id", agent.agent_id)
            run = agent.send(args.prompt)
            print("run_id", run.id)
            result = run.wait()
            if result.status == "error":
                print("run failed:", result.id, file=sys.stderr)
                return 2
            print(result.status, result.result)
            return 0
    except CursorAgentError as err:
        print(
            "startup failed:",
            err.message,
            "retryable=",
            err.is_retryable,
            file=sys.stderr,
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
