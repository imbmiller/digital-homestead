import csv
import hashlib
import io
from datetime import date
from ..schemas.transaction import ImportPreviewRow


def _parse_date(raw: str) -> str:
    """Try common date formats and return ISO string."""
    from datetime import datetime
    for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%m-%d-%Y", "%m/%d/%y"):
        try:
            return datetime.strptime(raw.strip(), fmt).date().isoformat()
        except ValueError:
            continue
    raise ValueError(f"Cannot parse date: {raw!r}")


def _make_hash(date_str: str, description: str, amount: float) -> str:
    raw = f"{date_str}|{description.strip()}|{amount:.2f}"
    return hashlib.sha256(raw.encode()).hexdigest()


def parse_csv(content: bytes) -> list[dict]:
    text = content.decode("utf-8", errors="replace")
    reader = csv.reader(io.StringIO(text))
    rows = []
    for line in reader:
        if not any(cell.strip() for cell in line):
            continue
        rows.append(line)
    if not rows:
        return []

    parsed = []
    # Auto-detect: if first row looks like a header, skip it
    first = rows[0]
    has_header = any(
        cell.strip().lower() in ("date", "description", "amount", "balance", "transaction date")
        for cell in first
    )
    data_rows = rows[1:] if has_header else rows

    for row in data_rows:
        if len(row) < 3:
            continue
        try:
            if len(row) == 4:
                # date, description, amount, balance
                date_str = _parse_date(row[0])
                description = row[1].strip()
                amount_raw = row[2].strip().replace("$", "").replace(",", "")
                balance_raw = row[3].strip().replace("$", "").replace(",", "")
                amount = float(amount_raw) if amount_raw else 0.0
                balance = float(balance_raw) if balance_raw else None
            elif len(row) == 3:
                date_str = _parse_date(row[0])
                description = row[1].strip()
                amount_raw = row[2].strip().replace("$", "").replace(",", "")
                amount = float(amount_raw) if amount_raw else 0.0
                balance = None
            else:
                # Try generic: first col=date, second col=desc, find amount-like col
                date_str = _parse_date(row[0])
                description = row[1].strip()
                amount = float(row[2].strip().replace("$", "").replace(",", ""))
                balance = None

            parsed.append({
                "date": date_str,
                "description": description,
                "amount": amount,
                "balance": balance,
                "import_hash": _make_hash(date_str, description, amount),
            })
        except (ValueError, IndexError):
            continue
    return parsed


def build_preview(parsed_rows: list[dict], existing_hashes: set[str]) -> list[ImportPreviewRow]:
    seen = set()
    preview = []
    for i, row in enumerate(parsed_rows):
        h = row["import_hash"]
        if h in existing_hashes:
            status = "duplicate"
        elif h in seen:
            status = "ambiguous"
        else:
            status = "new"
        seen.add(h)
        preview.append(ImportPreviewRow(
            row_index=i,
            date=row["date"],
            description=row["description"],
            amount=row["amount"],
            balance=row["balance"],
            status=status,
            import_hash=h,
        ))
    return preview
