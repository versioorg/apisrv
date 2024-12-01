// deno-lint-ignore-file no-explicit-any
import { getPrinterByName, getPrinters, printFile/*, printFile*/ } from "jsr:@versioorg/printers";

async function main(_param: any, param2: any) {
  // await console.log(JSON.stringify(param));

  try {
    console.log(`labelPrinterName: ${param2?.params?.labelPrinterName}`);
    console.log(`textToPrint: ${param2?.params?.textToPrint}`);    

    const myPrinters = getPrinters()
    const selectedPrinter = myPrinters?.find(p => p.name?.includes(param2?.params?.labelPrinterName)) // Or something like this, normally you want the user to select the printer //Microsoft Print to PDF //'Generic / Text Only'
    
    if (!selectedPrinter) {
      console.log("Brak wybranej drukarki");
      return;
    }

    const printer = getPrinterByName(selectedPrinter.name)

    if (!printer) {
      console.log("Błąd odczytu danych drukarki");
      return;
    }
    const cwd = Deno.cwd();
    await Deno.writeTextFile(`${cwd}\\tmp\\print.txt`, param2?.params?.textToPrint);
    printFile(printer, `${cwd}/tmp/print.txt`, "apisrv");
    
  } catch (e) {
    console.log(e);
  }

  return { "ok": true, "info": "ok" };
}

export { main };
