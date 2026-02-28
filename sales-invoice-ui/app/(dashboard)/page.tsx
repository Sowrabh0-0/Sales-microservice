"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { apiFetch } from "@/lib/api"

/* ================= TYPES ================= */

type Invoice = {
  id: number
  total: number
  status: "PAID" | "UNPAID" | "PARTIALLY_PAID" | "CANCELLED" | "REFUNDED"
  created_at: string
}

type Order = {
  id: number
  total: number
  status: string
}

type Customer = {
  id: number
}

/* ================= PAGE ================= */

export default function DashboardPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  /* ================= LOAD DATA ================= */

  useEffect(() => {
    async function load() {
      try {
        setLoading(true)

        const [invoiceData, orderData, customerData] = await Promise.all([
          apiFetch<Invoice[]>("/invoices?limit=100"),
          apiFetch<Order[]>("/orders?limit=100"),
          apiFetch<Customer[]>("/customers?limit=100"),
        ])

        setInvoices(invoiceData)
        setOrders(orderData)
        setCustomers(customerData)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  /* ================= DERIVED METRICS ================= */

  const stats = useMemo(() => {
    const totalInvoices = invoices.length
    const totalOrders = orders.length
    const totalCustomers = customers.length

    const paidInvoices = invoices.filter(i => i.status === "PAID")
    const unpaidInvoices = invoices.filter(
      i => i.status === "UNPAID" || i.status === "PARTIALLY_PAID"
    )
    const refundedInvoices = invoices.filter(i => i.status === "REFUNDED")

    const revenue = paidInvoices.reduce((sum, i) => sum + i.total, 0)
    const avgInvoiceValue =
      paidInvoices.length > 0 ? revenue / paidInvoices.length : 0

    return {
      totalInvoices,
      totalOrders,
      totalCustomers,
      revenue,
      avgInvoiceValue,
      paid: paidInvoices.length,
      unpaid: unpaidInvoices.length,
      refunded: refundedInvoices.length,
    }
  }, [invoices, orders, customers])

  /* ================= CHART DATA ================= */

  const revenueByDate = useMemo(() => {
    const map: Record<string, number> = {}

    invoices
      .filter(i => i.status === "PAID")
      .forEach(i => {
        const date = new Date(i.created_at).toLocaleDateString()
        map[date] = (map[date] || 0) + i.total
      })

    return Object.entries(map).map(([date, total]) => ({
      date,
      total,
    }))
  }, [invoices])

  const invoiceStatusData = [
    { name: "Paid", value: stats.paid },
    { name: "Unpaid", value: stats.unpaid },
    { name: "Refunded", value: stats.refunded },
  ]

  const COLORS = ["#22c55e", "#facc15", "#6366f1"]

  /* ================= RENDER ================= */

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of sales, customers, and revenue
        </p>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          [...Array(4)].map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <StatCard title="Total Revenue" value={`₹ ${stats.revenue.toFixed(2)}`} />
            <StatCard title="Total Customers" value={stats.totalCustomers} />
            <StatCard title="Total Orders" value={stats.totalOrders} />
            <StatCard title="Avg Invoice Value" value={`₹ ${stats.avgInvoiceValue.toFixed(2)}`} />
          </>
        )}
      </div>

      {/* SECOND ROW KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)
        ) : (
          <>
            <StatCard title="Paid Invoices" value={stats.paid} badge="success" />
            <StatCard title="Unpaid Invoices" value={stats.unpaid} badge="warning" />
            <StatCard title="Refunded Invoices" value={stats.refunded} />
          </>
        )}
      </div>

      {/* CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loading ? (
              <Skeleton className="h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueByDate}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#22c55e"
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Status Pie */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Status</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loading ? (
              <Skeleton className="h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={invoiceStatusData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={100}
                  >
                    {invoiceStatusData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

/* ================= COMPONENT ================= */

function StatCard({
  title,
  value,
  badge,
}: {
  title: string
  value: number | string
  badge?: "success" | "warning"
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          {badge && (
            <Badge
              className={
                badge === "success"
                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                  : "bg-amber-100 text-amber-700 border border-amber-200"
              }
            >
              {badge === "success" ? "Good" : "Attention"}
            </Badge>
          )}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
