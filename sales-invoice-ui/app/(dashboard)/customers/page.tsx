"use client"

import { useEffect, useState } from "react"
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
import { Pencil, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { apiFetch } from "@/lib/api"

import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination"

/* ================= TYPES ================= */

type Customer = {
    id: number
    name: string
    email: string
}

/* ================= PAGE ================= */

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)

    // pagination
    const [page, setPage] = useState(1)
    const limit = 15

    // dialog
    const [open, setOpen] = useState(false)
    const [editingCustomer, setEditingCustomer] =
        useState<Customer | null>(null)

    // form
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [saving, setSaving] = useState(false)

    /* ================= LOAD CUSTOMERS ================= */

    async function loadCustomers(currentPage = page) {
        try {
            setLoading(true)
            const data = await apiFetch<Customer[]>(
                `/customers/?page=${currentPage}&limit=${limit}` // ✅ trailing slash
            )
            setCustomers(data)
        } catch {
            toast.error("Failed to load customers")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        loadCustomers()
    }, [page])

    /* ================= DIALOG HELPERS ================= */

    function openCreateDialog() {
        setEditingCustomer(null)
        setName("")
        setEmail("")
        setOpen(true)
    }

    function openEditDialog(customer: Customer) {
        setEditingCustomer(customer)
        setName(customer.name)
        setEmail(customer.email)
        setOpen(true)
    }

    async function handleSave() {
        if (!name || !email) return

        try {
            setSaving(true)

            if (editingCustomer) {
                const updated = await apiFetch<Customer>(
                    `/customers/${editingCustomer.id}`,
                    {
                        method: "PUT",
                        body: JSON.stringify({ name, email }),
                    }
                )

                setCustomers(prev =>
                    prev.map(c => (c.id === updated.id ? updated : c))
                )

                toast.success("Customer updated")
            } else {
                const created = await apiFetch<Customer>(
                    "/customers/create-customer",
                    {
                        method: "POST",
                        body: JSON.stringify({ name, email }),
                    }
                )

                setCustomers(prev => [created, ...prev])
                toast.success("Customer created")
            }

            setOpen(false)
        } catch (err: any) {
            toast.error(err.message)
        } finally {
            setSaving(false)
        }
    }

    /* ================= RENDER ================= */

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold">Customers</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage your customers
                    </p>
                </div>

                <Button onClick={openCreateDialog}>Create Customer</Button>
            </div>

            {/* Table */}
            <div className="rounded-md border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Customer ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {loading && (
                            <TableRow>
                                <TableCell colSpan={4}>
                                    <div className="flex justify-center py-6">
                                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}

                        {!loading &&
                            customers.map(customer => (
                                <TableRow key={customer.id}>
                                    <TableCell>{customer.id}</TableCell>
                                    <TableCell>{customer.name}</TableCell>
                                    <TableCell>{customer.email}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openEditDialog(customer)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}

                        {!loading && customers.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center">
                                    No customers found
                                </TableCell>
                            </TableRow>
                        )}
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
                                if (!loading && page > 1) setPage(p => p - 1)
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
                                if (!loading && customers.length === limit) {
                                    setPage(p => p + 1)
                                }
                            }}
                        />
                    </PaginationItem>
                </PaginationContent>
            </Pagination>

            {/* Create / Edit Dialog */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingCustomer ? "Edit Customer" : "Create Customer"}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div>
                            <Label>Name</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} />
                        </div>

                        <div>
                            <Label>Email</Label>
                            <Input value={email} onChange={e => setEmail(e.target.value)} />
                        </div>

                        <Button onClick={handleSave} disabled={saving}>
                            {saving ? "Saving..." : editingCustomer ? "Update" : "Create"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
