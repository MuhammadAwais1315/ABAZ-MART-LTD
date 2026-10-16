import { useEffect, useState } from "react"
import {
  Check,
  Copy,
  Eye,
  FileText,
  Mail,
  MapPin,
  Package,
  Phone,
  RefreshCw,
  Search,
  Truck,
  CreditCard,
  Building2,
  DollarSign,
  Clock,
  CheckCircle2,
  XCircle,
} from "lucide-react"
import { Badge, Button, Input, Modal, Select, Toast } from "../../components/ui"
import { formatPrice } from "../../utils/formatPrice"
import {
  AdminOrderItem,
  getAdminOrders,
  updateOrderStatus,
} from "../../services/admin"
import { OrderStatus, PaymentMethod } from "../../types/database"
import { OrderReceipt } from "../../components/checkout/OrderReceipt"

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  card: "Credit / Debit Card",
  bank_transfer: "Direct Bank Transfer (BACS)",
  paypal: "PayPal",
  cod: "Cash on Delivery",
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("All")
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderItem | null>(null)
  const [activeModalTab, setActiveModalTab] = useState<"details" | "receipt">("details")
  const [toastMessage, setToastMessage] = useState("")
  const [copiedAddress, setCopiedAddress] = useState(false)

  const showToast = (message: string) => {
    setToastMessage(message)
    window.setTimeout(() => setToastMessage(""), 3500)
  }

  const fetchOrders = async () => {
    setLoading(true)
    const { data } = await getAdminOrders()
    setOrders(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingId(orderId)
    const { error } = await updateOrderStatus(orderId, newStatus)
    setUpdatingId(null)

    if (error) {
      showToast(`Failed to update status: ${error.message}`)
    } else {
      setOrders((current) =>
        current.map((item) =>
          item.id === orderId ? { ...item, status: newStatus } : item,
        ),
      )
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: newStatus } : null))
      }
      showToast(`Order status updated to "${newStatus}"`)
    }
  }

  const handleCopyAddress = (order: AdminOrderItem) => {
    const fullAddress = `${order.customer}\n${order.shippingAddress}\n${order.shippingCity}, ${order.shippingPostalCode}\n${order.shippingCountry}\nPhone: ${order.phone || "N/A"}`
    navigator.clipboard.writeText(fullAddress)
    setCopiedAddress(true)
    showToast("Shipping address copied to clipboard")
    window.setTimeout(() => setCopiedAddress(false), 2500)
  }

  // Filter logic
  const filteredOrders = orders.filter((order) => {
    const matchesStatus =
      statusFilter === "All" || order.status.toLowerCase() === statusFilter.toLowerCase()
    const query = search.toLowerCase().trim()
    const matchesSearch =
      !query ||
      order.orderNumber.toLowerCase().includes(query) ||
      order.customer.toLowerCase().includes(query) ||
      (order.email && order.email.toLowerCase().includes(query)) ||
      order.shippingCity.toLowerCase().includes(query) ||
      order.shippingPostalCode.toLowerCase().includes(query)

    return matchesStatus && matchesSearch
  })

  // KPI calculations
  const totalOrdersCount = orders.length
  const pendingCount = orders.filter((o) => o.status === "Pending").length
  const processingCount = orders.filter((o) => o.status === "Processing" || o.status === "Shipped").length
  const deliveredCount = orders.filter((o) => o.status === "Delivered").length
  const totalRevenue = orders
    .filter((o) => o.status !== "Cancelled")
    .reduce((sum, o) => sum + o.total, 0)

  return (
    <>
      <div className="admin-page-head">
        <div>
          <p className="eyebrow">Fulfillment & Operations</p>
          <h1>Orders Management</h1>
          <p>
            Track live customer orders, manage fulfillment stages, view official invoices,
            and dispatch customer confirmation receipts.
          </p>
        </div>
        <Button
          variant="secondary"
          onClick={fetchOrders}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-5 bg-white border border-border rounded-xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted text-xs uppercase tracking-wider font-semibold">
            <span>Total Orders</span>
            <Package className="w-4 h-4 text-rose" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-serif font-bold text-ink">{totalOrdersCount}</span>
            <p className="text-[11px] text-muted mt-1">Recorded transactions</p>
          </div>
        </div>

        <div className="p-5 bg-white border border-border rounded-xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted text-xs uppercase tracking-wider font-semibold">
            <span>Pending Action</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-serif font-bold text-amber-600">{pendingCount}</span>
            <p className="text-[11px] text-muted mt-1">Awaiting dispatch</p>
          </div>
        </div>

        <div className="p-5 bg-white border border-border rounded-xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted text-xs uppercase tracking-wider font-semibold">
            <span>In Transit</span>
            <Truck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-serif font-bold text-blue-600">{processingCount}</span>
            <p className="text-[11px] text-muted mt-1">Processing or shipped</p>
          </div>
        </div>

        <div className="p-5 bg-white border border-border rounded-xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-muted text-xs uppercase tracking-wider font-semibold">
            <span>Active Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3">
            <span className="text-2xl font-serif font-bold text-emerald-700">
              {formatPrice(totalRevenue)}
            </span>
            <p className="text-[11px] text-muted mt-1">Delivered & active orders</p>
          </div>
        </div>
      </div>

      {/* Main Table Panel */}
      <section className="admin-panel admin-data-table">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-border pb-4 mb-4 overflow-x-auto text-xs">
          {[
            { id: "All", label: "All Orders", count: totalOrdersCount },
            { id: "Pending", label: "Pending", count: pendingCount },
            { id: "Processing", label: "Processing", count: orders.filter((o) => o.status === "Processing").length },
            { id: "Shipped", label: "Shipped", count: orders.filter((o) => o.status === "Shipped").length },
            { id: "Delivered", label: "Delivered", count: deliveredCount },
            { id: "Cancelled", label: "Cancelled", count: orders.filter((o) => o.status === "Cancelled").length },
          ].map((tab) => {
            const isActive = statusFilter.toLowerCase() === tab.id.toLowerCase()
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-rose text-white shadow-xs"
                    : "bg-light text-muted hover:text-ink hover:bg-neutral-200"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isActive ? "bg-white/20 text-white" : "bg-white text-muted"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>

        {/* Search Toolbar */}
        <div className="admin-table-toolbar">
          <div className="relative flex-1">
            <Input
              placeholder="Search by order number, customer name, email, city..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <span className="font-medium">
            {loading ? "Loading..." : `${filteredOrders.length} orders`}
          </span>
        </div>

        {/* Table Content */}
        <div className="table-scroll">
          <table className="admin-table-element">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Fulfillment Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted">
                    <div className="flex flex-col items-center gap-2">
                      <RefreshCw className="w-5 h-5 animate-spin text-rose" />
                      <span>Loading orders...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-muted">
                    <p className="text-base font-serif text-ink">No orders found</p>
                    <p className="text-xs mt-1">Try adjusting your search query or status filter.</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-light/50 transition-colors">
                    {/* Order Number & Date */}
                    <td>
                      <div>
                        <strong className="text-ink font-semibold">{order.orderNumber}</strong>
                        <small className="text-muted block mt-0.5">{order.date}</small>
                      </div>
                    </td>

                    {/* Customer */}
                    <td>
                      <div>
                        <strong className="text-ink block">{order.customer}</strong>
                        <small className="text-muted block">{order.email || "No email"}</small>
                      </div>
                    </td>

                    {/* Items */}
                    <td>
                      <div>
                        <span className="inline-flex items-center gap-1.5 font-medium text-xs text-ink">
                          <Package className="w-3.5 h-3.5 text-rose" />
                          {order.itemsCount} {order.itemsCount === 1 ? "item" : "items"}
                        </span>
                        {order.items && order.items.length > 0 && (
                          <small className="text-muted block truncate max-w-[180px]">
                            {order.items[0].productName}
                            {order.items.length > 1 ? ` +${order.items.length - 1} more` : ""}
                          </small>
                        )}
                      </div>
                    </td>

                    {/* Payment */}
                    <td>
                      <div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-ink">
                          {order.paymentMethod === "bank_transfer" ? (
                            <Building2 className="w-3.5 h-3.5 text-amber-600" />
                          ) : (
                            <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                          )}
                          {PAYMENT_METHOD_LABELS[order.paymentMethod] || order.paymentMethod}
                        </span>
                        <small className="block mt-0.5">
                          <Badge
                            tone={
                              order.paymentStatus === "paid"
                                ? "green"
                                : order.paymentStatus === "pending"
                                  ? "gold"
                                  : "rose"
                            }
                          >
                            {order.paymentStatus.toUpperCase()}
                          </Badge>
                        </small>
                      </div>
                    </td>

                    {/* Total */}
                    <td>
                      <div>
                        <strong className="text-ink font-bold text-sm">
                          {formatPrice(order.total)}
                        </strong>
                        {order.discount > 0 && (
                          <small className="text-emerald-600 block">
                            Save {formatPrice(order.discount)}
                          </small>
                        )}
                      </div>
                    </td>

                    {/* Fulfillment Status Select */}
                    <td>
                      <Select
                        value={order.status}
                        disabled={updatingId === order.id}
                        onChange={(event) =>
                          handleStatusChange(order.id, event.target.value as OrderStatus)
                        }
                      >
                        <option value="Pending">Pending</option>
                        <option value="Processing">Processing</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </Select>
                    </td>

                    {/* Actions */}
                    <td className="text-right">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setSelectedOrder(order)
                          setActiveModalTab("details")
                        }}
                        className="inline-flex items-center gap-1.5 text-xs py-1.5 px-3"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Inspect & Receipt</span>
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Comprehensive Order Inspection & Receipt Modal */}
      {selectedOrder && (
        <Modal
          open={Boolean(selectedOrder)}
          size="xl"
          title={`Order ${selectedOrder.orderNumber}`}
          onClose={() => setSelectedOrder(null)}
        >
          {/* Modal Header Subbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4 mb-5">
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted">
                Placed on <strong>{selectedOrder.date}</strong>
              </span>
              <Badge
                tone={
                  selectedOrder.status === "Delivered"
                    ? "green"
                    : selectedOrder.status === "Pending" || selectedOrder.status === "Processing"
                      ? "gold"
                      : "rose"
                }
              >
                {selectedOrder.status}
              </Badge>
            </div>

            {/* Quick Status Update in Modal */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted font-medium">Update Status:</span>
              <Select
                value={selectedOrder.status}
                disabled={updatingId === selectedOrder.id}
                onChange={(e) =>
                  handleStatusChange(selectedOrder.id, e.target.value as OrderStatus)
                }
              >
                <option value="Pending">Pending</option>
                <option value="Processing">Processing</option>
                <option value="Shipped">Shipped</option>
                <option value="Delivered">Delivered</option>
                <option value="Cancelled">Cancelled</option>
              </Select>
            </div>
          </div>

          {/* Modal Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-border pb-3 mb-5">
            <button
              type="button"
              onClick={() => setActiveModalTab("details")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                activeModalTab === "details"
                  ? "bg-rose text-white shadow-xs"
                  : "bg-light text-muted hover:text-ink"
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Fulfillment & Items</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveModalTab("receipt")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                activeModalTab === "receipt"
                  ? "bg-rose text-white shadow-xs"
                  : "bg-light text-muted hover:text-ink"
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Official Invoice & Resend Email</span>
            </button>
          </div>

          {/* Tab 1: Fulfillment & Customer Items */}
          {activeModalTab === "details" && (
            <div className="space-y-6">
              {/* Customer & Shipping Summary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Customer Contact */}
                <div className="p-4 bg-light/70 rounded-xl border border-border">
                  <div className="flex items-center gap-2 text-ink font-semibold text-xs mb-3">
                    <Mail className="w-4 h-4 text-rose" />
                    <span>Customer Contact</span>
                  </div>
                  <p className="text-sm font-semibold text-ink">{selectedOrder.customer}</p>
                  <p className="text-xs text-muted mt-1">
                    {selectedOrder.email ? (
                      <a
                        href={`mailto:${selectedOrder.email}`}
                        className="text-rose hover:underline"
                      >
                        {selectedOrder.email}
                      </a>
                    ) : (
                      "No email on file"
                    )}
                  </p>
                  <p className="text-xs text-muted mt-1">
                    {selectedOrder.phone ? (
                      <a
                        href={`tel:${selectedOrder.phone}`}
                        className="text-rose hover:underline flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        {selectedOrder.phone}
                      </a>
                    ) : (
                      "No phone provided"
                    )}
                  </p>
                </div>

                {/* Delivery Address */}
                <div className="p-4 bg-light/70 rounded-xl border border-border flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-ink font-semibold text-xs mb-3">
                      <span className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-rose" />
                        <span>Shipping Address</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyAddress(selectedOrder)}
                        className="text-rose hover:text-rose-700 text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                        title="Copy full shipping label"
                      >
                        {copiedAddress ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedAddress ? "Copied" : "Copy"}</span>
                      </button>
                    </div>
                    <p className="text-xs text-ink font-medium leading-relaxed">
                      {selectedOrder.shippingAddress}
                      <br />
                      {selectedOrder.shippingCity}, {selectedOrder.shippingPostalCode}
                      <br />
                      {selectedOrder.shippingCountry}
                    </p>
                  </div>
                </div>

                {/* Payment & Method */}
                <div className="p-4 bg-light/70 rounded-xl border border-border">
                  <div className="flex items-center gap-2 text-ink font-semibold text-xs mb-3">
                    <CreditCard className="w-4 h-4 text-rose" />
                    <span>Payment Information</span>
                  </div>
                  <p className="text-xs text-ink font-medium">
                    {PAYMENT_METHOD_LABELS[selectedOrder.paymentMethod] || selectedOrder.paymentMethod}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[11px] text-muted">Status:</span>
                    <Badge
                      tone={
                        selectedOrder.paymentStatus === "paid"
                          ? "green"
                          : selectedOrder.paymentStatus === "pending"
                            ? "gold"
                            : "rose"
                      }
                    >
                      {selectedOrder.paymentStatus.toUpperCase()}
                    </Badge>
                  </div>
                  {selectedOrder.paymentMethod === "bank_transfer" && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2">
                      Direct BACS / Faster Payments transfer requested.
                    </p>
                  )}
                </div>
              </div>

              {/* Order Items Table */}
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="bg-light px-4 py-2.5 border-b border-border text-xs font-semibold text-ink flex items-center justify-between">
                  <span>Order Items ({selectedOrder.items.length})</span>
                  <span>Amount</span>
                </div>
                <div className="divide-y divide-border">
                  {selectedOrder.items.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 flex items-center justify-between gap-4 hover:bg-light/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <img
                          src={item.productImage}
                          alt={item.productName}
                          className="w-12 h-14 object-cover rounded-lg border border-border"
                        />
                        <div>
                          <p className="text-xs font-semibold text-ink">{item.productName}</p>
                          <small className="text-[11px] text-muted block mt-0.5">
                            {item.productBrand} • Option: {item.selectedOption}
                          </small>
                          <small className="text-[11px] text-muted block">
                            Qty: {item.quantity} × {formatPrice(item.unitPrice)}
                          </small>
                        </div>
                      </div>
                      <div className="text-right">
                        <strong className="text-sm font-semibold text-ink">
                          {formatPrice(item.lineTotal)}
                        </strong>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Financial Summary */}
                <div className="bg-light/50 p-4 border-t border-border space-y-1.5 text-xs">
                  <div className="flex justify-between text-muted">
                    <span>Subtotal:</span>
                    <span>{formatPrice(selectedOrder.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Shipping:</span>
                    <span>
                      {selectedOrder.shipping === 0 ? "FREE" : formatPrice(selectedOrder.shipping)}
                    </span>
                  </div>
                  {selectedOrder.discount > 0 && (
                    <div className="flex justify-between text-emerald-600 font-medium">
                      <span>Discount:</span>
                      <span>-{formatPrice(selectedOrder.discount)}</span>
                    </div>
                  )}
                  {selectedOrder.tax > 0 && (
                    <div className="flex justify-between text-muted">
                      <span>VAT / Tax:</span>
                      <span>{formatPrice(selectedOrder.tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-serif font-bold text-ink border-t border-border pt-2 mt-2">
                    <span>Total Amount:</span>
                    <span className="text-rose">{formatPrice(selectedOrder.total)}</span>
                  </div>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex justify-between items-center pt-2">
                <Button
                  variant="secondary"
                  onClick={() => setActiveModalTab("receipt")}
                  className="flex items-center gap-2 text-xs"
                >
                  <FileText className="w-4 h-4 text-rose" />
                  <span>View Official PDF Invoice</span>
                </Button>
                <Button variant="primary" onClick={() => setSelectedOrder(null)}>
                  Close
                </Button>
              </div>
            </div>
          )}

          {/* Tab 2: Official Invoice & Email Receipt Component */}
          {activeModalTab === "receipt" && (
            <div className="space-y-4">
              <div className="bg-light/60 p-3.5 rounded-xl border border-border text-xs text-muted flex items-center justify-between">
                <span>
                  Official vector invoice ready for printing, download, or customer dispatch.
                </span>
                <span className="font-semibold text-ink">
                  {selectedOrder.orderNumber}
                </span>
              </div>

              {/* Official Receipt Component */}
              <OrderReceipt
                order={{
                  order_id: selectedOrder.id,
                  order_number: selectedOrder.orderNumber,
                  subtotal: selectedOrder.subtotal,
                  shipping: selectedOrder.shipping,
                  tax: selectedOrder.tax,
                  discount: selectedOrder.discount,
                  total: selectedOrder.total,
                  estimated_delivery: selectedOrder.date,
                }}
                items={selectedOrder.items.map((i) => ({
                  id: i.id,
                  name: i.productName,
                  brand: i.productBrand,
                  option: i.selectedOption,
                  price: i.unitPrice,
                  quantity: i.quantity,
                }))}
                customer={{
                  fullName: selectedOrder.customer,
                  phone: selectedOrder.phone || "",
                  address: selectedOrder.shippingAddress,
                  city: selectedOrder.shippingCity,
                  postalCode: selectedOrder.shippingPostalCode,
                  country: selectedOrder.shippingCountry,
                  email: selectedOrder.email,
                }}
                paymentMethod={selectedOrder.paymentMethod}
              />
            </div>
          )}
        </Modal>
      )}

      {toastMessage && (
        <Toast>
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </Toast>
      )}
    </>
  )
}
