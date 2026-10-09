import { useState } from "react"
import { Input, Select } from "../../components/ui"
import { formatPrice } from "../../utils/formatPrice"
import { adminOrders } from "./AdminDashboard"

export default function AdminOrders() {
  const [orders, setOrders] = useState(adminOrders)
  const [search, setSearch] = useState("")

  const visible = orders.filter((order) =>
    `${order.id} ${order.customer}`
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
          <span>{visible.length} orders</span>
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
              {visible.map((order) => (
                <tr key={order.id}>
                  <td>
                    <strong>{order.id}</strong>
                  </td>
                  <td>{order.customer}</td>
                  <td>{order.date}</td>
                  <td>{formatPrice(order.total)}</td>
                  <td>
                    <Select
                      value={order.status}
                      onChange={(event) =>
                        setOrders((current) =>
                          current.map((item) =>
                            item.id === order.id
                              ? { ...item, status: event.target.value }
                              : item,
                          ),
                        )
                      }
                    >
                      <option>Pending</option>
                      <option>Processing</option>
                      <option>Shipped</option>
                      <option>Delivered</option>
                      <option>Cancelled</option>
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
