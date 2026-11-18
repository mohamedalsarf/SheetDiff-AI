# SheetDiff-AI

A React/TypeScript prototype for comparing two Excel or CSV datasets and reviewing differences in financial records.

The comparison logic runs in the browser. Gemini is used to generate an explanation of the results, not to perform the row matching.

## Status
Under development. The repository needs an application entry-point fix and safer API-key handling before it is suitable for public deployment. AI analysis has not been verified end to end with a live API key.

## Implemented features
- Read the first worksheet of an Excel or CSV file.
- Compare a base dataset (File A) with an updated dataset (File B).
- Identify added, removed and modified records.
- Show base totals, updated totals and their difference using recognized financial column names.
- Request an AI summary, possible causes, anomalies and suggested checks.
- Export detected differences to an Excel workbook.
- Keep up to 10 summaries and AI reports in browser local storage. Saved history does not contain the full row-level comparison or support recreating the original export.

## How records are matched
Rows are matched using the first available identifier among invoice_no, Invoice, PO, reference, id, ID, email and Reference. Without one of these fields, matching falls back to row position.

Use unique identifiers and consistent column names in both files. Modified values are compared against the headers from File A.

## Development setup
The project uses Node.js, npm, React, TypeScript, Vite, SheetJS and the Google GenAI SDK.

Existing commands:

a) npm install
b) npm run dev
c) npm run build

The current index.html does not load index.tsx. A successful build alone does not confirm that the application runs. Restore the application entry point before testing the UI.

The current configuration reads GEMINI_API_KEY from .env.local. Do not commit keys. For a public deployment, move authenticated Gemini requests to a server-side service instead of embedding a key in the browser build.

## Intended workflow after setup
1. Upload File A as the base and File B as the updated dataset.
2. Select "Reconcile Data".
3. Review totals, changed values and the AI explanation.
4. Use "Export Excel" to download detected differences.

## Limitations
- Only the first worksheet is read.
- Duplicate identifiers can overwrite earlier rows during matching.
- Without identifiers, row reordering can produce misleading differences.
- Columns present only in File B are not checked for modifications.
- Numeric totals depend on recognized column names and simple number parsing; validate formatted amounts before relying on totals.
- Exporting when there are no differences needs further handling.
- AI explanations may be wrong and are not a substitute for checking the original records.

## Privacy and security
File parsing and row comparison happen in the browser, but AI analysis sends file names, column headers, totals, counts and samples of up to 10 modified and 10 added records to Gemini. It is not an offline-only workflow.

The current Vite configuration makes the API key available to client-side code. Do not deploy it publicly with a real key in its present form. Use synthetic or anonymized data for testing, and only send financial information to an AI service with the required permission.

Browser history stores file names, totals and AI analysis locally. Avoid shared devices and clear site data when needed.
