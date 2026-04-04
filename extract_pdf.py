import subprocess
import sys

# Install pymupdf
subprocess.check_call([sys.executable, "-m", "pip", "install", "pymupdf", "-q"])

import fitz

for pdf_name in ["SRS.pdf", "User Stories.pdf"]:
    doc = fitz.open(pdf_name)
    txt_name = pdf_name.replace(".pdf", ".txt")
    with open(txt_name, "w", encoding="utf-8") as f:
        for page in doc:
            f.write(page.get_text())
            f.write("\n--- PAGE BREAK ---\n")
    print(f"Extracted {pdf_name} -> {txt_name}")
    doc.close()
