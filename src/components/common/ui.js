import React from "react";

export function Card({ children, className = "" }) {
    return <div className={`rounded-2xl border bg-white shadow-sm ${className}`}>{children}</div>;
}

export function CardHeader({ title, subtitle, right }) {
    return (
        <div className="flex items-start justify-between gap-4 border-b p-4">
            <div>
                <div className="text-lg font-semibold text-gray-900">{title}</div>
                {subtitle ? <div className="mt-1 text-sm text-gray-500">{subtitle}</div> : null}
            </div>
            {right ? <div>{right}</div> : null}
        </div>
    );
}

export function CardBody({ children, className = "" }) {
    return <div className={`p-4 ${className}`}>{children}</div>;
}

export function Button({ children, className = "", variant = "primary", ...props }) {
    const base = "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed";
    const styles =
        variant === "primary"
            ? "bg-gray-900 text-white hover:bg-gray-800"
            : variant === "danger"
                ? "bg-red-600 text-white hover:bg-red-500"
                : variant === "ghost"
                    ? "bg-transparent text-gray-900 hover:bg-gray-100"
                    : "bg-white border text-gray-900 hover:bg-gray-50";
    return (
        <button className={`${base} ${styles} ${className}`} {...props}>
            {children}
        </button>
    );
}

export function Input({ className = "", ...props }) {
    return (
        <input
            className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20 ${className}`}
            {...props}
        />
    );
}

export function Select({ className = "", children, ...props }) {
    return (
        <select
            className={`w-full rounded-xl border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-gray-900/20 ${className}`}
            {...props}
        >
            {children}
        </select>
    );
}

export function Badge({ children, tone = "gray" }) {
    const t =
        tone === "green"
            ? "bg-green-50 text-green-700 border-green-100"
            : tone === "yellow"
                ? "bg-yellow-50 text-yellow-700 border-yellow-100"
                : tone === "red"
                    ? "bg-red-50 text-red-700 border-red-100"
                    : "bg-gray-50 text-gray-700 border-gray-100";
    return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${t}`}>{children}</span>;
}

export function PageShell({ title, children, actions }) {
    return (
        <div className="mx-auto w-full max-w-5xl px-4 py-6">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div className="text-2xl font-bold text-gray-900">{title}</div>
                </div>
                {actions ? <div className="flex gap-2">{actions}</div> : null}
            </div>
            {children}
        </div>
    );
}

export function ErrorBox({ error }) {
    if (!error) return null;
    const message = typeof error === "string" ? error : (error?.message || "Terjadi kesalahan");
    return (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {message}
        </div>
    );
}

export function Spinner() {
    return (
        <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-900" />
    );
}

export function formatRupiah(value) {
    const n = Number(value || 0);
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
}
