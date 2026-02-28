/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { Filter, Loader2 } from "lucide-react"

import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"

import { apiFetch } from "@/lib/api"
import { useRouter } from "next/navigation"

/* ================= TYPES ================= */

type Customer = {
    id: number
    name: string
}

type OrderItem = {
    product_name: string
    quantity: number 
    unit_price: number
}

type OrderInvoice = {
    id: number
    status: string
}

type Order = {
    id: number
    status: string
    total: number
    customer_id: number
    items: OrderItem[]
    invoice?: OrderInvoice | null
}

/* ================= PAGE ================= */

export default function OrdersPage() {
    const [orders, setOrders] = useState<Order[]>([])
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)

    /* pagination */
    const [page, setPage] = useState(1)
    const limit = 20

    /* dialogs */
    const [open, setOpen] = useState(false)
    const [saving, setSaving] = useState(false)
    const [viewOrder, setViewOrder] = useState<Order | null>(null)
    const [editingOrder, setEditingOrder] = useState<Order | null>(null)
    const [cancelOrderTarget, setCancelOrderTarget] = useState<Order | null>(null)

    /* form */
    const [customerId, setCustomerId] = useState("")
    const [items, setItems] = useState<OrderItem[]>([
        { product_name: "", quantity: 1, unit_price: 0 }
    ])


    /* filters */
    const [filterOpen, setFilterOpen] = useState(false)
    const [statusFilter, setStatusFilter] = useState<string | null>(null)
    const [customerFilter, setCustomerFilter] = useState<string | null>(null)

    const router = useRouter()

    /* ================= LOAD DATA ================= */
    async function loadOrders(currentPage = page) {
        try {
            setLoading(true)

            const params = new URLSearchParams({
                page: String(currentPage),
                limit: String(limit),
            })

            if (statusFilter && statusFilter !== "ALL") {
                params.append("status", statusFilter)
            }

            if (customerFilter && customerFilter !== "ALL") {
                params.append("customer_id", customerFilter)
            }

            const [ordersData, customersData] = await Promise.all([
                apiFetch<Order[]>(`/orders?${params.toString()}`),
                apiFetch<Customer[]>("/customers"),
            ])

            setOrders(ordersData)
            setCustomers(customersData)
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setLoading(false)
        }
    }


    useEffect(() => {
        loadOrders()
    }, [page, statusFilter, customerFilter])


    /* ================= VIEW ================= */

    async function handleViewOrder(order: Order) {
        try {
            const full = await apiFetch<Order>(`/orders/${order.id}`)
            setViewOrder(full)
        } catch (err: any) {
            toast.error(err.message)
        }
    }
    /* ================= ITEMS ================= */

    function addItem() {
        setItems(prev => [
            ...prev,
            { product_name: "", quantity: 1, unit_price: 0 },
        ])
    }

    function removeItem(index: number) {
        setItems(prev => {
            if (prev.length === 1) return prev // always keep 1
            return prev.filter((_, i) => i !== index)
        })
    }

    function updateItem(
        index: number,
        field: keyof OrderItem,
        value: string | number
    ) {
        setItems(prev =>
            prev.map((item, i) =>
                i === index ? { ...item, [field]: value } : item
            )
        )
    }



    /* ================= EDIT ================= */

    function openEditOrder(order: Order) {
        setEditingOrder(order)
        setCustomerId(String(order.customer_id))

        setItems(
            order.items.map(i => ({
                product_name: i.product_name,
                quantity: i.quantity,
                unit_price: i.unit_price,
            }))
        )

        setOpen(true)
    }


    /* ================= SAVE ================= */

    async function handleSaveOrder() {
        if (!customerId) {
            toast.error("Please select a customer")
            return
        }

        if (items.length === 0) {
            toast.error("Add at least one item")
            return
        }

        for (const item of items) {
            if (!item.product_name || item.quantity <= 0 || item.unit_price <= 0) {
                toast.error("Each item must have valid product, quantity and price")
                return
            }
        }


        try {
            setSaving(true)

            if (editingOrder) {
                // UPDATE ORDER
                const updated = await apiFetch<Order>(`/orders/${editingOrder.id}`, {
                    method: "PUT",
                    body: JSON.stringify({ items }),
                })

                setOrders(prev =>
                    prev.map(o => (o.id === updated.id ? updated : o))
                )

                toast.success("Order updated")
            } else {
                // CREATE ORDER
                const created = await apiFetch<Order>("/orders", {
                    method: "POST",
                    body: JSON.stringify({
                        customer_id: Number(customerId),
                        items,
                    }),
                })

                setOrders(prev => [created, ...prev])
                toast.success("Order created")
            }

            // RESET FORM
            setOpen(false)
            setEditingOrder(null)
            setCustomerId("")
            setItems([{ product_name: "", quantity: 1, unit_price: 0 }])
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setSaving(false)
        }
    }
    /* ================= CONFIRM / CANCEL ================= */

    async function confirmOrder(id: number) {
        try {
            const updated = await apiFetch<Order>(`/orders/${id}/confirm`, {
                method: "POST",
            })
            setOrders(prev => prev.map(o => (o.id === updated.id ? updated : o)))
            toast.success("Order confirmed")
        } catch (err: any) {
            toast.error(err.message)
        }
    }

    async function cancelOrder(id: number) {
        try {
            const updated = await apiFetch<Order>(`/orders/${id}/cancel`, {
                method: "POST",
            })
            setOrders(prev => prev.map(o => (o.id === updated.id ? updated : o)))
            toast.success("Order cancelled")
        } catch (err: any) {
            toast.error(err.message)
        }
    }
    /* ================= RENDER ================= */

    return (
        <div className="space-y-6">
            {/* HEADER */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold">Orders</h1>
                    <p className="text-muted-foreground">Manage orders</p>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setFilterOpen(true)}>
                        <Filter className="mr-2 h-4 w-4" />
                        Filters
                    </Button>
                    <Button onClick={() => setOpen(true)}>Create Order</Button>
                </div>
            </div>

            {/* TABLE */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Order ID</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading && (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-10">
                                    <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                </TableCell>
                            </TableRow>
                        )}
                        {!loading &&
                            orders.map(order => (
                                <TableRow key={order.id}>
                                    <TableCell>{order.id}</TableCell>
                                    <TableCell>  {customers.find(c => c.id === order.customer_id)?.name ?? "Unknown"}</TableCell>
                                    <TableCell>{order.total.toFixed(2)}</TableCell>
                                    <TableCell><span
                                        className={`rounded-full px-2 py-1 text-xs font-medium
        ${order.status === "CREATED"
                                                ? "bg-yellow-100 text-yellow-800"
                                                : order.status === "CONFIRMED"
                                                    ? "bg-green-100 text-green-800"
                                                    : "bg-red-100 text-red-800"
                                            }`}
                                    >
                                        {order.status}
                                    </span>
                                    </TableCell>
                                    <TableCell className="text-right space-x-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleViewOrder(order)}
                                        >
                                            View
                                        </Button>

                                        {order.status === "CREATED" && (
                                            <>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openEditOrder(order)}
                                                >
                                                    Edit
                                                </Button>

                                                <Button
                                                    size="sm"
                                                    onClick={() => confirmOrder(order.id)}
                                                >
                                                    Confirm
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => setCancelOrderTarget(order)}
                                                >
                                                    ✕
                                                </Button>

                                            </>
                                        )}
                                        {order.status === "CONFIRMED" && !order.invoice && (
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                onClick={() =>
                                                    router.push(`/orders/${order.id}/create-invoice`)
                                                }
                                            >
                                                Create Invoice
                                            </Button>
                                        )}

                                    </TableCell>
                                </TableRow>
                            ))}
                    </TableBody>
                </Table>
            </div>

            {/* PAGINATION */}
            <Pagination>
                <PaginationContent>
                    <PaginationItem>
                        <PaginationPrevious
                            href="#"
                            onClick={e => {
                                e.preventDefault()
                                if (page > 1) setPage(p => p - 1)
                            }}
                        />
                    </PaginationItem>

                    <PaginationItem>
                        <PaginationLink href="#" isActive>
                            {page}
                        </PaginationLink>
                    </PaginationItem>

                    <PaginationItem>
                        <PaginationNext
                            href="#"
                            onClick={e => {
                                e.preventDefault()
                                if (orders.length === limit) {
                                    setPage(p => p + 1)
                                }
                            }}
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>


            {/* CREATE / EDIT */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingOrder ? "Edit Order" : "Create Order"}
                        </DialogTitle>
                    </DialogHeader>

                    {/* CUSTOMER */}
                    <Label>Customer</Label>
                    <Select
                        value={customerId}
                        onValueChange={setCustomerId}
                        disabled={!!editingOrder}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select customer" />
                        </SelectTrigger>
                        <SelectContent>
                            {customers.map(c => (
                                <SelectItem key={c.id} value={String(c.id)}>
                                    {c.name} - {c.id}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {/* ITEMS */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Label>Order Items</Label>
                            <Button size="sm" variant="outline" onClick={addItem}>
                                + Add Item
                            </Button>
                        </div>

                        {items.map((item, index) => (
                            <div key={index} className="grid grid-cols-12 gap-2 items-end">
                                <Input
                                    className="col-span-5"
                                    placeholder="Product name"
                                    value={item.product_name}
                                    onChange={e =>
                                        updateItem(index, "product_name", e.target.value)
                                    }
                                />

                                <Input
                                    type="number"
                                    className="col-span-3"
                                    placeholder="Qty"
                                    value={item.quantity}
                                    onChange={e =>
                                        updateItem(index, "quantity", +e.target.value)
                                    }
                                />

                                <Input
                                    type="number"
                                    className="col-span-3"
                                    placeholder="Unit price"
                                    value={item.unit_price}
                                    onChange={e =>
                                        updateItem(index, "unit_price", +e.target.value)
                                    }
                                />

                                <Button
                                    size="icon"
                                    variant="destructive"
                                    className="col-span-1"
                                    onClick={() => removeItem(index)}
                                    disabled={items.length === 1}
                                >
                                    ✕
                                </Button>
                            </div>
                        ))}
                    </div>

                    {/* ACTION */}
                    <Button onClick={handleSaveOrder} disabled={saving}>
                        {saving
                            ? "Saving..."
                            : editingOrder
                                ? "Update Order"
                                : "Create Order"}
                    </Button>
                </DialogContent>
            </Dialog>

            {/* VIEW ITEMS */}
            <Dialog open={!!viewOrder} onOpenChange={() => setViewOrder(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Order #{viewOrder?.id}</DialogTitle>
                    </DialogHeader>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead>Qty</TableHead>
                                <TableHead>Unit</TableHead>
                                <TableHead>Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {viewOrder?.items.map((i, idx) => (
                                <TableRow key={idx}>
                                    <TableCell>{i.product_name}</TableCell>
                                    <TableCell>{i.quantity}</TableCell>
                                    <TableCell>{i.unit_price}</TableCell>
                                    <TableCell>{(i.quantity * i.unit_price).toFixed(2)}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </DialogContent>
            </Dialog>
            {/* FILTER DIALOG */}
            <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Filters</DialogTitle>
                    </DialogHeader>

                    <Select
                        value={statusFilter ?? "ALL"}
                        onValueChange={v => setStatusFilter(v === "ALL" ? null : v)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="All statuses" />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem value="ALL">All</SelectItem>
                            <SelectItem value="CREATED">CREATED</SelectItem>
                            <SelectItem value="CONFIRMED">CONFIRMED</SelectItem>
                            <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                        </SelectContent>
                    </Select>



                    <Select
                        value={customerFilter ?? "ALL"}
                        onValueChange={v => setCustomerFilter(v === "ALL" ? null : v)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="All customers" />
                        </SelectTrigger>

                        <SelectContent>
                            <SelectItem value="ALL">All</SelectItem>

                            {customers.map(c => (
                                <SelectItem key={c.id} value={String(c.id)}>
                                    {c.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>



                    <Button
                        variant="outline"
                        onClick={() => {
                            setStatusFilter(null)
                            setCustomerFilter(null)
                            setPage(1)
                            setFilterOpen(false)
                        }}
                    >
                        Clear Filters
                    </Button>

                </DialogContent>
            </Dialog>
            {/* CANCEL ORDER */}
            <AlertDialog
                open={!!cancelOrderTarget}
                onOpenChange={() => setCancelOrderTarget(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone.
                            The order <strong>#{cancelOrderTarget?.id}</strong> will be permanently cancelled.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel>Keep Order</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => {
                                if (cancelOrderTarget) {
                                    cancelOrder(cancelOrderTarget.id)
                                    setCancelOrderTarget(null)
                                }
                            }}
                        >
                            Yes, Cancel Order
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

        </div>
    )
}
