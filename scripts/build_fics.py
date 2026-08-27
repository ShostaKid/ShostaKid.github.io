#!/usr/bin/env python3
"""
Quét toàn bộ file .yaml trong thư mục fics/, gom lại thành fics.json duy nhất.

Cách đặt tên file (khuyến nghị, không bắt buộc):
    fics/000-toccata-no1.yaml
    fics/001-cello-concerto.yaml
Số ở đầu quyết định THỨ TỰ fic xuất hiện trong file fics.json (và do đó là
index dùng cho openFic(i) trên web). File không có số ở đầu sẽ được xếp
xuống cuối theo thứ tự alphabet tên file.

Chạy thủ công để test:
    python3 scripts/build_fics.py
"""
import os
import re
import json
import sys
import glob

try:
    import yaml
except ImportError:
    print("Thiếu thư viện pyyaml. Cài bằng: pip install pyyaml")
    sys.exit(1)

FICS_DIR = "fics"
OUTPUT_FILE = "fics.json"

REQUIRED_FIELDS = ["title", "fandom", "files", "chapters"]


def sort_key(path):
    """File có số ở đầu tên (000-, 001-, ...) được ưu tiên theo đúng số đó.
    File không có số bị đẩy xuống cuối, sắp theo alphabet."""
    base = os.path.basename(path)
    m = re.match(r"^(\d+)", base)
    if m:
        return (0, int(m.group(1)), base)
    return (1, 0, base)


def load_fic(path):
    with open(path, encoding="utf-8") as f:
        data = yaml.safe_load(f)

    if not isinstance(data, dict):
        raise ValueError(f"{path}: nội dung không phải một object YAML hợp lệ")

    missing = [field for field in REQUIRED_FIELDS if field not in data]
    if missing:
        raise ValueError(f"{path}: thiếu field bắt buộc: {', '.join(missing)}")

    # Điền field optional còn thiếu với giá trị mặc định an toàn
    data.setdefault("subtitle", None)
    data.setdefault("warning", None)
    data.setdefault("summary", "")
    data.setdefault("tags", [])
    data.setdefault("date", "")
    data.setdefault("featured", False)
    data.setdefault("music", None)
    data.setdefault("musicName", None)

    return data


def main():
    if not os.path.isdir(FICS_DIR):
        print(f"Không tìm thấy thư mục '{FICS_DIR}/'. Không có gì để build.")
        # Vẫn ghi ra file rỗng để tránh site vỡ hoàn toàn
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump([], f, ensure_ascii=False, indent=2)
        return

    paths = sorted(glob.glob(os.path.join(FICS_DIR, "*.yaml")) +
                    glob.glob(os.path.join(FICS_DIR, "*.yml")),
                    key=sort_key)

    if not paths:
        print(f"Thư mục '{FICS_DIR}/' rỗng, không có file .yaml nào.")
        with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
            json.dump([], f, ensure_ascii=False, indent=2)
        return

    fics = []
    errors = []

    for path in paths:
        try:
            fics.append(load_fic(path))
            print(f"  ✓ {path}")
        except Exception as e:
            errors.append(str(e))
            print(f"  ✗ {path}: {e}")

    if errors:
        print("\n=== BUILD THẤT BẠI ===")
        for e in errors:
            print(" -", e)
        sys.exit(1)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        json.dump(fics, f, ensure_ascii=False, indent=2)

    print(f"\nĐã build {len(fics)} fic → {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
