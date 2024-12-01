// deno-lint-ignore-file no-explicit-any
import * as modCrypto from "https://deno.land/std@0.211.0/crypto/mod.ts";
//import passwordGenerator from "npm:password-generator";
import { format } from "https://deno.land/std@0.224.0/datetime/format.ts";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";
import currConJSON from "../config.ts";

currConJSON.sessionDir = currConJSON.sessionDir || "./config/session";
currConJSON.userDir = currConJSON.userDir || "./config/user";

async function main(_param: any, param2: any) {
  try {
    console.log(`param2: ${JSON.stringify(param2)}`);

    for (const value of ["./config/user", "./config/session", "./config/file"]) {
      await Deno.mkdir(value, { recursive: true });
    }

    switch (param2.params.type) {
      case "login": {
        await Deno.lstat(currConJSON.userDir + "/" + param2.params.user + ".json");
        console.log("exists!");

        const userContents = await Deno.readTextFile(currConJSON.userDir + "/" + param2.params.user + ".json");
        const userJSON = JSON.parse(userContents);

        const hashNew = await hash(
          { password: param2.params.pass },
          {
            withHash: false,
          }
        );
        console.log(hashNew);

        if (userJSON.hash === hashNew) {
          if (userJSON.isActivated !== true) {
            throw new Error("#userMsg Konto użytkownika nie zostało aktywowane, sprawdź email, aktywuj i zaloguj się ponownie. https://phototag.versio.org/activate");
          }
          const { error: error, sessionId: sessionId, cwid: cwid } = await sessionCreate(param2.params);
          if (error) {
            alert(error);
            return { ok: false, info: "notok" };
          } else {
            return {
              ok: true,
              info: "ok",
              sessionId: sessionId,
              cwid: cwid,
            };
          }
        } else {
          //return { "ok": false, "info": "Błąd logowania" };
          throw new Error("#userMsg Błąd logowania");
        }
      }

      case "session": {
        const sessionContentsJSON = await sessionCheck(param2.params.sessionId, param2.params.cwid);
        return { ok: true, user: sessionContentsJSON.user };
      }

      case "logout":
        try {
          await Deno.rename(currConJSON.sessionDir + "/" + param2.params.sessionId + "." + param2.params.cwid, currConJSON.sessionDir + "/" + param2.params.sessionId + "." + param2.params.cwid + ".logged_out");
        } catch (err) {
          console.log(err);
          //return { "ok": false, "info": "Logout error" };
          throw new Error("#userMsg Logout error");
        }
        return { ok: true };

      case "register":
        try {
          if (param2.params.passNew) {
            // ok
          } else {
            throw new Error("#userMsg Register error");
          }
          const hashNew = await hash(
            { password: param2.params.passNew },
            {
              withHash: false,
            }
          );
          console.log(hashNew);

          const user = {
            hash: hashNew,
            activateToken: crypto.randomUUID(),
            //expires: "2025-01-01",
            created: format(new Date(), "yyyy-MM-dd_HH:mm"),
            isActivated: false,
          };

          await Deno.writeTextFile(`${currConJSON.userDir}/${param2.params.user}.json`, JSON.stringify(user, undefined, "  "), { createNew: true });

          // utworzenie domyślnych tagów
          const path = `./config/file/${param2.params.user}/`;
          await Deno.mkdir(`${path}/Faktury firma`, { recursive: true });
          await Deno.mkdir(`${path}/Zakupy domowe`, { recursive: true });

          await sendEmail(
            param2.params.user,
            "photoTag: Aktywacja konta",
            `
            <p>
            Aktywacja konta: ${param2.params.user}<br />
            Token aktywacji: ${user.activateToken}<br /><br />

            <a href=https://phototag.versio.org/activate?token=${user.activateToken}&user=${param2.params.user}>Aktywacja automatyczna</a></p>`
          );

          const { error: error, sessionId: sessionId, cwid: cwid } = await sessionCreate(param2.params);
          if (error) {
            console.log(error);
            throw new Error("#userMsg Wystąpił błąd podczas rejestracji użytkownika");
          } else {
            return {
              ok: true,
              info: "ok",
              sessionId: sessionId,
              cwid: cwid,
            };
          }
        } catch (e) {
          console.log(e);
          throw new Error("#userMsg Register error");
        }

      case "forgot":
        try {
          // const passNew = passwordGenerator();
          // console.log(`passNew ${passNew}`);
          // const hashNew = await hash(
          //   { password: passNew },
          //   {
          //     withHash: false,
          //   }
          // );

          const userJson = JSON.parse(await Deno.readTextFile(`${currConJSON.userDir}/${param2.params.user}.json`));
          //userJson.hash = hashNew;

          userJson.passRecoveryToken = crypto.randomUUID();
          userJson.passRecoveryCreated = format(new Date(), "yyyy-MM-dd_HH:mm");
          // //expires: "2025-01-01",
          // created: format(new Date(), "yyyy-MM-dd_HH:mm"),
          // isActivated: false,

          //          await Deno.writeTextFile(`${currConJSON.userDir}/${param2.params.user}.json`, JSON.stringify(userJson, undefined, "  "), { createNew: true });

          const time = format(new Date(), "yyyy-MM-dd_HHmmss_SSS");
          const pathLog = `./log/update_log/`;
          await Deno.mkdir(pathLog, { recursive: true });
          await Deno.rename(`${currConJSON.userDir}/${param2.params.user}.json`, `${pathLog}/user_update_${param2.params.user}_${time}.json`);

          await Deno.writeTextFile(`${currConJSON.userDir}/${param2.params.user}.json`, JSON.stringify(userJson, undefined, "  "));

          await sendEmail(param2.params.user, "photoTag: Odzyskanie hasła", `<p>Login: ${param2.params.user}<br /><br /><a href=https://phototag.versio.org/recovery?token=${userJson.passRecoveryToken}&user=${param2.params.user}>Ustaw hasło</a></p>`);
          return { ok: true, info: "ok" };
        } catch (e) {
          console.log(e);
          throw new Error("#userMsg Retrieve login error");
        }

      case "recovery":
        try {
          const hashNew = await hash({ password: param2.params.password }, { withHash: false });
          const userJson = JSON.parse(await Deno.readTextFile(`${currConJSON.userDir}/${param2.params.user}.json`));

          userJson.hash = hashNew;
          userJson.passRecoveryToken = undefined;
          userJson.passRecoveryCreated = undefined;

          const time = format(new Date(), "yyyy-MM-dd_HHmmss_SSS");
          const pathLog = `./log/update_log/`;
          await Deno.mkdir(pathLog, { recursive: true });
          await Deno.rename(`${currConJSON.userDir}/${param2.params.user}.json`, `${pathLog}/user_update_${param2.params.user}_${time}.json`);

          await Deno.writeTextFile(`${currConJSON.userDir}/${param2.params.user}.json`, JSON.stringify(userJson, undefined, "  "));

          // await sendEmail(
          //   param2.params.user,
          //   "photoTag: Odzyskanie hasła",
          //   `
          //     <p>
          //     Login: ${param2.params.user}<br /><br />

          //     <a href=https://phototag.versio.org/recovery?token=${userJson.passRecoveryToken}&user=${param2.params.user}>Ustaw hasło</a></p>`
          // );
          return { ok: true, info: "ok" };
        } catch (e) {
          console.log(e);
          throw new Error("#userMsg Retrieve login error");
        }

      case "activate":
        try {
          if (param2.params.token && param2.params.user) {
            // ok
          } else {
            throw new Error("#userMsg Activate error (1)");
          }

          const filePath = `${currConJSON.userDir}/${param2.params.user}.json`;
          const fileContents = await Deno.readTextFile(filePath);
          const userJson = JSON.parse(fileContents);
          if (userJson.isActivated === true) {
            throw new Error("#userMsg Konto użytkownika jest już aktywne");
          }
          if (userJson.activateToken == param2.params.token) {
            const time = format(new Date(), "yyyy-MM-dd_HHmmss_SSS");
            const pathLog = `./log/update_log/`;
            userJson.isActivated = true;
            userJson.activateToken = `${userJson.token}_activated`;
            await Deno.mkdir(pathLog, { recursive: true });

            // newralgiczne 2 operacje, gdyby druga z nich zawiodła np. zapisała plik ale z zerową długością bo zabrakło miejsca to jesteśmy w dupie :(
            await Deno.copyFile(`${currConJSON.userDir}/${param2.params.user}.json`, `${pathLog}/user_update_${param2.params.user}_${time}.json`);
            await Deno.writeTextFile(`${currConJSON.userDir}/${param2.params.user}.json`, JSON.stringify(userJson, undefined, 2));
            // można dać jakąś flagę czy transakcja się udała i jeżeli nie to możliwość przywrócenia z kopii?
            return {
              ok: true,
            };
          } else {
            throw new Error("#userMsg Activate error (2)");
          }
        } catch (e: any) {
          console.log(e);
          if (e?.message) {
            throw new Error(e.message);
          } else {
            throw new Error(e.message);
          }
        }

      case "sendActivateLink":
        try {
          if (param2.params.user) {
            // ok
          } else {
            throw new Error("#userMsg Activate send error (1)");
          }
          const filePath = `${currConJSON.userDir}/${param2.params.user}.json`;
          const fileContents = await Deno.readTextFile(filePath);
          const userJson = JSON.parse(fileContents);
          if (userJson.isActivated === true) {
            throw new Error("#userMsg Konto użytkownika jest już aktywne");
          }
          await sendEmail(
            param2.params.user,
            "photoTag: Aktywacja konta",
            `
                <p>
                Aktywacja konta: ${param2.params.user}<br />
                Token aktywacji: ${userJson.activateToken}<br /><br />
                <a href=https://phototag.versio.org/activate?token=${userJson.activateToken}&user=${param2.params.user}>Aktywacja automatyczna</a></p>`
          );
          return {
            ok: true,
          };
        } catch (e: any) {
          console.log(e);
          if (e?.message) {
            throw new Error(e.message);
          } else {
            throw new Error(e.message);
          }
        }

      default:
        throw new Error("Błąd typu auth");
    }
  } catch (e: any) {
    console.log(e);
    //return { "error": true, "info": "error" };
    //throw new Error("Error #987243978");
    if (e.message && String(e).indexOf(`#userMsg`) >= 0) {
      throw new Error(String(e.message).replace(`#userMsg `, ""));
    } else {
      throw new Error("Activate error");
    }
  }
}

async function sessionCreate(params: { cwid: any; user: any; l10n: any; wrkst: any }) {
  try {
    const sessionId = crypto.randomUUID();
    console.log("Random UUID:", sessionId);

    await Deno.mkdir(currConJSON.sessionDir + "/" + sessionId + "." + params.cwid, { recursive: true });

    const userFileContents = {
      user: params.user,
      l10n: params.l10n,
      wrkst: params.wrkst,
    };
    await Deno.writeTextFile(currConJSON.sessionDir + "/" + sessionId + "." + params.cwid + "/session.json", JSON.stringify(userFileContents, null, "\t"));
    return { sessionId: sessionId, cwid: params.cwid };
  } catch (err) {
    console.log(err);
    return { error: "Error create session" };
  }
}

async function sessionCheck(sessionId: string, cwid: string): Promise<any> {
  try {
    await Deno.lstat(currConJSON.sessionDir + "/" + sessionId + "." + cwid + "/session.json");

    const sessionContents = await Deno.readTextFile(currConJSON.sessionDir + "/" + sessionId + "." + cwid + "/session.json");
    const sessionContentsJSON = JSON.parse(sessionContents);

    const userContents = await Deno.readTextFile(currConJSON.userDir + "/" + sessionContentsJSON.user + ".json");
    const userJSON = JSON.parse(userContents);

    if (userJSON.isActivated !== true) {
      throw new Error("#userMsg Konto użytkownika nie zostało aktywowane, sprawdź email, aktywuj i zaloguj się ponownie. https://phototag.versio.org/activate");
    }
    return { result: "ok", user: sessionContentsJSON.user };
  } catch (e: any) {
    console.log(e);
    if (e.message && String(e).indexOf(`#userMsg`) >= 0) {
      throw new Error(String(e.message).replace(`#userMsg `, ""));
    } else {
      throw new Error("Activate error");
    }
  }
}

async function hash(requestParams: any, _options: any) {
  let h;
  let data, hashArray, hashHex, encoder;

  data = requestParams.password + "pwm4898DJ1";
  encoder = new TextEncoder();
  data = encoder.encode(data);
  h = await modCrypto.crypto.subtle.digest("SHA-512", data);
  hashArray = Array.from(new Uint8Array(h));
  hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  data = hashHex + "KarmenkaMiOl";
  encoder = new TextEncoder();
  data = encoder.encode(data);
  h = await modCrypto.crypto.subtle.digest("SHA-512", data);
  hashArray = Array.from(new Uint8Array(h));
  hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

async function sendEmail(user: string, subject: string, html: string) {
  const client = new SMTPClient({
    connection: {
      hostname: currConJSON.instance.phototag.sender.host,
      port: 465,
      tls: true,
      auth: {
        username: currConJSON.instance.phototag.sender.name,
        password: currConJSON.instance.phototag.sender.pass,
      },
    },
  });

  await client.send({
    from: currConJSON.instance.phototag.sender.name,
    to: user,
    subject: subject,
    //content: text,
    html: html,
  });

  await client.close();
}

export { main, sessionCheck };
