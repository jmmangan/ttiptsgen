const chromium = require("@sparticuz/chromium");
const puppeteer = require("puppeteer-core");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  let browser = null;

  try {
    const { html, filename } = JSON.parse(event.body);

    if (!html) {
      return { statusCode: 400, body: "Missing html parameter" };
    }

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: { width: 680, height: 960 },
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });

    const page = await browser.newPage();

    // Build a full HTML document with embedded styles and fonts
    const fullHTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
<style>
@page { size: letter; margin: 0; }
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:'DM Sans',Helvetica,Arial,sans-serif; color:#3D3D3E; background:#fff; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
.sheet { width:100%; }
.sheet-header { background:#fff; padding:20px 40px; display:flex; align-items:center; justify-content:space-between; }
.sheet-logo img { height:44px; width:auto; display:block; }
.sheet-address { text-align:right; font-size:10px; color:#09A1DE; font-weight:600; line-height:1.7; }
.sheet-client-bar { background:#09A1DE; padding:10px 40px; display:flex; align-items:center; justify-content:space-between; border-top:1.5px solid #3D3D3E; border-bottom:1.5px solid #3D3D3E; }
.sheet-body { padding:24px 40px 8px; }
.sheet-section-label { font-size:10px; letter-spacing:1.8px; text-transform:uppercase; color:#09A1DE; font-weight:600; margin-bottom:12px; }
.sheet-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:14px; }
.card { position:relative; border:1px solid #949495; border-left:3.5px solid #09A1DE; border-radius:8px; padding:14px 16px; display:flex; align-items:flex-start; gap:12px; background:#fff; box-shadow:0 1px 3px rgba(0,0,0,0.06); }
.card-avatar { width:40px; height:40px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:12px; font-weight:500; flex-shrink:0; }
.card-avatar-person { background:#09A1DE; color:#fff; }
.card-avatar-team { background:#EBF7FC; border:0.5px solid #E0E0E0; }
.card-name { font-size:13px; font-weight:600; color:#3D3D3E; margin-bottom:2px; }
.card-role { font-size:11px; color:#09A1DE; font-weight:500; margin-bottom:4px; }
.card-role-muted { font-size:10.5px; color:#949495; font-weight:400; margin-bottom:4px; }
.card-contact { font-size:10.5px; color:#949495; line-height:1.5; }
.sheet-supports { font-size:11px; color:#949495; line-height:1.5; margin-bottom:20px; padding:0 4px; }
.sheet-supports strong { color:#3D3D3E; font-weight:500; }
.sheet-divider { height:0.5px; background:#E0E0E0; margin:0 0 20px; }
.sheet-hr-promo { background:#EBF7FC; border:0.5px solid #5BC2EB; border-radius:8px; padding:14px 20px; margin:0 0 20px; display:flex; align-items:center; gap:16px; }
.sheet-hr-icon { width:36px; height:36px; border-radius:50%; background:#09A1DE; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.sheet-hr-text { font-size:12px; color:#3D3D3E; line-height:1.5; }
.sheet-hr-text strong { font-weight:500; color:#09A1DE; }
.sheet-footer { background:#3D3D3E; padding:12px 40px; display:flex; align-items:center; justify-content:space-between; }
.sheet-footer span { font-size:10px; }
</style>
</head>
<body>
${html}
</body>
</html>`;

    await page.setContent(fullHTML, { waitUntil: "networkidle0", timeout: 8000 });

    // Wait for font to load
    await page.evaluate(() => document.fonts.ready);

    const pdf = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: { top: "0.5in", right: "0.5in", bottom: "0.4in", left: "0.5in" },
    });

    await browser.close();

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename || "team-sheet"}.pdf"`,
      },
      body: pdf.toString("base64"),
      isBase64Encoded: true,
    };
  } catch (error) {
    if (browser) await browser.close();
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
