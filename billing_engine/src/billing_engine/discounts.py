"""
Brightloop Nexus - Discount Manager
Team 3: Billing & Financial Engine

Validates percentage and fixed discounts, caps, dates, limits, and eligibility.
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional
from .models import Discount, DiscountType, DiscountValidationResult
from .tax import round_money

DEFAULT_DISCOUNTS: List[Discount] = [
    Discount(
        id="disc-1",
        code="LAUNCH20",
        name="Launch Promotion 20% Off",
        type=DiscountType.PERCENTAGE,
        value=Decimal("20.00"),
        max_discount_amount=Decimal("2000.00"),
        currency="USD",
        valid_from=datetime(2026, 1, 1),
        valid_until=datetime(2027, 12, 31, 23, 59, 59),
        max_usages=100,
        current_usages=2,
    ),
    Discount(
        id="disc-2",
        code="FLAT500",
        name="$500 Flat Discount",
        type=DiscountType.FIXED,
        value=Decimal("500.00"),
        currency="USD",
        valid_from=datetime(2026, 6, 1),
        valid_until=datetime(2027, 6, 30, 23, 59, 59),
        max_usages=50,
        current_usages=1,
        min_order_amount=Decimal("1000.00"),
    ),
    Discount(
        id="disc-3",
        code="ENTERPRISE10",
        name="Enterprise Loyalty 10%",
        type=DiscountType.PERCENTAGE,
        value=Decimal("10.00"),
        max_discount_amount=Decimal("5000.00"),
        currency="USD",
        valid_from=datetime(2026, 1, 1),
        valid_until=datetime(2027, 12, 31, 23, 59, 59),
        max_usages=0,
        current_usages=0,
        eligible_plan_ids=["plan-pro", "plan-annual-pro"],
    ),
]


def validate_discount(
    code: str,
    all_discounts: List[Discount],
    subtotal: Decimal,
    plan_id: Optional[str] = None,
    customer_id: Optional[str] = None,
    currency: str = "USD",
    now: Optional[datetime] = None,
) -> DiscountValidationResult:
    """Validate a discount code against order criteria and calculate discount."""
    if not now:
        now = datetime.utcnow()

    discount = next(
        (d for d in all_discounts if d.code.upper() == code.upper()),
        None,
    )

    if not discount:
        return DiscountValidationResult(valid=False, error="Discount code not found.")

    if not discount.active:
        return DiscountValidationResult(valid=False, error="Discount code is no longer active.")

    if discount.currency != currency:
        return DiscountValidationResult(
            valid=False,
            error=f"Discount is not valid for currency {currency}.",
        )

    if discount.valid_from > now:
        return DiscountValidationResult(valid=False, error="Discount code is not yet valid.")

    if discount.valid_until < now:
        return DiscountValidationResult(valid=False, error="Discount code has expired.")

    if discount.max_usages > 0 and discount.current_usages >= discount.max_usages:
        return DiscountValidationResult(
            valid=False,
            error="Discount code has reached its maximum usage limit.",
        )

    if discount.eligible_plan_ids and "all" not in discount.eligible_plan_ids:
        if plan_id and plan_id not in discount.eligible_plan_ids:
            return DiscountValidationResult(
                valid=False,
                error="Discount code is not valid for this plan.",
            )

    if discount.eligible_customer_ids and "all" not in discount.eligible_customer_ids:
        if customer_id and customer_id not in discount.eligible_customer_ids:
            return DiscountValidationResult(
                valid=False,
                error="Discount code is not valid for this customer.",
            )

    if discount.min_order_amount > Decimal("0") and subtotal < discount.min_order_amount:
        return DiscountValidationResult(
            valid=False,
            error=f"Minimum order amount of ${discount.min_order_amount} required.",
        )

    # Calculate discount amount
    if discount.type == DiscountType.PERCENTAGE:
        raw_discount = (subtotal * discount.value) / Decimal("100")
        if discount.max_discount_amount and raw_discount > discount.max_discount_amount:
            raw_discount = discount.max_discount_amount
    else:
        raw_discount = discount.value

    discount_amount = round_money(min(raw_discount, subtotal))

    return DiscountValidationResult(
        valid=True,
        discount_amount=discount_amount,
        applied_discount=discount,
    )
