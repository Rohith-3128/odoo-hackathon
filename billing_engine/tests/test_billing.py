"""
Automated Test Suite for Brightloop Nexus Billing Engine
Team 3: Billing & Financial Engine
"""

from datetime import datetime, timedelta
from decimal import Decimal
import pytest

from billing_engine.models import (
    InvoiceStatus,
    PaymentMethod,
    PaymentStatus,
    RefundStatus,
    TaxCategory,
    TaxMode,
    TaxRule,
    TaxType,
    Discount,
    DiscountType,
)
from billing_engine.tax import calculate_tax, resolve_tax_rules, round_money
from billing_engine.discounts import validate_discount
from billing_engine.engine import (
    create_invoice,
    generate_invoice_number,
    generate_billing_period_key,
)
from billing_engine.payments import (
    record_payment,
    request_refund,
    complete_refund,
    run_reconciliation,
)
from billing_engine.reports import compute_financial_summary


def test_round_money():
    assert round_money(Decimal("10.005")) == Decimal("10.01")
    assert round_money(Decimal("10.004")) == Decimal("10.00")
    assert round_money(Decimal("4995.0000")) == Decimal("4995.00")


def test_tax_calculation_intra_state_gst():
    rules = [
        TaxRule(
            id="t1",
            name="CGST 9%",
            type=TaxType.PERCENTAGE,
            rate=Decimal("9.00"),
            category=TaxCategory.CGST,
        ),
        TaxRule(
            id="t2",
            name="SGST 9%",
            type=TaxType.PERCENTAGE,
            rate=Decimal("9.00"),
            category=TaxCategory.SGST,
        ),
    ]
    # $1000 subtotal, $100 discount -> $900 taxable
    result = calculate_tax(
        subtotal=Decimal("1000.00"),
        discount_amount=Decimal("100.00"),
        applicable_rules=rules,
    )
    assert result.subtotal == Decimal("1000.00")
    assert result.discount_amount == Decimal("100.00")
    assert result.taxable_amount == Decimal("900.00")
    # CGST 9% of 900 = 81.00; SGST 9% of 900 = 81.00; Total Tax = 162.00
    assert result.total_tax == Decimal("162.00")
    assert result.total == Decimal("1062.00")
    assert len(result.tax_breakdown) == 2


def test_tax_calculation_inter_state_igst():
    rules = [
        TaxRule(
            id="t3",
            name="IGST 18%",
            type=TaxType.PERCENTAGE,
            rate=Decimal("18.00"),
            category=TaxCategory.IGST,
        ),
    ]
    result = calculate_tax(
        subtotal=Decimal("2400.00"),
        discount_amount=Decimal("0.00"),
        applicable_rules=rules,
    )
    assert result.taxable_amount == Decimal("2400.00")
    # 18% of 2400 = 432.00
    assert result.total_tax == Decimal("432.00")
    assert result.total == Decimal("2832.00")


def test_discount_validation_and_cap():
    discounts = [
        Discount(
            id="d1",
            code="SAVE20",
            name="20% off with $200 cap",
            type=DiscountType.PERCENTAGE,
            value=Decimal("20.00"),
            max_discount_amount=Decimal("200.00"),
            valid_from=datetime(2026, 1, 1),
            valid_until=datetime(2027, 12, 31),
        )
    ]
    # Order of $2000 -> 20% would be $400, but capped at $200
    res = validate_discount("SAVE20", discounts, Decimal("2000.00"))
    assert res.valid is True
    assert res.discount_amount == Decimal("200.00")

    # Expired discount check
    expired_disc = [
        Discount(
            id="d2",
            code="EXPIRED",
            name="Old discount",
            type=DiscountType.FIXED,
            value=Decimal("50.00"),
            valid_from=datetime(2025, 1, 1),
            valid_until=datetime(2025, 12, 31),
        )
    ]
    res_exp = validate_discount("EXPIRED", expired_disc, Decimal("500.00"), now=datetime(2026, 10, 1))
    assert res_exp.valid is False
    assert "expired" in res_exp.error.lower()


def test_invoice_creation_and_numbering():
    num1 = generate_invoice_number()
    num2 = generate_invoice_number()
    assert num1 != num2
    assert num1.startswith("INV-2026-")

    inv, err = create_invoice(
        customer_id="cust-1",
        customer_name="Aurora Protocol",
        plan_name="Scale Enterprise",
        unit_price=Decimal("4995.00"),
        quantity=1,
        tax_mode=TaxMode.NONE,
    )
    assert err is None
    assert inv is not None
    assert inv.customer_id == "cust-1"
    assert inv.total == Decimal("4995.00")
    assert inv.amount_due == Decimal("4995.00")
    assert inv.amount_paid == Decimal("0.00")
    assert inv.status == InvoiceStatus.UNPAID


def test_idempotent_duplicate_invoice_prevention():
    key = generate_billing_period_key("sub-201", "monthly", datetime(2026, 10, 1))
    assert key == "sub-201_2026-10"

    inv1, err1 = create_invoice(
        customer_id="cust-1",
        customer_name="Aurora Protocol",
        plan_name="Scale Enterprise",
        unit_price=Decimal("4995.00"),
        billing_period_key=key,
        tax_mode=TaxMode.NONE,
    )
    assert err1 is None
    assert inv1 is not None

    # Attempting to create second invoice with the same key must fail
    inv2, err2 = create_invoice(
        customer_id="cust-1",
        customer_name="Aurora Protocol",
        plan_name="Scale Enterprise",
        unit_price=Decimal("4995.00"),
        billing_period_key=key,
        tax_mode=TaxMode.NONE,
        existing_invoices=[inv1],
    )
    assert inv2 is None
    assert "already exists" in err2


def test_partial_payment_and_full_payment():
    inv, _ = create_invoice(
        customer_id="cust-1",
        customer_name="Aurora Protocol",
        plan_name="Scale Enterprise",
        unit_price=Decimal("1000.00"),
        tax_mode=TaxMode.NONE,
    )

    # Partial payment of $400
    pay1, err1 = record_payment(inv, Decimal("400.00"), method=PaymentMethod.CARD)
    assert err1 is None
    assert pay1 is not None
    assert inv.amount_paid == Decimal("400.00")
    assert inv.amount_due == Decimal("600.00")
    assert inv.status == InvoiceStatus.PARTIALLY_PAID

    # Second payment of $600 to clear
    pay2, err2 = record_payment(inv, Decimal("600.00"), method=PaymentMethod.ACH)
    assert err2 is None
    assert pay2 is not None
    assert inv.amount_paid == Decimal("1000.00")
    assert inv.amount_due == Decimal("0.00")
    assert inv.status == InvoiceStatus.PAID
    assert inv.paid_at is not None


def test_refund_workflow_and_balance_enforcement():
    inv, _ = create_invoice(
        customer_id="cust-1",
        customer_name="Aurora Protocol",
        plan_name="Growth",
        unit_price=Decimal("500.00"),
        tax_mode=TaxMode.NONE,
    )
    pay, _ = record_payment(inv, Decimal("500.00"))

    # Refund request for $200
    ref, err = request_refund(pay, Decimal("200.00"), reason="Service dissatisfaction")
    assert err is None
    assert ref is not None
    assert ref.status == RefundStatus.REQUESTED
    assert ref.amount == Decimal("200.00")

    # Complete the refund
    complete_refund(ref, inv, pay)
    assert ref.status == RefundStatus.COMPLETED
    assert inv.amount_paid == Decimal("300.00")
    assert inv.amount_due == Decimal("200.00")
    assert inv.status == InvoiceStatus.UNPAID
    assert pay.status == PaymentStatus.PARTIALLY_REFUNDED

    # Excess refund attempt should fail
    ref_excess, err_excess = request_refund(pay, Decimal("400.00"), all_refunds=[ref])
    assert ref_excess is None
    assert "exceeds refundable balance" in err_excess


def test_reconciliation_engine():
    inv1, _ = create_invoice("c1", "Corp 1", "Plan A", Decimal("1000.00"), tax_mode=TaxMode.NONE)
    inv2, _ = create_invoice("c2", "Corp 2", "Plan B", Decimal("500.00"), tax_mode=TaxMode.NONE)

    # Set inv2 overdue
    inv2.due_date = datetime.utcnow() - timedelta(days=5)

    pay1, _ = record_payment(inv1, Decimal("1000.00"))

    result = run_reconciliation([inv1, inv2], [pay1], [])
    assert inv1.id in result.fully_paid_invoices
    assert inv2.id in result.overdue_invoices
    assert result.summary["total_invoiced"] == Decimal("1500.00")
    assert result.summary["total_collected"] == Decimal("1000.00")
    assert result.summary["total_outstanding"] == Decimal("500.00")


def test_financial_reports_summary():
    inv, _ = create_invoice("c1", "Acme", "Pro", Decimal("2000.00"), tax_mode=TaxMode.NONE)
    pay, _ = record_payment(inv, Decimal("1500.00"))

    summary = compute_financial_summary(
        invoices=[inv],
        payments=[pay],
        refunds=[],
        active_subscription_prices=[(Decimal("2000.00"), "monthly")],
    )

    assert summary["total_invoiced"] == "2000.00"
    assert summary["total_collected"] == "1500.00"
    assert summary["outstanding_receivables"] == "500.00"
    assert summary["monthly_recurring_revenue"] == "2000.00"
    assert summary["annual_recurring_revenue"] == "24000.00"
    assert summary["collection_efficiency_percent"] == "75.00"
    assert summary["payment_success_rate"] == "100.00"
