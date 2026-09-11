from app.services.ocr_service import extract_text_from_image


IMAGE_PATH = r"ocr_test\test.png"


try:
    text = extract_text_from_image(IMAGE_PATH)

    print("\n========== OCR RESULT ==========\n")

    if text:
        print(text)
    else:
        print("No text was detected.")

    print("\n================================\n")

except Exception as error:
    print("\nOCR TEST FAILED")
    print(error)