// deno-lint-ignore-file no-explicit-any
import { format } from "https://deno.land/std@0.224.0/datetime/format.ts";
import { encodeBase64 } from "jsr:@std/encoding/base64";
import { walk } from "https://deno.land/std@0.224.0/fs/mod.ts";
import { sessionCheck } from "./auth.ts";
import { Image } from "https://deno.land/x/imagescript@1.2.15/mod.ts";
import currConJSON from "../config.ts";
import { fileExists } from "./util.ts";

let downloadInProgress = false;
async function cron() {
  if (downloadInProgress) {
    // nic nie robimy, czekamy aż poprzednie zadanie zostanie ukończone
    return;
  } else {
    downloadInProgress = true;
  }
  try {
    console.log("Synchronizacja zdjęć: ", new Date().toISOString());
    const ret = await main(
      undefined,
      {
        params: {
          type: "sync",
          user: currConJSON.cron.params.user,
          sessionId: currConJSON.cron.params.apiKey,
          cwid: "todo",
          backend: currConJSON.cron.params.backend,
        },
      },
      undefined,
      undefined
    );
    console.log(ret);
  } catch (e) {
    console.log(e);
  }
  downloadInProgress = false;
}

if (currConJSON.cron) {
  //setInterval(cron, 3000);
  //setTimeout(cron, 1000);
  setInterval(cron, 5000);
}

async function main(_param: any, param2: any, _context: any, _info: any) {
  try {
    console.log(`photo => ${param2.params.type} => ${JSON.stringify(param2.params)}`);
    if (param2.params.type !== "sync") {
      await sessionCheck(param2.params.sessionId, param2.params.cwid);
    }

    switch (param2.params.type) {
      case "tag":
        try {
          // format nazwy tag:
          // [budżet domowy] nazwa taga
          let foundFolders: object[] = [];
          const path = `./config/file/${param2.params.user}/`;
          await Deno.mkdir(path, { recursive: true });

          for await (const dirEntry of Deno.readDir(path)) {
            if (dirEntry.isDirectory && dirEntry.name.indexOf("_deleted_") <= 0) {
              let countImage = 0;
              for await (const imageEntry of Deno.readDir(`${path}/${dirEntry.name}`)) {
                if (imageEntry.isFile && imageEntry.name.indexOf("_thumbnail.") >= 0 /*&& imageEntry.name.indexOf(".jpg") >= 0*/) {
                  countImage++;
                }
              }
              foundFolders.push({
                tag: dirEntry.name,
                count: countImage,
              });
            }
          }
          foundFolders = foundFolders.sort((a: any, b: any) => a.tag.localeCompare(b.tag));
          return { tags: foundFolders };
        } catch (e) {
          console.log(e);
          throw new Error("Błąd upload #98723798");
        }

      case "tag_create":
        try {
          const path = `./config/file/${param2.params.user}/${param2.params.tag}`;
          await Deno.mkdir(path, { recursive: true });
          return { ok: true };
        } catch (e) {
          console.log(e);
          throw new Error("Błąd upload #9874978");
        }

      case "tag_update":
        try {
          const path = `./config/file/${param2.params.user}`;
          await Deno.rename(`${path}/${param2.params.prevtag}`, `${path}/${param2.params.tag}`);
          return { ok: true };
        } catch (e) {
          console.log(e);
          throw new Error("Błąd upload #9876797234");
        }

      case "tag_delete":
        try {
          const path = `./config/file/${param2.params.user}`;
          const date = new Date();
          const random = format(date, "yyyy-MM-dd_HHmmss_SSS");
          await Deno.rename(`${path}/${param2.params.tag}`, `${path}/${param2.params.tag}_deleted_${random}`);
          return { ok: true };
        } catch (e) {
          console.log(e);
          throw new Error("Błąd upload #9873987");
        }

      case "upload":
        try {
          //console.log(`param2: ${JSON.stringify(param2)}`);

          const base64String = param2.params.content;
          // Usunięcie nagłówka danych (jeśli jest obecny)

          // Konwersja Base64 na binarne dane
          //const binaryData = Uint8Array.from(atob(base64String), (c) => c.charCodeAt(0));
          const binaryData = Uint8Array.from(atob(base64String), (c) => c.charCodeAt(0));

          const user = param2.params.user;
          const tag = param2.params.tag;
          // Zapisanie pliku na dysku
          const date = new Date();
          const random = format(date, "yyyy-MM-dd_HHmmss_SSS");
          const path = `./config/file/${user}/${tag}`;
          await Deno.mkdir(path, { recursive: true });
          let filename = `${path}/${param2.params.filename}.jpg`; //`${path}/photo_${random}.jpg`;
          if (await fileExists(filename)) {
            console.log(`Plik zdjęcia już istnieje, dodaję losowy string do nazwy pliku ${filename}`);
            filename += `_${random}`;
          }
          await Deno.writeFile(filename, binaryData);
          await createThumbnail(filename, `${filename.replace(/.jpg/, "")}_thumbnail.jpg`, 200);
          console.log(`Zapisano plik: ${filename}`);
        } catch (e) {
          console.log(e);
        }
        break;

      case "browse":
        try {
          const foundElements: any[] = [];
          const path = `./config/file/${param2.params.user}/${param2.params.tag}/`;
          await Deno.mkdir(path, { recursive: true });
          for await (const dirEntry of Deno.readDir(path)) {
            //if (dirEntry.isDirectory && dirEntry.name.indexOf("_deleted_") <= 0) {
            if (dirEntry.isFile) {
              let fileData: any;
              if (dirEntry.name.indexOf("_thumbnail.") >= 0) {
                // ok
                fileData = await Deno.readFile(`./config/file/${param2.params.user}/${param2.params.tag}/${dirEntry.name}`);
                const base64String = encodeBase64(fileData);
                foundElements.push({
                  name: dirEntry.name,
                  base64String: base64String,
                });
              } else {
                if (await fileExists(`./config/file/${param2.params.user}/${param2.params.tag}/${dirEntry.name.replace(/.jpg/, "")}_thumbnail.jpg`)) {
                  // ok, jest thumbnail to pomijamy
                } else {
                  // brak thumbnail, trzeba wygenerować
                  await createThumbnail(`./config/file/${param2.params.user}/${param2.params.tag}/${dirEntry.name}`, `./config/file/${param2.params.user}/${param2.params.tag}/${dirEntry.name.replace(/.jpg/, "")}_thumbnail.jpg`, 200);
                  fileData = await Deno.readFile(`./config/file/${param2.params.user}/${param2.params.tag}/${dirEntry.name.replace(/.jpg/, "")}_thumbnail.jpg`);
                  const base64String = encodeBase64(fileData);
                  foundElements.push({
                    name: `${dirEntry.name.replace(/.jpg/, "")}_thumbnail.jpg`,
                    base64String: base64String,
                  });
                }
              }
            }
          }
          return { images: foundElements };
        } catch (e) {
          console.log(e);
          throw new Error("Błąd upload #987234978");
        }

      case "fullImage":
        try {
          const path = `./config/file/${param2.params.user}/${param2.params.tag}/${param2.params.name.replace(/_thumbnail.jpg/, ".jpg")}`;
          const fileData = await Deno.readFile(path);
          const base64String = encodeBase64(fileData);
          return { fullImage: base64String };
        } catch (e) {
          console.log(e);
          throw new Error("Błąd upload #9872349782");
        }

      case "image":
        try {
          const path = `./config/file/${param2.params.user}/${param2.params.tag}/${param2.params.name}`;
          const fileData = await Deno.readFile(path);
          const base64String = encodeBase64(fileData);
          return { image: base64String };
        } catch (e) {
          console.log(e);
          throw new Error("Błąd upload #9872349782");
        }

      case "server_ls":
        try {
          const sessionContents = await Deno.readTextFile(currConJSON.sessionDir + "/" + param2.params.sessionId + "." + param2.params.cwid + "/session.json");
          const sessionContentsJSON = JSON.parse(sessionContents);

          // kontrola apiKey, przekazywane parametry muszą mieć poprawne pole user oraz token apiKey musi być przypisany w session.json do tego samego użytkownika
          if (sessionContentsJSON.user === param2.params.user) {
            // ok
          } else {
            throw new Error(`#userMsg Dane użytkownika nie zgadzają się z danymi apiKey`);
          }
          // const userContents = await Deno.readTextFile(currConJSON.userDir + "/" + sessionContentsJSON.user + ".json");
          // const userJSON = JSON.parse(userContents);

          // const userJson = JSON.parse(await Deno.readTextFile(`${currConJSON.userDir}/${param2.params.user}.json`));

          //if (await sessionCheck("testt", "testtt")) {
          // const path =
          //   `/media/user/k/src/x/backend/apisrv/config/file/test2@test.com`;

          const path = `${Deno.cwd()}/config/file/${param2.params.user}`;
          const tree = await buildDirectoryTree(path);
          // await Deno.writeTextFile(
          //   `./images_file_list.json`,
          //   JSON.stringify(tree, undefined, `  `),
          // );
          return { images: tree };
          // } else {
          //   throw new Error("Błąd session");
          // }
        } catch (e) {
          console.log(e);
          throw new Error("Błąd server_ls");
        }

      case "sync":
        try {
          const result = await graphqlClient(
            `
            query {
              photo(params: { type: "server_ls", user: "${param2.params.user}", sessionId: "${param2.params.sessionId}", cwid: "todo" })
            }
          `,
            undefined,
            {
              backend: param2.params.backend,
            }
          );

          const path = `${Deno.cwd()}/photoTag_${param2.params.user}`;
          await Deno.mkdir(path, { recursive: true });
          const treeLocal = await buildDirectoryTree(path);

          const diff = getDifferences(result?.photo?.images, treeLocal);

          if (currConJSON.design === true) {
            await Deno.writeTextFile("./tmp/local_files.json", JSON.stringify(sortTagAndPhoto(treeLocal), undefined, "  "));
            await Deno.writeTextFile("./tmp/server_files.json", JSON.stringify(sortTagAndPhoto(result?.photo?.images), undefined, "  "));
            await Deno.writeTextFile("./tmp/diff_files.json", JSON.stringify(sortTagAndPhoto(diff), undefined, "  "));
          }

          for (const tag in diff) {
            for (const iPhoto in diff[tag] as any) {
              console.log(`Pobieram plik: photoTag_${param2.params.user}/${tag}/${diff[tag][iPhoto]}`);
              const retDownload = await graphqlClient(
                `
                query {
                  photo(params: { type: "image", user: "${param2.params.user}", tag: "${tag}", name: "${diff[tag][iPhoto]}", sessionId: "${param2.params.sessionId}", cwid: "todo" })
                }
              `,
                undefined,
                {
                  backend: param2.params.backend,
                }
              );

              const binaryData = Uint8Array.from(atob(retDownload.photo.image), (c) => c.charCodeAt(0));
              const downloadPath = `${Deno.cwd()}/photoTag_${param2.params.user}/${tag}`;
              await Deno.mkdir(downloadPath, { recursive: true });
              await Deno.writeFile(`${downloadPath}/${diff[tag][iPhoto]}`, binaryData);
            }
          }

          return { ret: "ok" };
        } catch (e) {
          console.log(e);
          throw new Error("Błąd upload #987243987");
        }

      case "fetchColumnDefs":
        switch (param2.params.objectId) {
          case "taggrid":
            return [
              {
                headerName: "Tag",
                field: "tag",
                flex: true,
                cellStyle: { paddingLeft: 0, paddingRight: 0 },
                cellRenderer: (params: any) =>
                  // <button
                  //   className="flex items-center w-full p-2 text-white bg-green-500 rounded hover:bg-blue-700"
                  //   onClick={ () => {
                  //       // chat gpt podał return params.context.takePhoto?.(params.data.tag);
                  //       return params.colDef.context.takePhoto?.(params.data.tag);
                  //     }
                  //   }
                  // >
                  //   <FaCamera className="text-3xl mr-1" />
                  //   {params.data.tag}
                  // </button>
                  params.data.tag,
              },
              {
                headerName: "Browse",
                field: "count",
                width: 100,
                cellStyle: { paddingLeft: 0, paddingRight: 0 },
                cellRenderer: (params: any) =>
                  // <button
                  //   className="relative flex items-center justify-center w-full h-full p-2 text-white bg-yellow-500 rounded hover:bg-blue-700"
                  //   onClick={() => {
                  //     return params.colDef.context.browse?.(params.data.tag)
                  //   }
                  //   }
                  // >
                  //   <FaFolderOpen className="text-3xl mr-1" />
                  //   {params.data.count}
                  // </button>
                  params.data.count,
              },
            ];
          case "imageGallery":
            return [
              {
                headerName: "Image",
                field: "imageUrl",
                width: 100,
                cellStyle: { paddingLeft: 0, paddingRight: 0 },
                cellRenderer: (params: any) => {
                  // <img
                  //   src={params.value}
                  //   alt="Gallery"
                  //   className="cursor-pointer"
                  //   onClick={() => params.colDef.context.onCellClicked?.(params.data.name)}
                  // />
                  params.data.imageUrl;
                },
              },
              {
                headerName: "Download",
                field: "download",
                width: 100,
                cellStyle: { paddingLeft: 0, paddingRight: 0 },
                cellRenderer: (params: any) => {
                  // const downloadImage = () => {
                  //   const link = document.createElement("a");
                  //   link.href = params.data.imageUrl;
                  //   link.download = `image-${params.data.name}.jpg`;
                  //   link.click();
                  // };
                  // return (
                  //   <button
                  //     className="relative flex items-center justify-center w-full h-full p-2 text-white bg-yellow-500 rounded hover:bg-blue-700"
                  //     onClick={downloadImage}
                  //   >
                  //     <FaDownload className="text-2xl" />
                  //   </button>
                  // );
                  params.data.download;
                },
              },
              {
                headerName: "Name",
                field: "name",
                width: 300,
                cellStyle: { paddingLeft: 0, paddingRight: 0 },
              },
            ];
          case "settings":
            return [
              {
                headerName: "Param",
                field: "param",
                width: 200,
              },
              {
                headerName: "Value",
                field: "value",
                width: 200,
              },
            ];
          default:
            return [];
        }

      default:
        console.log("Błędny typ żądania " + param2.params.type);
        throw new Error("Błędny typ żądania");
    }
  } catch (e: any) {
    console.log(e);
    //return { "ok": false, "info": "error" };
    //throw new Error(`Error #983298`);
    if (e.message && String(e).indexOf(`#userMsg`) >= 0) {
      throw new Error(String(e.message).replace(`#userMsg `, ""));
    } else {
      throw new Error("Error #987798234");
    }
  }

  return { ok: true, info: "ok" };
}

interface DirectoryStructure {
  [key: string]: string[];
}

async function buildDirectoryTree(path: string): Promise<DirectoryStructure> {
  const structure: DirectoryStructure = {};

  for await (const entry of walk(path, {
    includeDirs: true,
    exts: [".jpg"],
    followSymlinks: false,
  })) {
    const parentDir = entry.path.replace(path, "").split("/").filter(Boolean)[0]; // Podkatalog
    if (parentDir) {
      if (!structure[parentDir]) {
        structure[parentDir] = [];
      }
      structure[parentDir].push(entry.name); // Dodaj nazwę pliku
    }
  }

  return structure;
}

const graphqlClient = async (query: string, variables?: { email?: string; password?: string }, param?: { backend?: string }) => {
  // if (!config) {
  //   console.log(`Brak konfiguracji pobieram`);
  //   await fetchConfig();
  // } else {
  //   console.log(`Konfiguracja ok`);
  // }

  try {
    param = param || {};
    param.backend = param.backend || "http://127.0.0.1:3001/graphql";
    const response = await fetch(param.backend, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      alert(`GraphQL error`);
      throw new Error(`GraphQL error: ${response.status} ${response.statusText}`);
    }

    const responseData = await response.json();

    if (responseData.errors) {
      console.log(`Error responseData.errors`);
      const errText = responseData.errors.map((error: { message: any }) => error.message).join("\n");
      alert(errText);
      throw new Error(errText);
    }

    return responseData.data;
  } catch (error) {
    console.error("Error during GraphQL request:", error);
    alert("Wystąpił błąd podczas wykonywania zapytania.");
    throw error;
  }
};

async function createThumbnail(inputPath: string, outputPath: string, maxSize: number) {
  try {
    // Wczytaj obraz z pliku
    const imageData = await Deno.readFile(inputPath);
    const image = await Image.decode(imageData);

    // Oblicz nową szerokość i wysokość, zachowując proporcje
    const aspectRatio = image.width / image.height;
    let newWidth, newHeight;

    if (aspectRatio > 1) {
      // Obraz jest szerszy niż wyższy
      newWidth = maxSize;
      newHeight = Math.round(maxSize / aspectRatio);
    } else {
      // Obraz jest wyższy niż szerszy
      newHeight = maxSize;
      newWidth = Math.round(maxSize * aspectRatio);
    }

    // Zmień rozmiar obrazu
    const thumbnail = image.resize(newWidth, newHeight);

    // Zakoduj miniaturkę jako plik (JPEG/PNG)
    const encoded = await thumbnail.encodeJPEG(80); // Jakość 80%
    await Deno.writeFile(outputPath, encoded);

    console.log(`Miniaturka została zapisana jako ${outputPath}`);
  } catch (err) {
    console.error("Błąd podczas tworzenia miniaturki:", err);
  }
}

function getDifferences(serverImages: any, localImages: any) {
  const differences = {} as any;

  for (const [key, serverFiles] of Object.entries(serverImages)) {
    if (!localImages[key]) {
      // Jeśli klucz (np. "2222222222222") nie istnieje lokalnie, dodaj wszystkie pliki z serwera.
      differences[key] = serverFiles;
    } else {
      // Jeśli klucz istnieje, sprawdź różnice w plikach.
      const localFiles = localImages[key];
      const filesToDownload = (serverFiles as any).filter((file: any) => !localFiles.includes(file));
      if (filesToDownload.length > 0) {
        differences[key] = filesToDownload;
      }
    }
  }

  return differences;
}

// Sortowanie kluczy
function sortTagAndPhoto(jsonData: any) {
  const sortedData = Object.keys(jsonData)
    .sort() // Sortuj klucze
    .reduce((sortedObj, key) => {
      // Sortuj elementy w tablicach dla każdego klucza
      sortedObj[key] = jsonData[key].sort((a: any, b: any) => a.localeCompare(b));
      return sortedObj;
    }, {} as Record<string, string[]>);
  return sortedData;
}
export { main };
