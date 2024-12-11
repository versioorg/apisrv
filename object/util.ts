async function fileExists(path: string): Promise<boolean> {
  try {
    await Deno.lstat(path);
    return true;
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) {
      throw err;
    }
    console.log("not exists!");
    return false;
  }
}

export { fileExists };
