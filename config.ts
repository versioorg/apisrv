// deno-lint-ignore no-explicit-any
let currConJSON: any;
const cwd = Deno.cwd();

try {
  if (!currConJSON) {
    const currConfText = await Deno.readTextFile(`${cwd}/config.json`);
    currConJSON = JSON.parse(currConfText);
  }
} catch (err) {
  if (!(err instanceof Deno.errors.NotFound)) {
    throw err;
  }
  console.log("warning: config.json not exists");
}

export default currConJSON;
