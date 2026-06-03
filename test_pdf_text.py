import fitz
doc = fitz.open("test.pdf")
text = ""
for page in doc:
    text += page.get_text()
print(text)
