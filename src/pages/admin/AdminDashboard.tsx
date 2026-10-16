import { useEffect, useState } from "react"
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
import { products } from "../../data/products"
import { formatPrice } from "../../utils/formatPrice"
import { AdminOrderItem, getAdminOrders } from "../../services/admin"

const salesData = [
  { month: "Jan", sales: 18200 },
  { month: "Feb", sales: 21400 },
  { month: "Mar", sales: 19800 },
  { month: "Apr", sales: 26700 },
  { month: "May", sales: 29400 },
  { month: "Jun", sales: 32100 },
  { month: "Jul", sales: 35600 },
  { month: "Aug", sales: 38900 },
  { month: "Sep", sales: 37200 },
  { month: "Oct", sales: 43800 },
  { month: "Nov", sales: 46100 },
  { month: "Dec", sales: 51200 },
]

export const adminOrders = [
  {
    id: "ABZ-10842",
    customer: "Amara Williams",
    date: "Feb 18, 2026",
    total: 126.4,
    status: "Delivered",
  },
  {
    id: "ABZ-10839",
    customer: "Nadia Brooks",
    date: "Feb 18, 2026",
    total: 84.0,
    status: "Shipped",
  },
  {
    id: "ABZ-10835",
    customer: "Sofia Chen",
    date: "Feb 17, 2026",
    total: 152.25,
    status: "Processing",
  },
  {
    id: "ABZ-10831",
    customer: "Leila Morgan",
    date: "Feb 17, 2026",
    total: 67.5,
    status: "Pending",
  },
  {
    id: "ABZ-10828",
    customer: "Maya Roberts",
    date: "Feb 16, 2026",
    total: 91.0,
    status: "Cancelled",
  },
  {
    id: "ABZ-10824",
    customer: "Olivia Kim",
    date: "Feb 16, 2026",
    total: 205.8,
    status: "Delivered",
  },
]

export function AdminStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      tone={
        status === "Delivered"
          ? "green"
          : status === "Pending" || status === "Processing"
            ? "gold"
            : "rose"
      }
    >
      {status}
    </Badge>
  )
}

export default function AdminDashboard() {
  const [orderSearch, setOrderSearch] = useState("")
  const [orders, setOrders] = useState<AdminOrderItem[]>([])
  const [loadingOrders, setLoadingOrders] = useState(true)

  useEffect(() => {
    let mounted = true
    async function fetchOrders() {
      setLoadingOrders(true)
      const { data } = await getAdminOrders()
      if (mounted) {
        setOrders(data)
        setLoadingOrders(false)
      }
    }
    fetchOrders()
    return () => {
      mounted = false
    }
  }, [])

  const recentOrders = orders.filter((order) =>
    `${order.orderNumber} ${order.customer}`
      .toLowerCase()
      .includes(orderSearch.toLowerCase()),
  )

  const liveRevenue = orders
    .filter((o) => o.status !== "Cancelled")
    .reduce((sum, o) => sum + o.total, 0)

  const stats = [
    {
      label: "Total Sales",
      value: formatPrice(liveRevenue > 0 ? liveRevenue : 84290),
      change: "+12.5%",
      note: "vs. last month",
    },
    {
      label: "Orders",
      value: (orders.length > 0 ? orders.length : 1248).toLocaleString(),
      change: "+8.2%",
      note: "vs. last month",
    },
    {
      label: "Customers",
      value: "3,642",
      change: "+6.8%",
      note: "vs. last month",
    },
    {
      label: "Revenue",
      value: formatPrice(51200),
      change: "+15.3%",
      note: "this month",
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
          <p>Welcome back, Admin. Here’s what’s happening in your store.</p>
        </div>
        <span>{todayFormatted}</span>
      </div>
      <div className="admin-stats">
        {stats.map((stat) => (
          <article key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
            <small>
              <b>{stat.change}</b> {stat.note}
            </small>
          </article>
        ))}
      </div>
      <div className="admin-dashboard-grid">
        <section className="admin-panel sales-chart">
          <div className="admin-panel-head">
            <div>
              <h2>Monthly sales</h2>
              <p>Sales performance over the last 12 months</p>
            </div>
            <Badge tone="green">+15.3%</Badge>
          </div>
          <div className="chart-wrap">
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
                  tickFormatter={(value) => `£${value / 1000}k`}
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
                  dot={false}
                  activeDot={{ r: 5, fill: "#B83B5E" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
        <section className="admin-panel top-products">
          <div className="admin-panel-head">
            <div>
              <h2>Top selling products</h2>
              <p>By units sold this month</p>
            </div>
          </div>
          {products.slice(0, 5).map((product, index) => (
            <div key={product.id}>
              <b>{index + 1}</b>
              <img src={product.image} alt={product.name} />
              <span>
                <strong>{product.name}</strong>
                <small>{84 - index * 9} units sold</small>
              </span>
              <em>{formatPrice(product.price * (84 - index * 9))}</em>
            </div>
          ))}
        </section>
      </div>
      <section className="admin-panel admin-data-table">
        <div className="admin-panel-head">
          <div>
            <h2>Recent orders</h2>
            <p>Latest customer purchases</p>
          </div>
          <div className="flex items-center gap-3">
            <Input
              placeholder="Search orders..."
              value={orderSearch}
              onChange={(event) => setOrderSearch(event.target.value)}
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
                  <td colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading recent orders...
                  </td>
                </tr>
              ) : recentOrders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground">
                    No orders found.
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
