import { parseArgs } from "jsr:@std/cli/parse-args";

// deno-lint-ignore no-explicit-any
let currConJSON: any;
const cwd = Deno.cwd();

try {
  if (!currConJSON) {
    let configPath;
    const flags = parseArgs(Deno.args, {
      string: ["config"],
    });

    if (flags.config) {
      // ok
      configPath = flags.config;
    } else {
      configPath = `${cwd}/config.json`;
    }
    const currConfText = await Deno.readTextFile(configPath);
    currConJSON = JSON.parse(currConfText);
  }
} catch (err) {
  if (!(err instanceof Deno.errors.NotFound)) {
    throw err;
  }
  console.warn("warning: config.json not exists");
}

export default currConJSON;
