export type BankKey = "BCA" | "BSI";

export const BANK_ACCOUNTS: {
  key: BankKey;
  name: string;
  account_number: string;
  account_holder: string;
}[] = [
  { key: "BCA", name: "BCA", account_number: "7641693344", account_holder: "Aneka Ban Cikupa" },
  { key: "BSI", name: "BSI", account_number: "5691495460", account_holder: "Aneka Ban Cikupa" },
];

export type PaymentStatus =
  | "awaiting_payment"
  | "awaiting_verification"
  | "verified"
  | "rejected"
  | "expired";

export type RefundStatus = "pending" | "processing" | "refunded" | "rejected";

export const paymentStatusMeta: Record<
  PaymentStatus,
  { label: string; className: string; message: string }
> = {
  awaiting_payment: {
    label: "Menunggu Pembayaran",
    className: "bg-yellow-500 text-white",
    message: "Silakan lakukan transfer ke salah satu rekening dan unggah bukti pembayaran.",
  },
  awaiting_verification: {
    label: "Menunggu Verifikasi",
    className: "bg-blue-500 text-white",
    message: "Bukti pembayaran Anda sedang diverifikasi oleh admin (maks. 1x24 jam).",
  },
  verified: {
    label: "Pembayaran Terverifikasi",
    className: "bg-green-600 text-white",
    message: "Pembayaran Anda telah diverifikasi. Pesanan Anda mulai diproses.",
  },
  rejected: {
    label: "Pembayaran Ditolak",
    className: "bg-destructive text-white",
    message: "Bukti pembayaran ditolak. Silakan periksa alasan penolakan dan unggah ulang bukti transfer.",
  },
  expired: {
    label: "Kedaluwarsa",
    className: "bg-muted text-foreground",
    message: "Batas waktu pembayaran telah berakhir. Silakan hubungi admin.",
  },
};

export const refundStatusMeta: Record<
  RefundStatus,
  { label: string; className: string; message: string }
> = {
  pending: {
    label: "Refund Menunggu",
    className: "bg-yellow-500 text-white",
    message: "Pengembalian dana Anda menunggu diproses. Pastikan data rekening tujuan sudah benar.",
  },
  processing: {
    label: "Refund Diproses",
    className: "bg-blue-500 text-white",
    message: "Pengembalian dana sedang diproses ke rekening Anda.",
  },
  refunded: {
    label: "Refund Selesai",
    className: "bg-green-600 text-white",
    message: "Dana Anda telah dikembalikan. Terima kasih atas pengertiannya.",
  },
  rejected: {
    label: "Refund Ditolak",
    className: "bg-destructive text-white",
    message: "Pengajuan pengembalian dana tidak dapat diproses. Silakan hubungi admin.",
  },
};

export function rupiah(n: number | string) {
  return `Rp ${Number(n).toLocaleString("id-ID")}`;
}
