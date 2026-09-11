from pathlib import Path

import pytesseract
from PIL import Image
from pdf2image import convert_from_path


# ---------------------------------------------------------
# Configuration
# ---------------------------------------------------------

TESSERACT_PATH = r"C:\Program Files\Tesseract-OCR\tesseract.exe"

POPPLER_PATH = (
    r"C:\Program Files\poppler"
    r"\poppler-26.07.0"
    r"\Library\bin"
)


# Tell pytesseract where Tesseract is installed.
pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH


# ---------------------------------------------------------
# Image OCR
# ---------------------------------------------------------

def extract_text_from_image(
    file_path: str | Path,
) -> str:
    """
    Extract text from an image using Tesseract OCR.

    Supported:
    - PNG
    - JPG
    - JPEG
    """

    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(
            f"Document not found: {path}"
        )

    try:
        with Image.open(path) as image:
            text = pytesseract.image_to_string(
                image,
                lang="eng",
            )

    except Exception as error:
        raise RuntimeError(
            f"Image OCR failed: {error}"
        ) from error

    return text.strip()


# ---------------------------------------------------------
# PDF OCR
# ---------------------------------------------------------

def extract_text_from_pdf(
    file_path: str | Path,
) -> str:
    """
    Extract text from a PDF.

    Each PDF page is converted into an image using
    Poppler and then processed with Tesseract.
    """

    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(
            f"PDF document not found: {path}"
        )

    try:
        pages = convert_from_path(
            str(path),
            dpi=200,
            poppler_path=POPPLER_PATH,
        )

    except Exception as error:
        raise RuntimeError(
            f"PDF conversion failed: {error}"
        ) from error

    extracted_pages: list[str] = []

    for page_number, page in enumerate(
        pages,
        start=1,
    ):
        try:
            text = pytesseract.image_to_string(
                page,
                lang="eng",
            ).strip()

            if text:
                extracted_pages.append(
                    f"--- Page {page_number} ---\n{text}"
                )

        except Exception as error:
            raise RuntimeError(
                f"OCR failed on PDF page "
                f"{page_number}: {error}"
            ) from error

    return "\n\n".join(extracted_pages)


# ---------------------------------------------------------
# Automatic Document OCR
# ---------------------------------------------------------

def extract_text_from_document(
    file_path: str | Path,
) -> str:
    """
    Automatically select the correct OCR pipeline
    based on the document extension.
    """

    path = Path(file_path)

    if not path.exists():
        raise FileNotFoundError(
            f"Document not found: {path}"
        )

    extension = path.suffix.lower()

    if extension in {
        ".png",
        ".jpg",
        ".jpeg",
    }:
        return extract_text_from_image(path)

    if extension == ".pdf":
        return extract_text_from_pdf(path)

    raise ValueError(
        "Unsupported document type. "
        "Supported formats: PDF, PNG, JPG, JPEG."
    )