"""
Brightloop Nexus - Financial Data Models
Team 3: Billing & Financial Engine
"""

from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class TaxCategory(str, Enum):
    CGST = "CGST"
    SGST = "SGST"
    IGST = "IGST"
    VAT = "VAT"
    SALES_TAX = "SALES_TAX"
    CUSTOM = "CUSTOM"


class TaxType(str, Enum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"


class TaxMode(str, Enum):
    INTRA_STATE = "intra_state"
    INTER_STATE = "inter_state"
    NONE = "none"


class TaxRule(BaseModel):
    id: str
    name: str
    type: TaxType = TaxType.PERCENTAGE
    rate: Decimal  # e.g. 9.0 for 9%
    category: TaxCategory
    region: str = "IN"
    applicable_to: List[str] = Field(default_factory=lambda: ["all"])
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


class TaxBreakdownItem(BaseModel):
    tax_rule_id: str
    tax_name: str
    category: str
    rate: Decimal
    taxable_amount: Decimal
    tax_amount: Decimal


class TaxCalculationResult(BaseModel):
    subtotal: Decimal
    discount_amount: Decimal
    taxable_amount: Decimal
    tax_breakdown: List[TaxBreakdownItem]
    total_tax: Decimal
    total: Decimal


class DiscountType(str, Enum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"


class Discount(BaseModel):
    id: str
    code: str
    name: str
    type: DiscountType = DiscountType.PERCENTAGE
    value: Decimal  # e.g. 20.0 for 20% or 500.0 for $500
    max_discount_amount: Optional[Decimal] = None
    currency: str = "USD"
    valid_from: datetime
    valid_until: datetime
    max_usages: int = 0  # 0 = unlimited
    current_usages: int = 0
    eligible_plan_ids: List[str] = Field(default_factory=lambda: ["all"])
    eligible_customer_ids: List[str] = Field(default_factory=lambda: ["all"])
    min_order_amount: Decimal = Decimal("0")
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)


class DiscountValidationResult(BaseModel):
    valid: bool
    error: Optional[str] = None
    discount_amount: Decimal = Decimal("0")
    applied_discount: Optional[Discount] = None


class InvoiceStatus(str, Enum):
    DRAFT = "draft"
    ISSUED = "issued"
    UNPAID = "unpaid"
    PARTIALLY_PAID = "partially_paid"
    PAID = "paid"
    OVERDUE = "overdue"
    VOID = "void"
    UNCOLLECTIBLE = "uncollectible"


class InvoiceItem(BaseModel):
    description: str = ""
    quantity: int = 1
    unit_price: Decimal
    discount: Decimal = Decimal("0")
    tax_breakdown: List[TaxBreakdownItem] = Field(default_factory=list)
    subtotal: Decimal
    tax_amount: Decimal
    total: Decimal


class Invoice(BaseModel):
    id: str
    invoice_number: str
    customer_id: str
    customer_name: str
    subscription_id: Optional[str] = None
    quotation_id: Optional[str] = None
    items: List[InvoiceItem] = Field(default_factory=list)
    subtotal: Decimal
    total_discount: Decimal = Decimal("0")
    total_tax: Decimal = Decimal("0")
    total: Decimal
    amount_paid: Decimal = Decimal("0")
    amount_due: Decimal
    currency: str = "USD"
    status: InvoiceStatus = InvoiceStatus.UNPAID
    issue_date: datetime
    due_date: datetime
    paid_at: Optional[datetime] = None
    notes: str = ""
    tax_mode: TaxMode = TaxMode.INTRA_STATE
    discount_code: Optional[str] = None
    billing_period_key: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class PaymentMethod(str, Enum):
    CARD = "card"
    WIRE = "wire"
    ACH = "ach"
    UPI = "upi"
    BANK_TRANSFER = "bank_transfer"
    SIMULATION = "simulation"


class PaymentStatus(str, Enum):
    PENDING = "pending"
    SUCCEEDED = "succeeded"
    FAILED = "failed"
    REFUNDED = "refunded"
    PARTIALLY_REFUNDED = "partially_refunded"


class Payment(BaseModel):
    id: str
    payment_number: str
    invoice_id: str
    invoice_number: str
    customer_id: str
    customer_name: str
    amount: Decimal
    currency: str = "USD"
    method: PaymentMethod = PaymentMethod.CARD
    status: PaymentStatus = PaymentStatus.SUCCEEDED
    is_simulated: bool = False
    transaction_ref: str
    failure_reason: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class RefundStatus(str, Enum):
    REQUESTED = "requested"
    APPROVED = "approved"
    COMPLETED = "completed"
    REJECTED = "rejected"


class Refund(BaseModel):
    id: str
    refund_number: str
    payment_id: str
    payment_number: str
    invoice_id: str
    invoice_number: str
    customer_id: str
    customer_name: str
    amount: Decimal
    currency: str = "USD"
    reason: str
    status: RefundStatus = RefundStatus.REQUESTED
    is_simulated: bool = False
    requested_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None


class ReconciliationResult(BaseModel):
    id: str
    run_at: datetime
    fully_paid_invoices: List[str]
    partially_paid_invoices: List[str]
    overpayments: List[Dict[str, Any]]
    underpayments: List[Dict[str, Any]]
    unmatched_payments: List[str]
    duplicate_transactions: List[str]
    currency_mismatches: List[str]
    overdue_invoices: List[str]
    summary: Dict[str, Decimal]
