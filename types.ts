
export enum UserRole {
  ADMIN = 'admin',
  SALESPERSON = 'salesperson'
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  createdAt: string;
}

export interface Category {
  id: string;
  name: string;
  createdAt: string;
}

export interface InventoryLog {
  id: string;
  itemId: string;
  itemName: string;
  changeType: 'addition' | 'reduction' | 'adjustment' | 'restock' | 'sale' | 'return' | 'deletion' | 'bulk_update';
  previousQuantity: number;
  newQuantity: number;
  changeAmount: number;
  reason: string;
  performedBy: string;
  createdAt: string;
}

export interface Item {
  id: string;
  name: string;
  sku: string;
  categoryId: string | null;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  quantityInStock: number;
  reorderLevel: number;
  expiryDate?: string;
  notes?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export enum SaleStatus {
  COMPLETED = 'completed',
  CANCELED = 'canceled',
  RETURNED = 'returned'
}

export enum PaymentMethod {
  CASH = 'cash',
  BANK_TRANSFER = 'bank_transfer',
  CARD = 'card'
}

export interface Sale {
  id: string;
  saleNumber: string;
  status: SaleStatus;
  subtotal: number;
  additionalCharges: number;
  totalAmount: number;
  profitAmount: number;
  paymentMethod: PaymentMethod;
  createdBy: string;
  saleDate: string;
  createdAt: string;
  updatedAt: string;
  returnReason?: string;
}

export interface SaleItem {
  id: string;
  saleId: string;
  itemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  costPrice: number;
  lineTotal: number;
  profitMargin: number; 
  createdAt: string;
}

// POS WITHDRAWAL SYSTEM INTERFACES
export interface POSWithdrawalFloat {
  id: string;
  date: string;
  openingBalance: number;
  currentBalance: number;
  closingBalance: number | null;
  totalWithdrawalsProcessed: number;
  totalChargesEarned: number;
  status: 'active' | 'closed';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface POSWithdrawalTransaction {
  id: string;
  floatId: string;
  transactionNumber: string;
  customerName?: string;
  withdrawalAmount: number;
  serviceCharge: number;
  totalPaid: number;
  paymentMethod: 'card' | 'bank_transfer';
  createdBy: string;
  transactionDate: string;
  createdAt: string;
}

export interface POSCashTransfer {
  id: string;
  floatId: string;
  amount: number;
  source: 'shop_cash' | 'external';
  notes?: string;
  transferredBy: string;
  createdAt: string;
}

export interface POSChargeTier {
  id: string;
  minAmount: number;
  maxAmount: number;
  chargeAmount: number;
  isActive: boolean;
}

export interface Restock {
  id: string;
  supplierName: string;
  restockDate: string;
  totalAmount: number;
  notes?: string;
  createdBy: string;
  createdAt: string;
}

export interface RestockItem {
  id: string;
  restockId: string;
  itemId: string;
  quantity: number;
  unitCost: number;
  expiryDate?: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  message: string;
  response: string;
  createdAt: string;
}