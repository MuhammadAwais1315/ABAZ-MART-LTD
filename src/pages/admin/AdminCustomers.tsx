import { useEffect, useState } from "react"
import { Shield, ShieldAlert, User, Search } from "lucide-react"
import { Badge, Button, Input } from "../../components/ui"
import { AdminCustomer, getAdminCustomers, updateCustomerRole } from "../../services/admin"

export default function AdminCustomers() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const loadCustomers = async () => {
    setLoading(true)
    const { data } = await getAdminCustomers()
    setCustomers(data)
    setLoading(false)
  }

  useEffect(() => {
    loadCustomers()
    window.addEventListener("abaz_customer_registered", loadCustomers)
    window.addEventListener("storage", loadCustomers)
    return () => {
      window.removeEventListener("abaz_customer_registered", loadCustomers)
      window.removeEventListener("storage", loadCustomers)
    }
  }, [])

  const handleRoleToggle = async (customer: AdminCustomer) => {
    const newRole = customer.role === "admin" ? "customer" : "admin"
    const actionLabel = newRole === "admin" ? "promote to Administrator" : "demote to Customer"

    if (window.confirm(`Are you sure you want to ${actionLabel} for "${customer.email}"?`)) {
      setUpdatingId(customer.id)
      const { error } = await updateCustomerRole(customer.id, newRole)
      setUpdatingId(null)
      if (error) {
        alert(`Failed to update role: ${error.message}`)
      } else {
        setCustomers((current) =>
          current.map((c) => (c.id === customer.id ? { ...c, role: newRole } : c)),
        )
      }
    }
  }

  const filtered = customers.filter(
    (c) =>
      c.fullName.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <>
      <div className="admin-page-head">
        <div>
          <p className="eyebrow">Accounts</p>
          <h1>Customers</h1>
          <p>View registered clientele, account activity, and administrative roles.</p>
        </div>
      </div>

      <section className="admin-panel admin-data-table">
        <div className="admin-table-toolbar">
          <Input
            placeholder="Search customers by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span>{loading ? "Loading..." : `${filtered.length} customers`}</span>
        </div>

        <div className="table-scroll">
          <table className="admin-table-element">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Joined</th>
                <th>Orders</th>
                <th>Access Control</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    Loading customer profiles...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-muted-foreground">
                    No customers found matching your search.
                  </td>
                </tr>
              ) : (
                filtered.map((cust) => (
                  <tr key={cust.id}>
                    <td>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blush text-rose-700 flex items-center justify-center font-bold text-xs uppercase">
                          {cust.fullName.charAt(0) || <User className="w-4 h-4" />}
                        </div>
                        <strong>{cust.fullName}</strong>
                      </div>
                    </td>
                    <td>
                      <span className="text-xs text-muted-foreground">{cust.email}</span>
                    </td>
                    <td>
                      <span className="text-xs text-muted-foreground">
                        {cust.phone || "—"}
                      </span>
                    </td>
                    <td>
                      <Badge tone={cust.role === "admin" ? "green" : "gold"}>
                        {cust.role === "admin" ? "Admin" : "Customer"}
                      </Badge>
                    </td>
                    <td>
                      <span className="text-xs text-muted-foreground">{cust.createdAt}</span>
                    </td>
                    <td>
                      <span className="text-xs font-semibold">{cust.ordersCount}</span>
                    </td>
                    <td>
                      <Button
                        variant="outline"
                        disabled={updatingId === cust.id}
                        onClick={() => handleRoleToggle(cust)}
                        className="text-xs"
                      >
                        {cust.role === "admin" ? (
                          <>
                            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" /> Demote to Customer
                          </>
                        ) : (
                          <>
                            <Shield className="w-3.5 h-3.5 text-emerald-600" /> Promote to Admin
                          </>
                        )}
                      </Button>
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
