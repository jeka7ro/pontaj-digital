import fitz
from PIL import Image

doc = fitz.open() # new empty PDF
page = doc.new_page()
page.insert_text((50, 50), "Hello World", fontsize=11)
doc.save("test.pdf")

doc = fitz.open("test.pdf")
page = doc.load_page(0)
pix = page.get_pixmap(dpi=300)

print("pixmap alpha:", pix.alpha)
print("pixmap colorspace:", pix.colorspace)

try:
    img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    print("Success RGB")
except Exception as e:
    print("Failed RGB:", e)
    
try:
    mode = "RGBA" if pix.alpha else "RGB"
    img = Image.frombytes(mode, [pix.width, pix.height], pix.samples)
    print("Success dynamic mode:", mode)
except Exception as e:
    print("Failed dynamic mode:", e)

