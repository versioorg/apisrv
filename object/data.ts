async function main(_param: any, param2: any) {
  try {
    switch (param2.params.type) {
      case "colDefs":
        console.log(`colDefs`);
        try {
          return [
            {
              field: "ticker",
              //cellRenderer: TickerCellRenderer,
              minWidth: 380,
            },
            {
              field: "instrument",
              cellDataType: "text",
              type: "rightAligned",
              maxWidth: 180,
            },
            {
              headerName: "P&L",
              cellDataType: "number",
              type: "rightAligned",
              //cellRenderer: "agAnimateShowChangeCellRenderer",
              // valueGetter: ({ data }: ValueGetterParams) =>
              //   data && data.quantity * (data.price / data.purchasePrice),
              // valueFormatter: numberFormatter,
              //aggFunc: "sum",
            },
            {
              headerName: "Total Value",
              type: "rightAligned",
              cellDataType: "number",
              // valueGetter: ({ data }: ValueGetterParams) =>
              //   data && data.quantity * data.price,
              //cellRenderer: "agAnimateShowChangeCellRenderer",
              // valueFormatter: numberFormatter,
              //aggFunc: "sum",
            },
            {
              field: "quantity",
              cellDataType: "number",
              type: "rightAligned",
              // valueFormatter: numberFormatter,
              maxWidth: 150,
            },
            {
              headerName: "Price",
              field: "purchasePrice",
              cellDataType: "number",
              type: "rightAligned",
              // valueFormatter: numberFormatter,
              maxWidth: 150,
            },
            {
              field: "purchaseDate",
              cellDataType: "dateString",
              type: "rightAligned",
              hide: true,
            },
            {
              headerName: "Last 24hrs",
              field: "last24",
              // cellRenderer: "agSparklineCellRenderer",
              // cellRendererParams: {
              //   sparklineOptions: {
              //     line: {
              //       strokeWidth: 2,
              //     },
              //   },
              // },
            },
          ];
        } catch (e) {
          console.log(e);
          throw new Error("Błąd upload");
        }

      case "data":
        console.log(`data`);
        try {
          return [
            {
              ticker: "US10YYYY",
              name: "U.S. Treasury 10-Year Bond",
              instrument: "Bond",
              quantity: 1000,
              purchaseDate: "2023-06-01",
              purchasePrice: 100,
              price: 102.5,
              last24: 123,
            },
            {
              ticker: "CAD30Y",
              name: "Canada 30-Year Government Bond",
              instrument: "Bond",
              quantity: 550,
              purchaseDate: "2023-06-10",
              purchasePrice: 96,
              price: 97,
              last24: 5151,
            },
            {
              ticker: "MUB",
              name: "iShares National Muni Bond ETF",
              instrument: "ETF",
              quantity: 75,
              purchaseDate: "2023-06-11",
              purchasePrice: 115,
              price: 116,
              last24: 14,
            },
            {
              ticker: "BTC-USD",
              name: "Bitcoin",
              instrument: "Crypto",
              quantity: 2,
              purchaseDate: "2023-06-15",
              purchasePrice: 30000,
              price: 29000,
              last24: 516,
            },
            {
              ticker: "T",
              name: "AT&T Inc.",
              instrument: "Stock",
              quantity: 100,
              purchaseDate: "2023-06-15",
              purchasePrice: 20,
              price: 21.5,
              last24: 515,
            },
            {
              ticker: "T2",
              name: "AT&T Inc.",
              instrument: "Stock",
              quantity: 100,
              purchaseDate: "2023-06-15",
              purchasePrice: 20,
              price: 21.5,
              last24: 515,
            },
            {
              ticker: "T3",
              name: "AT&T Inc.",
              instrument: "Stock",
              quantity: 100,
              purchaseDate: "2023-06-15",
              purchasePrice: 20,
              price: 21.5,
              last24: 515,
            },
            {
              ticker: "T4",
              name: "AT&T Inc.",
              instrument: "Stock",
              quantity: 100,
              purchaseDate: "2023-06-15",
              purchasePrice: 20,
              price: 21.5,
              last24: 515,
            },
          ];
        } catch (e) {
          console.log(e);
          throw new Error("Błąd upload");
        }

      default:
        console.log("Błędny typ żądania " + param2.params.type);
        throw new Error("Błędny typ żądania");
    }
  } catch (e) {
    console.log(e);
    return { "ok": false, "info": "error" };
  }
}

export { main };
