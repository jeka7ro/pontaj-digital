import cv2
import numpy as np
from PIL import Image, ImageOps
import fitz

doc = fitz.open("test.pdf")
page = doc.load_page(0)
pix = page.get_pixmap(dpi=300)
mode = "RGBA" if pix.alpha else "RGB"
img = Image.frombytes(mode, [pix.width, pix.height], pix.samples)
if img.mode != 'RGB':
    img = img.convert('RGB')

img = ImageOps.exif_transpose(img)
open_cv_image = np.array(img)
open_cv_image = open_cv_image[:, :, ::-1].copy() 

cascade_path = cv2.data.haarcascades + 'haarcascade_frontalface_default.xml'
face_cascade = cv2.CascadeClassifier(cascade_path)

rotations = [
    (0, None, img),
    (90, cv2.ROTATE_90_CLOCKWISE, img.transpose(Image.ROTATE_270)),
    (180, cv2.ROTATE_180, img.transpose(Image.ROTATE_180)),
    (270, cv2.ROTATE_90_COUNTERCLOCKWISE, img.transpose(Image.ROTATE_90))
]

face_crop = None

for angle, cv_rot, pil_rot in rotations:
    rotated_cv = open_cv_image if angle == 0 else cv2.rotate(open_cv_image, cv_rot)
    gray = cv2.cvtColor(rotated_cv, cv2.COLOR_BGR2GRAY)
    
    faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
    print(f"Angle {angle}: found {len(faces)} faces")
    if len(faces) > 0:
        face_crop = True
        break
        
print("Face crop found:", bool(face_crop))
