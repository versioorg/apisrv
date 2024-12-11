// deno-lint-ignore-file no-explicit-any
import { keypress, KeyPressEvent } from "https://deno.land/x/cliffy@v1.0.0-rc.3/keypress/mod.ts";
import { GraphQLHTTP } from "https://deno.land/x/gql@1.2.4/mod.ts";
import { makeExecutableSchema } from "npm:@graphql-tools/schema@10.0.0";
import { parseArgs } from "jsr:@std/cli/parse-args";
import currConJSON from "./config.ts";

try {
  addEventListener("unhandledrejection", (event) => {
    console.error("Unhandled rejection:", event.reason);
    // Zapobiegaj domyślnemu zamknięciu procesu
    event.preventDefault();
  });

  addEventListener("error", (event) => {
    console.error("Global error:", event.message);
    event.preventDefault();
  });

  const flags = parseArgs(Deno.args, {
    string: ["request"],
  });

  const dynModules = {} as any;
  let dynModulesList = [] as any;

  const cwd = Deno.cwd();

  let objectPath;
  if (currConJSON.objectPath) {
    objectPath = currConJSON.objectPath;
  } else {
    objectPath = "./object/";
  }

  dynModulesList = currConJSON.dynModulesList;

  for (const i in dynModulesList) {
    const dynModule = await import(objectPath + dynModulesList[i] + ".ts");
    dynModules[dynModulesList[i]] = dynModule.main;
  }

  for (const value of ["./tmp", "./queue/todo", "./queue/work", "./queue/done", "./queue/arch"]) {
    await Deno.mkdir(value, { recursive: true });
  }

  if (flags.request) {
    try {
      const todoText = await Deno.readTextFile(`${cwd}/queue/todo/${flags.request}.json`);
      const todoJson = JSON.parse(todoText);
      const retCompanyInfo = await dynModules[todoJson.method](undefined, todoJson);
      await Deno.writeTextFile(`${cwd}/queue/done/${flags.request}.json`, JSON.stringify({ result: retCompanyInfo }));

      try {
        await Deno.rename(`${cwd}/queue/todo/${flags.request}.json`, `${cwd}/queue/arch/todo_${flags.request}.json`);
      } catch (err) {
        console.error(err);
      }
    } catch (e) {
      console.log(e);
      await Deno.writeTextFile(`${cwd}/queue/done/${flags.request}.json`, JSON.stringify({ error: e }));
    }
    Deno.exit();
  }

  const watcher = Deno.watchFs(`${cwd}/queue/todo/`);

  let typeDefs = `
  scalar JSON
  type Query {
    test1(params: JSON): JSON  
  `;

  for (const i in dynModulesList) {
    typeDefs += "  " + dynModulesList[i] + "(params: JSON!): JSON\n";
  }

  typeDefs = typeDefs + `}`;

  const resolvers = {
    Query: {
      test1: (arg1: any, arg2: any, context: any, info: any) => test1(arg1, arg2, context, info),
      //test1: () => test1(),
    } as any,
  } as any;

  for (const i in dynModulesList) {
    resolvers.Query[dynModulesList[i]] = dynModules[dynModulesList[i]];
  }

  const schema = makeExecutableSchema({ resolvers, typeDefs });

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Content-Length, X-Requested-With",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Credentials": "true",
  };

  Deno.serve(
    {
      hostname: "0.0.0.0",
      port: currConJSON.port | 3001,
      cert: currConJSON.design === true ? undefined : await Deno.readTextFile("./config/cert/cert.pem"),
      key: currConJSON.design === true ? undefined : await Deno.readTextFile("./config/cert/key.pem"),
      onListen({ hostname, port }) {
        console.log(`☁  Started on http://${hostname}:${port}/graphql`);
      },
    },
    async (req: any, info: any) => {
      const { pathname } = new URL(req.url);
      console.log(`remoteAddr: ${info.remoteAddr.hostname} url: ${req.url} method: ${req.method}`);

      if (req.method === "OPTIONS") {
        return new Response("ok", { status: 200, headers });
      }

      if (pathname === "/graphql") {
        let ret = await GraphQLHTTP<Request>({ schema, graphiql: true })(req);
        ret = new Response(ret.body, { ...ret, headers: { ...ret.headers, ...headers } });
        return ret;
      }

      return new Response("Not Found", { status: 404 });
    }
  );

  const keyMenu = currConJSON.keyMenu;
  if (keyMenu) {
    keypress().addEventListener("keydown", async (event: KeyPressEvent) => {
      if (event.key?.toLowerCase() === "s") {
        await console.log("*************************************************************************************");
        console.log("* Status ****************************************************************************");
        console.log("*************************************************************************************");
      }
      if (event.key?.toLowerCase() === "u") {
        console.log("*************************************************************************************");
        console.log("* UPO *******************************************************************************");
        console.log("*************************************************************************************");
      }
      if ((event.ctrlKey && event.key === "c") || event.key === "k") {
        console.log("*************************************************************************************");
        console.log("* Koniec sesji **********************************************************************");
        console.log("*************************************************************************************");
        keypress().dispose();
        Deno.exit(0);
      }
    });
  }

  if (keyMenu) {
    console.log(`Aplikacja oczekuje na zadania:
    s - status
    u - zakończ sesję 
    k - zakończenie aplikacji
  `);
  } else {
    console.log(`Aplikacja oczekuje na zadania`);
  }

  for await (const event of watcher) {
    switch (event.kind) {
      case "create":
        for (const i in event.paths) {
          const path = event.paths[i];
          const pathWithoutExt = `${path.replace(".json", "")}`;
          const time = new Date().toJSON().replace(/-/g, "").replace(/T/, "_").replace(/Z/, "").replace(/:/g, "").replace(/\./g, "_");

          if (path.indexOf(".json") >= 0) {
            await todo(pathWithoutExt, time);
          }
        }
        break;
    }
  }
  console.log("Zakończenie pracy");
} catch (e) {
  console.error("Critical error in application:", e);
}

async function todo(pathWithoutExt: string, _time: string) {
  const todoText = await Deno.readTextFile(`${pathWithoutExt}.json`);
  const todoJSON = JSON.parse(todoText);
  switch (todoJSON.method) {
    case "test1":
      await test1(null, null, null, null);
      break;
  }
}

// W przypadku wywołania w resolverze GraphQL, przekazywana funkcja wygląda tak:
// test1: (arg1: any, arg2: any, context: any, info: any) => test1(arg1, arg2, context, info),
// Resolver GraphQL standardowo przekazuje następujące argumenty:
// root lub parent: Zazwyczaj wynik z poprzedniego resolvera w GraphQL (tutaj arg1).
// args: Parametry przekazane w zapytaniu GraphQL (params w Twojej funkcji).
// context: Kontekst GraphQL (np. dane użytkownika lub sesji, tu przypisane do context).
// info: Informacje o zapytaniu GraphQL (nie jest tu używane, przypisane do info).

// Dlaczego arg1 jest domyślnie niezdefiniowany?
// W GraphQL resolverze dla zapytań Query pierwszy argument (root) jest zwykle pusty lub undefined, ponieważ w zapytaniach Query nie ma kontekstu rodzica. Możesz to zmienić, jeśli test1 wymaga konkretnej wartości jako arg1.

function test1(arg1: any, params: any, context: any, info: any) {
  try {
    console.log(`test1`, arg1, params, context, info);
  } catch (e) {
    console.log(e);
  }
}
