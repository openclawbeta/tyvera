import { spawn } from "node:child_process";

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "inherit", shell: false });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
    });
    child.on("error", reject);
  });
}

async function main() {
  await run("python3", ["scripts/fetch_subnets_subtensor.py"]);
  await run("node", ["scripts/build-validator-snapshot.mjs"]);
  await run("node", ["scripts/build-holder-attribution.mjs"]);

  if (process.env.TAO_APP_API_KEY) {
    try {
      await run("node", ["scripts/build-holder-snapshot-from-tao-app.mjs"]);
      return;
    } catch (err) {
      console.warn("[refresh-intel] TAO.app holder snapshot failed, falling back to default builder:", err?.message ?? err);
    }
  }

  await run("node", ["scripts/build-holder-snapshot.mjs"]);
}

main().catch((err) => {
  console.error("[refresh-intel] failed:", err);
  process.exit(1);
});
