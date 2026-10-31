"""
Brightloop Nexus - Financial Reporting & Analytics
Team 3: Billing & Financial Engine
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Dict, Any, Optional, Tuple
from .models import Invoice, InvoiceStatus, Payment, PaymentStatus, Refund, RefundStatus
from .tax import round_money


def compute_financial_summary(
    invoices: List[Invoice],
    payments: List[Payment],
    refunds: List[Refund],
    active_subscription_prices: Optional[List[Tuple[Decimal, str]]] = None,
) -> Dict[str, Any]:
    """
    Compute authoritative financial metrics from real records.
    Differentiates invoiced receivables from collected cash.
    """
    now = datetime.utcnow()

    total_invoiced = sum(
        (inv.total for inv in invoices if inv.status != InvoiceStatus.VOID),
        Decimal("0.00"),
    )
    total_collected = sum(
        (p.amount for p in payments if p.status == PaymentStatus.SUCCEEDED),
        Decimal("0.00"),
    )
    outstanding_ar = sum(
        (inv.amount_due for inv in invoices if inv.status in (InvoiceStatus.UNPAID, InvoiceStatus.OVERDUE, InvoiceStatus.PARTIALLY_PAID)),
        Decimal("0.00"),
    )

    overdue_invoices = [
        inv for inv in invoices
        if inv.status in (InvoiceStatus.UNPAID, InvoiceStatus.OVERDUE, InvoiceStatus.PARTIALLY_PAID) and inv.due_date < now
    ]
    overdue_amount = sum((inv.amount_due for inv in overdue_invoices), Decimal("0.00"))

    total_refunded = sum(
        (r.amount for r in refunds if r.status == RefundStatus.COMPLETED),
        Decimal("0.00"),
    )

    # MRR / ARR calculation
    mrr = Decimal("0.00")
    if active_subscription_prices:
        for price, interval in active_subscription_prices:
            if interval == "monthly":
                mrr += price
            elif interval == "quarterly":
                mrr += round_money(price / Decimal("3"))
            elif interval == "annual":
                mrr += round_money(price / Decimal("12"))
            else:
                mrr += price
    arr = round_money(mrr * Decimal("12"))

    # Collection efficiency
    collection_rate = Decimal("100.00")
    if total_invoiced > Decimal("0.00"):
        collection_rate = round_money((total_collected / total_invoiced) * Decimal("100"))

    # Payment statistics
    total_txns = len(payments)
    succeeded_txns = len([p for p in payments if p.status == PaymentStatus.SUCCEEDED])
    failed_txns = len([p for p in payments if p.status == PaymentStatus.FAILED])
    success_rate = round_money(Decimal(succeeded_txns) / Decimal(total_txns) * Decimal("100")) if total_txns > 0 else Decimal("100.00")

    return {
        "total_invoiced": str(total_invoiced),
        "total_collected": str(total_collected),
        "outstanding_receivables": str(outstanding_ar),
        "overdue_invoices_count": len(overdue_invoices),
        "overdue_amount": str(overdue_amount),
        "total_refunded": str(total_refunded),
        "monthly_recurring_revenue": str(mrr),
        "annual_recurring_revenue": str(arr),
        "collection_efficiency_percent": str(collection_rate),
        "payment_success_rate": str(success_rate),
        "total_payment_attempts": total_txns,
        "succeeded_payments_count": succeeded_txns,
        "failed_payments_count": failed_txns,
    }
