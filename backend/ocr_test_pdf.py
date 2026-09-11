from app.services.ocr_service import extract_text_from_document


PDF_PATH = r"ocr_test\test.pdf"


try:
    text = extract_text_from_document(PDF_PATH)

    print("\n========== PDF OCR RESULT ==========\n")

    if text:
        print(text)
    else:
        print("No text was detected.")

    print("\n====================================\n")


except Exception as error:
    print("\nPDF OCR TEST FAILED")
    print(error)