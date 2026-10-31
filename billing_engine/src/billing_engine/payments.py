"""
Brightloop Nexus - Payments, Refunds & Reconciliation Engines
Team 3: Billing & Financial Engine
"""

from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Tuple, Dict, Any
from .models import (
    Invoice,
    InvoiceStatus,
    Payment,
    PaymentMethod,
    PaymentStatus,
    Refund,
    RefundStatus,
    ReconciliationResult,
)
from .tax import round_money

_pay_seq = 100
_ref_seq = 100
_recon_seq = 0


def generate_payment_number() -> str:
    global _pay_seq
    _pay_seq += 1
    return f"PAY-2026-{str(_pay_seq).zfill(3)}"


def generate_refund_number() -> str:
    global _ref_seq
    _ref_seq += 1
    return f"REF-2026-{str(_ref_seq).zfill(3)}"


def record_payment(
    invoice: Invoice,
    amount: Decimal,
    method: PaymentMethod = PaymentMethod.CARD,
    is_simulated: bool = False,
    transaction_ref: Optional[str] = None,
    existing_payments: Optional[List[Payment]] = None,
) -> Tuple[Optional[Payment], Optional[str]]:
    """Record an authoritative or simulated payment towards an invoice."""
    if invoice.status == InvoiceStatus.VOID:
        return None, "Cannot pay a voided invoice."
    if invoice.status == InvoiceStatus.PAID:
        return None, "Invoice is already fully paid."

    amount = round_money(amount)
    if amount <= Decimal("0.00"):
        return None, "Payment amount must be greater than zero."

    # Prevent duplicate transaction reference
    if transaction_ref and existing_payments:
        if any(p.transaction_ref == transaction_ref for p in existing_payments):
            return None, f"Duplicate transaction reference: {transaction_ref}"

    now = datetime.utcnow()
    txn_id = transaction_ref or f"sim_txn_{int(now.timestamp())}"

    # Calculate actual payment applied
    applied_amount = min(amount, invoice.amount_due)

    payment = Payment(
        id=f"pay-{int(now.timestamp() * 1000)}",
        payment_number=generate_payment_number(),
        invoice_id=invoice.id,
        invoice_number=invoice.invoice_number,
        customer_id=invoice.customer_id,
        customer_name=invoice.customer_name,
        amount=applied_amount,
        currency=invoice.currency,
        method=method,
        status=PaymentStatus.SUCCEEDED,
        is_simulated=is_simulated,
        transaction_ref=txn_id,
        created_at=now,
    )

    # Update invoice status and amounts
    invoice.amount_paid = round_money(invoice.amount_paid + applied_amount)
    invoice.amount_due = round_money(invoice.total - invoice.amount_paid)

    if invoice.amount_due <= Decimal("0.00"):
        invoice.amount_due = Decimal("0.00")
        invoice.status = InvoiceStatus.PAID
        invoice.paid_at = now
    else:
        invoice.status = InvoiceStatus.PARTIALLY_PAID

    invoice.updated_at = now

    return payment, None


def request_refund(
    payment: Payment,
    amount: Optional[Decimal] = None,
    reason: str = "Customer requested refund",
    all_refunds: Optional[List[Refund]] = None,
) -> Tuple[Optional[Refund], Optional[str]]:
    """Request a refund for a succeeded payment."""
    if payment.status not in (PaymentStatus.SUCCEEDED, PaymentStatus.PARTIALLY_REFUNDED):
        return None, "Can only refund succeeded or partially refunded payments."

    if all_refunds is None:
        all_refunds = []

    # Calculate previously refunded amount
    completed_or_pending = [
        r for r in all_refunds
        if r.payment_id == payment.id and r.status in (RefundStatus.COMPLETED, RefundStatus.APPROVED, RefundStatus.REQUESTED)
    ]
    total_refunded = sum((r.amount for r in completed_or_pending), Decimal("0.00"))
    refundable = round_money(payment.amount - total_refunded)

    if refundable <= Decimal("0.00"):
        return None, "No refundable balance remaining on this payment."

    refund_amt = round_money(amount) if amount else refundable
    if refund_amt > refundable:
        return None, f"Requested refund amount ${refund_amt} exceeds refundable balance ${refundable}."

    now = datetime.utcnow()
    refund = Refund(
        id=f"ref-{int(now.timestamp() * 1000)}",
        refund_number=generate_refund_number(),
        payment_id=payment.id,
        payment_number=payment.payment_number,
        invoice_id=payment.invoice_id,
        invoice_number=payment.invoice_number,
        customer_id=payment.customer_id,
        customer_name=payment.customer_name,
        amount=refund_amt,
        currency=payment.currency,
        reason=reason,
        status=RefundStatus.REQUESTED,
        is_simulated=payment.is_simulated,
        requested_at=now,
    )

    return refund, None


def complete_refund(
    refund: Refund,
    invoice: Invoice,
    payment: Payment,
) -> None:
    """Complete an approved refund and update balances."""
    refund.status = RefundStatus.COMPLETED
    refund.completed_at = datetime.utcnow()

    # Update invoice balance
    invoice.amount_paid = round_money(invoice.amount_paid - refund.amount)
    invoice.amount_due = round_money(invoice.total - invoice.amount_paid)
    if invoice.amount_due > Decimal("0.00") and invoice.status == InvoiceStatus.PAID:
        invoice.status = InvoiceStatus.UNPAID
    invoice.updated_at = datetime.utcnow()

    # Update payment status
    if refund.amount >= payment.amount:
        payment.status = PaymentStatus.REFUNDED
    else:
        payment.status = PaymentStatus.PARTIALLY_REFUNDED


def run_reconciliation(
    invoices: List[Invoice],
    payments: List[Payment],
    refunds: List[Refund],
) -> ReconciliationResult:
    """Run full financial reconciliation across invoices, payments, and refunds."""
    global _recon_seq
    _recon_seq += 1
    now = datetime.utcnow()

    fully_paid: List[str] = []
    partially_paid: List[str] = []
    overpayments: List[Dict[str, Any]] = []
    underpayments: List[Dict[str, Any]] = []
    unmatched_payments: List[str] = []
    duplicate_transactions: List[str] = []
    currency_mismatches: List[str] = []
    overdue_invoices: List[str] = []

    invoice_map = {inv.id: inv for inv in invoices}

    for inv in invoices:
        if inv.status == InvoiceStatus.VOID:
            continue

        inv_payments = [p for p in payments if p.invoice_id == inv.id and p.status == PaymentStatus.SUCCEEDED]
        total_paid = sum((p.amount for p in inv_payments), Decimal("0.00"))

        for p in inv_payments:
            if p.currency != inv.currency:
                currency_mismatches.append(p.id)

        if total_paid >= inv.total and inv.total > Decimal("0.00"):
            fully_paid.append(inv.id)
            if total_paid > inv.total:
                overpayments.append({"invoice_id": inv.id, "excess": str(total_paid - inv.total)})
        elif Decimal("0.00") < total_paid < inv.total:
            partially_paid.append(inv.id)
            underpayments.append({"invoice_id": inv.id, "shortfall": str(inv.total - total_paid)})

        if inv.status in (InvoiceStatus.UNPAID, InvoiceStatus.OVERDUE, InvoiceStatus.PARTIALLY_PAID):
            if inv.due_date < now:
                overdue_invoices.append(inv.id)
                inv.status = InvoiceStatus.OVERDUE

    # Unmatched payments
    for p in payments:
        if p.invoice_id not in invoice_map:
            unmatched_payments.append(p.id)

    # Duplicate transactions
    seen_refs: Dict[str, str] = {}
    for p in payments:
        if p.transaction_ref in seen_refs:
            duplicate_transactions.append(p.id)
        else:
            seen_refs[p.transaction_ref] = p.id

    total_invoiced = sum((inv.total for inv in invoices if inv.status != InvoiceStatus.VOID), Decimal("0.00"))
    total_collected = sum((p.amount for p in payments if p.status == PaymentStatus.SUCCEEDED), Decimal("0.00"))
    total_outstanding = sum((inv.amount_due for inv in invoices if inv.status in (InvoiceStatus.UNPAID, InvoiceStatus.OVERDUE, InvoiceStatus.PARTIALLY_PAID)), Decimal("0.00"))
    total_overdue = sum((inv.amount_due for inv in invoices if inv.status == InvoiceStatus.OVERDUE), Decimal("0.00"))
    total_refunded = sum((r.amount for r in refunds if r.status == RefundStatus.COMPLETED), Decimal("0.00"))

    return ReconciliationResult(
        id=f"recon-{int(now.timestamp())}-{_recon_seq}",
        run_at=now,
        fully_paid_invoices=fully_paid,
        partially_paid_invoices=partially_paid,
        overpayments=overpayments,
        underpayments=underpayments,
        unmatched_payments=unmatched_payments,
        duplicate_transactions=duplicate_transactions,
        currency_mismatches=currency_mismatches,
        overdue_invoices=overdue_invoices,
        summary={
            "total_invoiced": total_invoiced,
            "total_collected": total_collected,
            "total_outstanding": total_outstanding,
            "total_overdue": total_overdue,
            "total_refunded": total_refunded,
        },
    )
