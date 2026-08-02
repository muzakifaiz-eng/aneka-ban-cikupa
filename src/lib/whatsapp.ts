// Nomor Admin utama Aneka Ban Cikupa (082113161053)
export const ADMIN_WA = "6282113161053";

export function waLink(text: string, phone: string = ADMIN_WA) {
  return `https://wa.me/${phone.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(text)}`;
}

export const waMessages = {
  general: "Halo Admin Aneka Ban Cikupa, saya ingin bertanya mengenai produk.",
  order: (orderId: string) =>
    `Halo Admin Aneka Ban Cikupa, saya ingin menanyakan pesanan saya dengan nomor ${orderId}.`,
  cancelledOrder: (orderId: string) =>
    `Halo Admin Aneka Ban Cikupa, saya ingin menanyakan pesanan saya ${orderId} yang dibatalkan.`,
  product: (productName: string) =>
    `Halo Admin Aneka Ban Cikupa, saya tertarik dengan produk ${productName}. Saya ingin mendapatkan informasi lebih lanjut.`,
};
