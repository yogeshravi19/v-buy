import os
import glob
import subprocess
import markdown

chrome_path = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
docs_dir = r"e:\v-buy\docs"

HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>{title}</title>
  <style>
    @page {{
      size: A4;
      margin: 18mm 16mm 18mm 16mm;
    }}
    body {{
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 13.5px;
      line-height: 1.65;
      color: #1e293b;
      margin: 0;
      padding: 0;
      background: #ffffff;
    }}
    .doc-header {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 12px;
      margin-bottom: 24px;
      border-bottom: 2px solid #e2e8f0;
    }}
    .doc-brand {{
      display: flex;
      align-items: baseline;
      gap: 3px;
      font-weight: 900;
      color: #ea580c;
    }}
    .doc-brand .v {{ font-size: 1.5rem; color: #ea580c; }}
    .doc-brand .f {{ font-size: 1.25rem; color: #ea580c; }}
    .doc-brand .oods {{ font-size: 0.9rem; letter-spacing: 0.05em; color: #1e293b; }}
    .doc-sub {{
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }}
    h1 {{
      font-size: 22px;
      color: #0f172a;
      margin-top: 0;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #cbd5e1;
      page-break-after: avoid;
    }}
    h2 {{
      font-size: 17px;
      color: #0f172a;
      margin-top: 22px;
      margin-bottom: 10px;
      page-break-after: avoid;
    }}
    h3 {{
      font-size: 14px;
      color: #334155;
      margin-top: 16px;
      margin-bottom: 8px;
      page-break-after: avoid;
    }}
    p, li {{
      color: #334155;
    }}
    ul, ol {{
      padding-left: 24px;
      margin-top: 6px;
      margin-bottom: 12px;
    }}
    li {{
      margin-bottom: 4px;
    }}
    code {{
      background: #f1f5f9;
      color: #c026d3;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      padding: 2px 5px;
      border-radius: 4px;
    }}
    pre {{
      background: #0f172a;
      color: #f8fafc;
      padding: 14px;
      border-radius: 6px;
      overflow-x: auto;
      font-size: 12px;
      line-height: 1.5;
      page-break-inside: avoid;
    }}
    pre code {{
      background: transparent;
      color: #f8fafc;
      padding: 0;
    }}
    blockquote {{
      margin: 14px 0;
      padding: 10px 16px;
      background: #fff7ed;
      border-left: 4px solid #ea580c;
      color: #9a3412;
      border-radius: 0 6px 6px 0;
    }}
    blockquote p {{
      margin: 0;
      color: #9a3412;
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      page-break-inside: avoid;
      font-size: 12.5px;
    }}
    th, td {{
      padding: 8px 12px;
      border: 1px solid #cbd5e1;
      text-align: left;
    }}
    th {{
      background: #f8fafc;
      font-weight: 700;
      color: #0f172a;
    }}
    tr:nth-child(even) td {{
      background: #fdfdfd;
    }}
    hr {{
      border: 0;
      border-top: 1px solid #e2e8f0;
      margin: 20px 0;
    }}
    a {{
      color: #ea580c;
      text-decoration: none;
    }}
    .footer {{
      margin-top: 30px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }}
  </style>
</head>
<body>
  <div class="doc-header">
    <div class="doc-brand">
      <span class="v">V</span><span class="f">F</span><span class="oods">OODS</span>
    </div>
    <div class="doc-sub">Campus Dining Documentation &bull; Official</div>
  </div>
  {content}
  <div class="footer">
    <span>V FOODS Smart Campus Pre-Order & Dining System</span>
    <span>Campus Operations & Technical Reference</span>
  </div>
</body>
</html>
"""

def generate_all_pdfs():
    md_files = sorted(glob.glob(os.path.join(docs_dir, "*.md")))
    print(f"Found {len(md_files)} markdown files in {docs_dir}")
    
    generated = []
    for md_path in md_files:
        filename = os.path.basename(md_path)
        base_name = os.path.splitext(filename)[0]
        pdf_filename = f"{base_name}.pdf"
        pdf_path = os.path.join(docs_dir, pdf_filename)
        temp_html_path = os.path.join(docs_dir, f"_temp_{base_name}.html")
        
        with open(md_path, "r", encoding="utf-8") as f:
            md_text = f.read()
        
        rendered_body = markdown.markdown(md_text, extensions=["tables", "fenced_code", "toc"])
        full_html = HTML_TEMPLATE.format(title=f"V FOODS - {base_name}", content=rendered_body)
        
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
            print(f"[OK] Generated: {pdf_filename} ({size_kb:.1f} KB)")
            generated.append(pdf_filename)
        else:
            print(f"[ERROR] Failed for {filename}: {res.stderr}")

    print(f"\nDone! Successfully generated {len(generated)}/{len(md_files)} PDF files.")

if __name__ == "__main__":
    generate_all_pdfs()
