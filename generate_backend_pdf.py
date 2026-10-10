import os
import subprocess
import markdown

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
docs_dir = r"e:\v-buy\docs"
md_path = os.path.join(docs_dir, "BACKEND_AND_DATABASE_ARCHITECTURE.md")
pdf_path = os.path.join(docs_dir, "BACKEND_AND_DATABASE_ARCHITECTURE.pdf")
temp_html_path = os.path.join(docs_dir, "_temp_backend_arch.html")

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>V Foods - Backend and Database Architecture</title>
  <style>
    @page {
      size: A4;
      margin: 14mm 12mm 14mm 12mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: 11px;
      line-height: 1.5;
      color: #0f172a;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }
    .doc-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      margin-bottom: 20px;
      border-bottom: 2.5px solid #1e3a8a;
    }
    .doc-brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .brand-badge {
      background: #1e3a8a;
      color: #ffffff;
      font-weight: 900;
      font-size: 14px;
      padding: 4px 10px;
      border-radius: 6px;
      letter-spacing: 0.05em;
    }
    .brand-title {
      font-weight: 800;
      font-size: 15px;
      color: #0f172a;
      letter-spacing: -0.01em;
    }
    .brand-sub {
      font-size: 10px;
      font-weight: 600;
      color: #059669;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .doc-meta {
      text-align: right;
      font-size: 9.5px;
      font-weight: 600;
      color: #64748b;
      line-height: 1.4;
    }
    h1 {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      margin-top: 0;
      margin-bottom: 12px;
      padding-bottom: 6px;
      border-bottom: 1.5px solid #cbd5e1;
      page-break-after: avoid;
    }
    h2 {
      font-size: 14.5px;
      font-weight: 700;
      color: #1e3a8a;
      margin-top: 18px;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #e2e8f0;
      page-break-after: avoid;
    }
    h3 {
      font-size: 12.5px;
      font-weight: 700;
      color: #1e293b;
      margin-top: 14px;
      margin-bottom: 6px;
      page-break-after: avoid;
    }
    h4 {
      font-size: 11.5px;
      font-weight: 700;
      color: #059669;
      margin-top: 12px;
      margin-bottom: 4px;
      page-break-after: avoid;
    }
    p, li {
      color: #334155;
      font-size: 10.5px;
    }
    ul, ol {
      padding-left: 20px;
      margin-top: 4px;
      margin-bottom: 8px;
    }
    li {
      margin-bottom: 3px;
    }
    code {
      background: #f1f5f9;
      color: #1e3a8a;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      font-size: 9.5px;
      padding: 1px 4px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }
    pre {
      background: #0f172a;
      color: #f8fafc;
      padding: 10px 12px;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 9px;
      line-height: 1.45;
      page-break-inside: avoid;
      border: 1px solid #1e293b;
      margin: 8px 0 12px 0;
    }
    pre code {
      background: transparent;
      color: #f8fafc;
      padding: 0;
      border: none;
      font-size: 9px;
    }
    blockquote {
      margin: 10px 0;
      padding: 8px 12px;
      background: #eff6ff;
      border-left: 3.5px solid #2563eb;
      color: #1e3a8a;
      border-radius: 0 6px 6px 0;
    }
    blockquote p {
      margin: 0;
      color: #1e3a8a;
      font-size: 10.5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 10px 0 14px 0;
      font-size: 9.5px;
      line-height: 1.38;
      page-break-inside: auto;
    }
    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }
    th, td {
      padding: 4px 7px;
      border: 1px solid #cbd5e1;
      text-align: left;
      vertical-align: top;
      word-break: break-word;
    }
    th {
      background: #1e3a8a;
      color: #ffffff;
      font-weight: 700;
      letter-spacing: 0.02em;
    }
    tr:nth-child(even) td {
      background: #f8fafc;
    }
    hr {
      border: 0;
      border-top: 1px solid #e2e8f0;
      margin: 14px 0;
    }
    a {
      color: #2563eb;
      text-decoration: none;
    }
    .footer {
      margin-top: 20px;
      padding-top: 8px;
      border-top: 1px solid #e2e8f0;
      font-size: 8.5px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  </style>
</head>
<body>
  <div class="doc-header">
    <div class="doc-brand">
      <div class="brand-badge">V FOODS</div>
      <div>
        <div class="brand-title">Engineering &amp; Architecture Specification</div>
        <div class="brand-sub">Smart Campus Dining Operating System</div>
      </div>
    </div>
    <div class="doc-meta">
      <div>CONFIDENTIAL &amp; PROPRIETARY</div>
      <div>Version 1.0.0 &bull; Production Architecture</div>
      <div>VIT Chennai Campus Dining Platform</div>
    </div>
  </div>

  <!-- CONTENT_PLACEHOLDER -->

  <div class="footer">
    <span>V Foods &middot; Campus Food Court &amp; Dining OS Architecture</span>
    <span>Document ID: VF-DOC-ARCH-2026-V1 &middot; All Rights Reserved</span>
  </div>
</body>
</html>
"""

def main():
    if not os.path.exists(md_path):
        print(f"Error: {md_path} not found")
        return

    with open(md_path, "r", encoding="utf-8") as f:
        md_text = f.read()

    rendered_body = markdown.markdown(
        md_text,
        extensions=["tables", "fenced_code", "toc", "def_list"]
    )

    full_html = HTML_TEMPLATE.replace("<!-- CONTENT_PLACEHOLDER -->", rendered_body)

    with open(temp_html_path, "w", encoding="utf-8") as f:
        f.write(full_html)

    cmd = [
        chrome_path,
        "--headless",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={pdf_path}",
        temp_html_path
    ]

    res = subprocess.run(cmd, capture_output=True, text=True)
    if os.path.exists(temp_html_path):
        os.remove(temp_html_path)

    if os.path.exists(pdf_path):
        size_kb = os.path.getsize(pdf_path) / 1024
        print(f"SUCCESS: Generated {pdf_path} ({size_kb:.1f} KB)")
    else:
        print(f"ERROR: Failed to generate PDF: {res.stderr}")

if __name__ == "__main__":
    main()
