import { useEffect, useState } from "react"
import { Input, Select } from "../../components/ui"
import { formatPrice } from "../../utils/formatPrice"
import { AdminOrderItem, getAdminOrders, updateOrderStatus } from "../../services/admin"
import { OrderStatus } from "../../types/database"

export default function AdminOrders() {
  const [orders, setOrders] = useState<AdminOrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    async function fetchOrders() {
      setLoading(true)
      const { data } = await getAdminOrders()
      if (mounted) {
        setOrders(data)
        setLoading(false)
      }
    }
    fetchOrders()
    return () => {
      mounted = false
    }
  }, [])

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    setUpdatingId(orderId)
    const { error } = await updateOrderStatus(orderId, newStatus)
    setUpdatingId(null)

    if (error) {
      alert(`Failed to update status: ${error.message}`)
    } else {
      setOrders((current) =>
        current.map((item) =>
          item.id === orderId ? { ...item, status: newStatus } : item,
        ),
      )
    }
  }

  const visible = orders.filter((order) =>
    `${order.orderNumber} ${order.customer}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  )

  return (
    <>
      <div className="admin-page-head">
        <div>
          <p className="eyebrow">Fulfillment</p>
          <h1>Orders</h1>
          <p>Review purchases and update fulfillment status.</p>
        </div>
      </div>
      <section className="admin-panel admin-data-table">
        <div className="admin-table-toolbar">
          <Input
            placeholder="Search by order or customer..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <span>
            {loading ? "Loading..." : `${visible.length} orders`}
          </span>
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
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading orders...
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-muted-foreground">
                    No orders found matching your search.
                  </td>
                </tr>
              ) : (
                visible.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <strong>{order.orderNumber}</strong>
                    </td>
                    <td>{order.customer}</td>
                    <td>{order.date}</td>
                    <td>{formatPrice(order.total)}</td>
                    <td>
                      <Select
                        value={order.status}
                        disabled={updatingId === order.id}
                        onChange={(event) =>
                          handleStatusChange(
                            order.id,
                            event.target.value as OrderStatus,
                          )
                        }
                      >
                        <option value="Pending">Pending</option>
                        <option value="Processing">Processing</option>
                        <option value="Shipped">Shipped</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </Select>
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
