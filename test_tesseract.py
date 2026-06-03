import fitz
import pytesseract
from PIL import Image

doc = fitz.open("test.pdf")
page = doc.load_page(0)
pix = page.get_pixmap(dpi=300)
img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)

text = pytesseract.image_to_string(img, lang='ron')
print("--- TESSERACT TEXT ---")
print(text)
