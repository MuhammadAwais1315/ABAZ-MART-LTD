import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router"
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import { Badge, Input } from "../../components/ui"
import { formatPrice } from "../../utils/formatPrice"
import {
  AdminOrderItem,
  getAdminCustomers,
  getAdminOrders,
} from "../../services/admin"

export function AdminStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      tone={
        status === "Delivered"
          ? "green"
          : status === "Pending" || status === "Processing"
            ? "gold"
            : status === "Cancelled"
              ? "rose"
              : undefined
      }
    >
      {status}
    </Badge>
  )
}

export default function AdminDashboard() {
  const [orderSearch, setOrderSearch] = useState("")
  const [orders, setOrders] = useState<AdminOrderItem[]>([])
  const [customerCount, setCustomerCount] = useState<number>(0)
  const [loadingOrders, setLoadingOrders] = useState(true)

  useEffect(() => {
    let mounted = true

    async function loadDashboardData() {
      setLoadingOrders(true)
      const [ordersRes, customersRes] = await Promise.all([
        getAdminOrders(),
        getAdminCustomers(),
      ])

      if (mounted) {
        setOrders(ordersRes.data || [])
        setCustomerCount(customersRes.data?.length || 0)
        setLoadingOrders(false)
      }
    }

    loadDashboardData()

    const handleStatusSync = (e: Event) => {
      const detail = (e as CustomEvent)?.detail
      if (detail?.orderId && detail?.status) {
        setOrders((current) =>
          current.map((o) =>
            o.id === detail.orderId ? { ...o, status: detail.status } : o,
          ),
        )
      }
    }
    window.addEventListener("abaz_order_status_changed", handleStatusSync)
    window.addEventListener("abaz_order_placed", loadDashboardData)
    window.addEventListener("storage", handleStatusSync)
    window.addEventListener("storage", loadDashboardData)

    return () => {
      mounted = false
      window.removeEventListener("abaz_order_status_changed", handleStatusSync)
      window.removeEventListener("abaz_order_placed", loadDashboardData)
      window.removeEventListener("storage", handleStatusSync)
      window.removeEventListener("storage", loadDashboardData)
    }
  }, [])

  const recentOrders = useMemo(() => {
    return orders.filter((order) =>
      `${order.orderNumber} ${order.customer} ${order.status}`
        .toLowerCase()
        .includes(orderSearch.toLowerCase()),
    )
  }, [orders, orderSearch])

  const liveRevenue = useMemo(() => {
    return orders
      .filter((o) => o.status !== "Cancelled")
      .reduce((sum, o) => sum + o.total, 0)
  }, [orders])

  const validOrdersCount = useMemo(() => {
    return orders.filter((o) => o.status !== "Cancelled").length
  }, [orders])

  const averageOrderValue = useMemo(() => {
    return validOrdersCount > 0 ? liveRevenue / validOrdersCount : 0
  }, [validOrdersCount, liveRevenue])

  const pendingDispatchCount = useMemo(() => {
    return orders.filter((o) => o.status === "Pending" || o.status === "Processing").length
  }, [orders])

  // Build real dynamic monthly sales chart from actual orders over the last 6 months
  const salesData = useMemo(() => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    const now = new Date()
    const months = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        month: monthNames[d.getMonth()],
        sales: 0,
      }
    })

    orders.forEach((o) => {
      if (o.status !== "Cancelled") {
        const orderDate = o.rawCreatedAt ? new Date(o.rawCreatedAt) : new Date(o.date)
        if (!isNaN(orderDate.getTime())) {
          const key = `${orderDate.getFullYear()}-${orderDate.getMonth()}`
          const bucket = months.find((m) => m.key === key)
          if (bucket) {
            bucket.sales += o.total
          }
        }
      }
    })

    return months.map((m) => ({
      month: m.month,
      sales: Math.round(m.sales * 100) / 100,
    }))
  }, [orders])

  // Compute top selling products from real customer orders
  const topSellingProducts = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string
        brand?: string
        image?: string
        price: number
        units: number
        revenue: number
      }
    >()

    orders.forEach((order) => {
      if (order.status !== "Cancelled" && order.items) {
        order.items.forEach((item) => {
          const key = item.productName
          const existing = map.get(key) || {
            name: item.productName,
            brand: item.productBrand,
            image: item.productImage,
            price: item.unitPrice,
            units: 0,
            revenue: 0,
          }
          existing.units += item.quantity
          existing.revenue += item.lineTotal
          map.set(key, existing)
        })
      }
    })

    return Array.from(map.values())
      .sort((a, b) => b.units - a.units)
      .slice(0, 5)
  }, [orders])

  const stats = [
    {
      label: "Total Sales",
      value: formatPrice(liveRevenue),
      change: orders.length > 0 ? `${validOrdersCount} successful` : "0 orders",
      note: "all time",
    },
    {
      label: "Total Orders",
      value: orders.length.toString(),
      change:
        pendingDispatchCount > 0
          ? `${pendingDispatchCount} awaiting dispatch`
          : "Up to date",
      note: "orders",
    },
    {
      label: "Registered Customers",
      value: customerCount.toString(),
      change: customerCount > 0 ? `${customerCount} active accounts` : "No accounts yet",
      note: "database",
    },
    {
      label: "Average Order Value",
      value: formatPrice(averageOrderValue),
      change: validOrdersCount > 0 ? "Live calculation" : "No sales yet",
      note: "AOV",
    },
  ]

  const todayFormatted = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })

  return (
    <>
      <div className="admin-page-head">
        <div>
          <p className="eyebrow">Overview</p>
          <h1>Dashboard</h1>
          <p>Welcome back, Admin. Real-time store metrics and customer activity.</p>
        </div>
        <span>{todayFormatted}</span>
      </div>

      <div className="admin-stats">
        {stats.map((stat) => (
          <article key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <small>
              <b>{stat.change}</b> · {stat.note}
            </small>
          </article>
        ))}
      </div>

      <div className="admin-dashboard-grid">
        {/* Sales Performance Chart */}
        <section className="admin-panel sales-chart">
          <div className="admin-panel-head">
            <div>
              <h2>Monthly Sales Performance</h2>
              <p>Actual customer sales over the last 6 months</p>
            </div>
            {liveRevenue > 0 && <Badge tone="green">Live Store Data</Badge>}
          </div>
          <div className="chart-wrap">
            {liveRevenue === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-8 text-muted-foreground">
                <p className="text-sm font-medium text-foreground">No customer sales recorded yet</p>
                <p className="text-xs mt-1.5 max-w-sm">
                  As soon as real customer orders are placed, monthly revenue trends will dynamically graph here.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={salesData}
                  margin={{ top: 12, right: 10, left: -16, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#eadfe2"
                  />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#6B5B61", fontSize: 11 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: "#6B5B61", fontSize: 11 }}
                    tickFormatter={(value) => `£${value}`}
                  />
                  <Tooltip
                    formatter={(value) => [
                      formatPrice(Number(value)),
                      "Sales",
                    ]}
                    contentStyle={{ borderRadius: 12, borderColor: "#eadfe2" }}
                  />
                  <Line
                    type="monotone"
                    dataKey="sales"
                    stroke="#B83B5E"
                    strokeWidth={3}
                    dot={{ r: 4, fill: "#B83B5E" }}
                    activeDot={{ r: 6, fill: "#B83B5E" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* Top Selling Products */}
        <section className="admin-panel top-products">
          <div className="admin-panel-head">
            <div>
              <h2>Top Selling Products</h2>
              <p>Ranked by verified customer purchases</p>
            </div>
          </div>
          {topSellingProducts.length === 0 ? (
            <div className="py-12 px-4 text-center text-xs text-muted-foreground">
              <p className="font-medium text-foreground">No product purchases yet</p>
              <p className="mt-1">
                Your highest-performing products will automatically rank here as customers complete checkout.
              </p>
            </div>
          ) : (
            topSellingProducts.map((product, index) => (
              <div key={product.name} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                <b className="w-5 text-center text-xs text-muted-foreground">{index + 1}</b>
                {product.image && (
                  <img
                    src={product.image}
                    alt={product.name}
                    className="w-10 h-10 object-cover rounded-lg border border-border"
                  />
                )}
                <span className="flex-1 min-w-0">
                  <strong className="block text-xs truncate text-foreground">{product.name}</strong>
                  <small className="text-muted-foreground text-[11px]">
                    {product.units} {product.units === 1 ? "unit" : "units"} sold
                  </small>
                </span>
                <em className="font-semibold text-xs text-foreground not-italic">
                  {formatPrice(product.revenue)}
                </em>
              </div>
            ))
          )}
        </section>
      </div>

      {/* Recent Orders Table */}
      <section className="admin-panel admin-data-table">
        <div className="admin-panel-head">
          <div>
            <h2>Recent Customer Orders</h2>
            <p>Real-time purchase activity</p>
          </div>
          <div className="flex items-center gap-3">
            <Input
              placeholder="Search orders..."
              value={orderSearch}
              onChange={(event) => setOrderSearch(event.target.value)}
              className="max-w-xs"
            />
            <Link
              to="/admin/orders"
              className="text-xs font-semibold text-rose hover:text-rose-700 whitespace-nowrap px-3 py-2 rounded-lg bg-light border border-border"
            >
              View All Orders →
            </Link>
          </div>
        </div>
        <div className="table-scroll">
          <table className="admin-table-element">
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Date</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loadingOrders ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground text-xs">
                    Loading live orders...
                  </td>
                </tr>
              ) : recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-muted-foreground text-xs">
                    <p className="font-medium text-foreground text-sm">No customer orders placed yet</p>
                    <p className="mt-1">When customers place orders, they will appear here in real time.</p>
                  </td>
                </tr>
              ) : (
                recentOrders.slice(0, 8).map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.orderNumber}</strong>
                    </td>
                    <td>{order.customer}</td>
                    <td>{order.date}</td>
                    <td>{formatPrice(order.total)}</td>
                    <td>
                      <AdminStatusBadge status={order.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
