"""
Brightloop Nexus - Central Billing Engine
Team 3: Billing & Financial Engine
"""

from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Optional, Tuple
from .models import (
    Invoice,
    InvoiceItem,
    InvoiceStatus,
    TaxMode,
    TaxRule,
    Discount,
)
from .tax import calculate_tax, resolve_tax_rules, round_money
from .discounts import validate_discount

_invoice_sequence = 100
_used_invoice_numbers = set()


def generate_invoice_number() -> str:
    """Generate unique sequential invoice number safely."""
    global _invoice_sequence
    while True:
        _invoice_sequence += 1
        num = f"INV-2026-{str(_invoice_sequence).zfill(3)}"
        if num not in _used_invoice_numbers:
            _used_invoice_numbers.add(num)
            return num


def generate_billing_period_key(
    subscription_id: str,
    billing_interval: str,
    period_start: datetime,
) -> str:
    """Generate idempotency key for recurring billing."""
    year = period_start.year
    month = str(period_start.month).zfill(2)

    if billing_interval == "monthly":
        return f"{subscription_id}_{year}-{month}"
    elif billing_interval == "quarterly":
        quarter = (period_start.month - 1) // 3 + 1
        return f"{subscription_id}_{year}-Q{quarter}"
    elif billing_interval == "annual":
        return f"{subscription_id}_{year}"
    return f"{subscription_id}_{year}-{month}"


def create_invoice(
    customer_id: str,
    customer_name: str,
    plan_name: str,
    unit_price: Decimal,
    quantity: int = 1,
    discount_code: Optional[str] = None,
    tax_mode: TaxMode = TaxMode.INTRA_STATE,
    all_tax_rules: Optional[List[TaxRule]] = None,
    all_discounts: Optional[List[Discount]] = None,
    subscription_id: Optional[str] = None,
    quotation_id: Optional[str] = None,
    billing_period_key: Optional[str] = None,
    due_days: int = 14,
    notes: str = "",
    currency: str = "USD",
    existing_invoices: Optional[List[Invoice]] = None,
) -> Tuple[Optional[Invoice], Optional[str]]:
    """
    Generate an authoritative invoice with full discount and tax breakdowns.
    Enforces idempotency and prevents duplicates.
    """
    if all_tax_rules is None:
        all_tax_rules = []
    if all_discounts is None:
        all_discounts = []
    if existing_invoices is None:
        existing_invoices = []

    # Idempotency check: duplicate billing_period_key prevention
    if billing_period_key:
        for inv in existing_invoices:
            if inv.billing_period_key == billing_period_key:
                return None, f"Invoice already exists for billing period key: {billing_period_key}"

    qty = max(1, quantity)
    subtotal = round_money(unit_price * Decimal(qty))

    # Discount resolution
    discount_amount = Decimal("0.00")
    if discount_code:
        disc_res = validate_discount(
            discount_code,
            all_discounts,
            subtotal,
            currency=currency,
        )
        if not disc_res.valid:
            return None, disc_res.error
        discount_amount = disc_res.discount_amount
        if disc_res.applied_discount:
            disc_res.applied_discount.current_usages += 1

    # Tax resolution
    applicable_taxes = resolve_tax_rules(all_tax_rules, tax_mode)
    tax_result = calculate_tax(subtotal, discount_amount, applicable_taxes)

    # Line item
    item = InvoiceItem(
        description=f"{plan_name} Subscription",
        quantity=qty,
        unit_price=unit_price,
        discount=discount_amount,
        tax_breakdown=tax_result.tax_breakdown,
        subtotal=subtotal,
        tax_amount=tax_result.total_tax,
        total=tax_result.total,
    )

    now = datetime.utcnow()
    due_date = now + timedelta(days=due_days)

    invoice = Invoice(
        id=f"inv-{int(now.timestamp() * 1000)}",
        invoice_number=generate_invoice_number(),
        customer_id=customer_id,
        customer_name=customer_name,
        subscription_id=subscription_id,
        quotation_id=quotation_id,
        items=[item],
        subtotal=tax_result.subtotal,
        total_discount=discount_amount,
        total_tax=tax_result.total_tax,
        total=tax_result.total,
        amount_paid=Decimal("0.00"),
        amount_due=tax_result.total,
        currency=currency,
        status=InvoiceStatus.UNPAID,
        issue_date=now,
        due_date=due_date,
        notes=notes,
        tax_mode=tax_mode,
        discount_code=discount_code,
        billing_period_key=billing_period_key,
        created_at=now,
        updated_at=now,
    )

    return invoice, None
