"""
Brightloop Nexus - Tax Engine
Team 3: Billing & Financial Engine

Configurable tax rules: CGST, SGST, IGST.
High-precision Decimal calculations preventing floating-point imprecision.
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional
from .models import TaxRule, TaxCategory, TaxType, TaxMode, TaxBreakdownItem, TaxCalculationResult

TWO_PLACES = Decimal("0.01")


def round_money(amount: Decimal) -> Decimal:
    """Round monetary amount safely using ROUND_HALF_UP."""
    return amount.quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


DEFAULT_TAX_RULES: List[TaxRule] = [
    TaxRule(
        id="tax-cgst-9",
        name="CGST @ 9%",
        type=TaxType.PERCENTAGE,
        rate=Decimal("9.00"),
        category=TaxCategory.CGST,
        region="IN",
        applicable_to=["all"],
        active=True,
    ),
    TaxRule(
        id="tax-sgst-9",
        name="SGST @ 9%",
        type=TaxType.PERCENTAGE,
        rate=Decimal("9.00"),
        category=TaxCategory.SGST,
        region="IN",
        applicable_to=["all"],
        active=True,
    ),
    TaxRule(
        id="tax-igst-18",
        name="IGST @ 18%",
        type=TaxType.PERCENTAGE,
        rate=Decimal("18.00"),
        category=TaxCategory.IGST,
        region="IN-INTER",
        applicable_to=["all"],
        active=False,
    ),
]


def resolve_tax_rules(
    all_rules: List[TaxRule],
    tax_mode: TaxMode = TaxMode.INTRA_STATE,
    product_id: Optional[str] = None,
) -> List[TaxRule]:
    """Resolve applicable tax rules based on transaction mode and product."""
    if tax_mode == TaxMode.NONE:
        return []

    applicable: List[TaxRule] = []
    for rule in all_rules:
        if tax_mode == TaxMode.INTER_STATE:
            if rule.category == TaxCategory.IGST:
                applicable.append(rule)
        elif tax_mode == TaxMode.INTRA_STATE:
            if rule.active and rule.category in (TaxCategory.CGST, TaxCategory.SGST):
                applicable.append(rule)

    if product_id:
        applicable = [
            r for r in applicable
            if "all" in r.applicable_to or product_id in r.applicable_to
        ]

    return applicable


def calculate_tax(
    subtotal: Decimal,
    discount_amount: Decimal,
    applicable_rules: List[TaxRule],
) -> TaxCalculationResult:
    """
    Calculate taxes on taxable amount (subtotal - discount).
    Uses Decimal arithmetic throughout.
    """
    subtotal = round_money(subtotal)
    discount = round_money(min(discount_amount, subtotal))
    taxable_amount = round_money(subtotal - discount)

    breakdown: List[TaxBreakdownItem] = []
    total_tax = Decimal("0.00")

    for rule in applicable_rules:
        if rule.type == TaxType.PERCENTAGE:
            tax_amount = round_money((taxable_amount * rule.rate) / Decimal("100"))
        else:
            tax_amount = round_money(rule.rate)

        breakdown.append(
            TaxBreakdownItem(
                tax_rule_id=rule.id,
                tax_name=rule.name,
                category=rule.category.value,
                rate=rule.rate,
                taxable_amount=taxable_amount,
                tax_amount=tax_amount,
            )
        )
        total_tax += tax_amount

    total = round_money(taxable_amount + total_tax)

    return TaxCalculationResult(
        subtotal=subtotal,
        discount_amount=discount,
        taxable_amount=taxable_amount,
        tax_breakdown=breakdown,
        total_tax=total_tax,
        total=total,
    )
