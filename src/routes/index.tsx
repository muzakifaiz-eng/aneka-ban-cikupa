import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ShieldCheck, BadgeCheck, Truck, HeartHandshake, Wallet, Rocket,
  Phone, Mail, MapPin, MessageCircle, ChevronDown, Star,
  Search, ClipboardCheck, Flame, Settings2, CheckCircle2, Facebook, Instagram, ShoppingBag,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { supabase } from "@/integrations/supabase/client";
import heroTires from "@/assets/hero-tires.jpg";
import processImg from "@/assets/process-workshop.jpg";
import productTruck from "@/assets/product-truck.jpg";
import productBus from "@/assets/product-bus.jpg";
import productPickup from "@/assets/product-pickup.jpg";
import productNiaga from "@/assets/product-niaga.jpg";

const WA_NUMBER = "6281234567890";
const waLink = (msg: string) =>
  `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Aneka Ban Cikupa — Jual Ban Vulkanisir Berkualitas dan Amanah" },
      { name: "description", content: "Aneka Ban Cikupa menyediakan ban vulkanisir berkualitas untuk truk, bus, pickup, dan kendaraan niaga. Tahan lama, aman, harga terjangkau." },
      { name: "keywords", content: "ban vulkanisir, ban truk, ban bus, vulkanisir cikupa, jual ban vulkanisir, ban kendaraan niaga" },
      { property: "og:title", content: "Aneka Ban Cikupa — Ban Vulkanisir Berkualitas & Amanah" },
      { property: "og:description", content: "Ban vulkanisir berkualitas, tahan lama, dan amanah untuk truk, bus, pickup, dan kendaraan niaga." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "LocalBusiness",
          name: "Aneka Ban Cikupa",
          description: "Jual ban vulkanisir berkualitas dan amanah untuk truk, bus, pickup, dan kendaraan niaga.",
          telephone: "+62 812-3456-7890",
          address: { "@type": "PostalAddress", addressLocality: "Cikupa", addressRegion: "Banten", addressCountry: "ID" },
          slogan: "Jual Ban Vulkanisir Berkualitas dan Amanah",
        }),
      },
    ],
  }),
  component: Index,
});

function Index() {
  type RemoteReview = { id: string; rating: number; title: string; message: string; reviewer_name: string | null; created_at: string };
  const [reviews, setReviews] = useState<RemoteReview[]>([]);

  useEffect(() => {
    supabase
      .from("reviews")
      .select("id,rating,title,message,reviewer_name,created_at")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(6)
      .then(({ data }) => setReviews((data as RemoteReview[]) ?? []));
  }, []);

  const defaultTestimonials = [
    { n: "Bapak Hendra", r: "Pemilik Armada Truk", q: "Kualitas ban vulkanisirnya tidak kalah dengan ban baru. Sudah 3 tahun langganan, tidak pernah kecewa. Harga juga sangat bersahabat untuk operasional truk saya." },
    { n: "Ibu Sari", r: "Manajer Logistik", q: "Pelayanan amanah, pengiriman cepat, dan kualitas konsisten. Aneka Ban Cikupa membantu kami menekan biaya operasional armada hingga 40%." },
    { n: "Bapak Yusuf", r: "Pengusaha Bus Pariwisata", q: "Sudah mencoba banyak vulkanisir, hanya Aneka Ban Cikupa yang memberi hasil paling memuaskan. Tim teknisnya juga sangat profesional dan ramah." },
  ];

  const displayTestimonials = reviews.length > 0
    ? reviews.map((r) => ({ n: r.reviewer_name || "Pelanggan", r: r.title, q: r.message, rating: r.rating }))
    : defaultTestimonials.map((t) => ({ ...t, rating: 5 }));

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader
        nav={[
          { label: "Beranda", href: "/#beranda" },
          { label: "Produk", href: "/#produk" },
          { label: "Tentang", href: "/#tentang" },
          { label: "Kontak", href: "/#kontak" },
        ]}
      />

      {/* HERO */}
      <section id="beranda" className="relative overflow-hidden pt-20" style={{ background: "var(--gradient-hero)" }}>
        <div className="absolute inset-0 opacity-30">
          <img src={heroTires} alt="Tumpukan ban vulkanisir berkualitas di workshop Aneka Ban Cikupa" width={1920} height={1080} className="h-full w-full object-cover" />
        </div>
        <div className="absolute inset-0" style={{ background: "linear-gradient(to right, oklch(0.18 0.08 258 / 0.92) 0%, oklch(0.18 0.08 258 / 0.6) 60%, transparent 100%)" }} />
        <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 py-20 md:px-6 md:py-28 lg:grid-cols-12 lg:py-36">
          <div className="lg:col-span-7 animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
              <ShieldCheck className="h-3.5 w-3.5" /> Amanah · Berkualitas · Terpercaya
            </span>
            <h1 className="mt-6 text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Solusi <span className="text-accent">Ban Vulkanisir</span> Berkualitas untuk Kendaraan Niaga Anda
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-white/80">
              Aneka Ban Cikupa menyediakan ban vulkanisir berkualitas, tahan lama, dan amanah dengan harga terjangkau untuk truk, bus, pickup, dan armada usaha Anda.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={waLink("Halo Aneka Ban Cikupa, saya ingin berkonsultasi tentang ban vulkanisir.")} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-bold text-primary-deep shadow-[0_14px_40px_-10px_oklch(0.72_0.18_50/0.6)] transition hover:scale-105">
                <MessageCircle className="h-5 w-5" /> Hubungi Kami
              </a>
              <a href="#kontak"
                className="inline-flex items-center gap-2 rounded-full border-2 border-white/30 bg-white/5 px-7 py-3.5 text-sm font-bold text-white backdrop-blur transition hover:border-accent hover:text-accent">
                Minta Penawaran
              </a>
            </div>
            <dl className="mt-12 grid max-w-xl grid-cols-3 gap-6">
              {[
                ["10+", "Tahun Pengalaman"],
                ["500+", "Pelanggan Setia"],
                ["100%", "Komitmen Amanah"],
              ].map(([k, v]) => (
                <div key={v} className="border-l-2 border-accent/60 pl-4">
                  <dt className="text-2xl font-extrabold text-white">{k}</dt>
                  <dd className="text-xs text-white/60">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* TENTANG */}
      <section id="tentang" className="bg-secondary py-20 md:py-28">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 md:px-6 lg:grid-cols-2 lg:items-center">
          <div className="relative">
            <div className="absolute -left-4 -top-4 h-full w-full rounded-2xl bg-accent/20" />
            <img src={processImg} alt="Workshop vulkanisir ban Aneka Ban Cikupa" width={1280} height={960} loading="lazy"
              className="relative rounded-2xl object-cover shadow-[var(--shadow-elegant)]" />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-accent">Tentang Kami</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-primary md:text-4xl">
              Mitra Terpercaya Kendaraan Niaga Anda
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              <strong className="text-foreground">Aneka Ban Cikupa</strong> bergerak di bidang penjualan ban vulkanisir berkualitas untuk berbagai kebutuhan kendaraan niaga. Kami mengutamakan kualitas, keamanan, dan kepuasan pelanggan di setiap proses pengerjaan.
            </p>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              Dengan pengalaman bertahun-tahun melayani pemilik truk, bus, pickup, dan perusahaan logistik, kami berkomitmen menghadirkan ban vulkanisir yang aman digunakan, hemat biaya operasional, dan didukung pelayanan yang ramah serta amanah.
            </p>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2">
              {["Material kompon premium", "Standar quality control ketat", "Garansi pengerjaan", "Harga bersaing"].map((t) => (
                <li key={t} className="flex items-center gap-2 text-sm font-medium text-foreground">
                  <CheckCircle2 className="h-5 w-5 text-accent" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* KEUNGGULAN */}
      <section id="keunggulan" className="bg-background py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-accent">Keunggulan Kami</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-primary md:text-4xl">
              Mengapa Memilih Aneka Ban Cikupa?
            </h2>
            <p className="mt-4 text-muted-foreground">Enam alasan kuat ribuan pelanggan mempercayakan kebutuhan ban vulkanisirnya kepada kami.</p>
          </div>
          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { i: BadgeCheck, t: "Kualitas Terjamin", d: "Diproduksi dengan kompon karet pilihan dan teknologi vulkanisir modern." },
              { i: Wallet, t: "Harga Kompetitif", d: "Hemat hingga 50% dibanding ban baru tanpa mengorbankan performa." },
              { i: ShieldCheck, t: "Aman & Nyaman", d: "Lolos quality control ketat untuk kenyamanan dan keselamatan berkendara." },
              { i: HeartHandshake, t: "Pelayanan Amanah", d: "Tim ramah, jujur, dan responsif siap membantu kebutuhan Anda." },
              { i: Truck, t: "Cocok Kendaraan Niaga", d: "Dirancang khusus untuk truk, bus, pickup, dan armada logistik." },
              { i: Rocket, t: "Pengiriman Cepat", d: "Stok siap kirim dengan layanan antar ke berbagai kota." },
            ].map(({ i: Icon, t, d }) => (
              <div key={t} className="group relative rounded-2xl border border-border bg-card p-7 transition hover:-translate-y-1 hover:border-accent/40 hover:shadow-[var(--shadow-card)]">
                <div className="grid h-12 w-12 place-items-center rounded-xl text-white transition group-hover:scale-110" style={{ background: "var(--gradient-primary)" }}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-bold text-primary">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
                <div className="absolute right-6 top-6 h-1.5 w-1.5 rounded-full bg-accent opacity-0 transition group-hover:opacity-100" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUK */}
      <section id="produk" className="bg-primary-deep py-20 text-white md:py-28">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-end">
            <div className="max-w-xl">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-accent">Produk Kami</span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-white md:text-4xl">
                Katalog Ban Vulkanisir
              </h2>
              <p className="mt-4 text-white/70">Pilihan ban vulkanisir berkualitas untuk berbagai jenis kendaraan niaga.</p>
            </div>
            <Link to="/produk" className="inline-flex items-center gap-2 text-sm font-semibold text-accent hover:underline">
              Lihat semua katalog <ChevronDown className="h-4 w-4 -rotate-90" />
            </Link>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { img: productTruck, n: "Ban Vulkanisir Truk", d: "Kuat untuk muatan berat jarak jauh dengan daya cengkeram optimal." },
              { img: productBus, n: "Ban Vulkanisir Bus", d: "Nyaman, stabil, dan tahan lama untuk operasional bus harian." },
              { img: productPickup, n: "Ban Vulkanisir Pickup", d: "Solusi ekonomis untuk pickup dan kendaraan angkut ringan." },
              { img: productNiaga, n: "Ban Vulkanisir Niaga", d: "Performa maksimal untuk armada logistik dan kendaraan komersial." },
            ].map((p) => (
              <article key={p.n} className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur transition hover:border-accent/40 hover:bg-white/10">
                <div className="relative aspect-square overflow-hidden bg-black">
                  <img src={p.img} alt={p.n} width={900} height={900} loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
                </div>
                <div className="p-5">
                  <h3 className="text-base font-bold text-white">{p.n}</h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-white/60">{p.d}</p>
                  <Link to="/produk"
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-4 py-2.5 text-xs font-bold text-primary-deep transition hover:scale-[1.02]">
                    <ShoppingBag className="h-3.5 w-3.5" /> Belanja Sekarang
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* PROSES */}
      <section id="proses" className="bg-background py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-accent">Proses Vulkanisir</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-primary md:text-4xl">
              5 Tahap Standar Kualitas
            </h2>
            <p className="mt-4 text-muted-foreground">Setiap ban melewati proses ketat untuk menjamin keamanan dan ketahanan.</p>
          </div>
          <ol className="relative mt-16 grid gap-8 lg:grid-cols-5">
            <div className="absolute left-0 right-0 top-7 hidden h-0.5 bg-gradient-to-r from-transparent via-accent to-transparent lg:block" />
            {[
              { i: Search, t: "Seleksi Ban", d: "Memilih casing ban yang masih layak vulkanisir." },
              { i: ClipboardCheck, t: "Pemeriksaan Kualitas", d: "Inspeksi menyeluruh untuk mendeteksi kerusakan." },
              { i: Flame, t: "Proses Vulkanisir", d: "Pemasangan tapak baru dengan mesin presisi tinggi." },
              { i: Settings2, t: "Quality Control", d: "Pengujian akhir tekanan dan tampilan tapak." },
              { i: CheckCircle2, t: "Siap Digunakan", d: "Ban dikirim ke pelanggan dengan jaminan kualitas." },
            ].map(({ i: Icon, t, d }, idx) => (
              <li key={t} className="relative text-center">
                <div className="relative mx-auto grid h-14 w-14 place-items-center rounded-full bg-background ring-4 ring-accent/30">
                  <div className="grid h-14 w-14 place-items-center rounded-full text-white shadow-[var(--shadow-accent)]" style={{ background: "var(--gradient-accent)" }}>
                    <Icon className="h-6 w-6 text-primary-deep" />
                  </div>
                  <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-primary text-[10px] font-bold text-white">{idx + 1}</span>
                </div>
                <h3 className="mt-5 text-base font-bold text-primary">{t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* TESTIMONI */}
      <section id="testimoni" className="bg-secondary py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-accent">Testimoni</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-primary md:text-4xl">
              Dipercaya oleh Para Profesional
            </h2>
          </div>
          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {displayTestimonials.map((t, idx) => (
              <figure key={(t as any).n + idx} className="relative rounded-2xl bg-card p-7 shadow-[var(--shadow-card)]">
                <div className="flex gap-1 text-accent">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < (t.rating ?? 5) ? "fill-current" : "opacity-30"}`} />
                  ))}
                </div>
                <blockquote className="mt-4 text-sm leading-relaxed text-foreground">"{t.q}"</blockquote>
                <figcaption className="mt-6 flex items-center gap-3 border-t border-border pt-4">
                  <div className="grid h-11 w-11 place-items-center rounded-full font-bold text-white" style={{ background: "var(--gradient-primary)" }}>
                    {t.n.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-primary">{t.n}</div>
                    <div className="text-xs text-muted-foreground">{t.r}</div>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-background py-20 md:py-28">
        <div className="mx-auto max-w-4xl px-4 md:px-6">
          <div className="text-center">
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-accent">FAQ</span>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-primary md:text-4xl">Pertanyaan yang Sering Diajukan</h2>
          </div>
          <div className="mt-12 space-y-3">
            {[
              { q: "Apakah ban vulkanisir aman digunakan?", a: "Ya, sangat aman. Ban vulkanisir dari Aneka Ban Cikupa melewati standar quality control ketat dan menggunakan material kompon premium. Cocok untuk operasional harian kendaraan niaga." },
              { q: "Berapa usia pakai ban vulkanisir?", a: "Dengan pemakaian normal dan perawatan baik, ban vulkanisir kami dapat bertahan 70-80% dari usia ban baru, bahkan lebih untuk rute reguler." },
              { q: "Apakah tersedia pengiriman luar kota?", a: "Tentu. Kami melayani pengiriman ke seluruh wilayah Jabodetabek dan luar kota dengan kurir maupun ekspedisi terpercaya." },
              { q: "Bagaimana cara pemesanan?", a: "Cukup hubungi kami via WhatsApp di nomor yang tersedia, atau isi formulir kontak. Tim kami akan segera memberikan penawaran dan informasi stok." },
            ].map((f, i) => (
              <details key={i} className="group rounded-xl border border-border bg-card p-5 transition open:border-accent/40 open:shadow-[var(--shadow-card)]">
                <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-semibold text-primary">
                  {f.q}
                  <ChevronDown className="h-5 w-5 shrink-0 text-accent transition group-open:rotate-180" />
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* KONTAK */}
      <section id="kontak" className="relative overflow-hidden py-20 md:py-28" style={{ background: "var(--gradient-hero)" }}>
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <div className="grid gap-12 lg:grid-cols-2">
            <div className="text-white">
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-accent">Hubungi Kami</span>
              <h2 className="mt-3 text-3xl font-extrabold tracking-tight md:text-4xl">Siap Membantu Kebutuhan Ban Anda</h2>
              <p className="mt-4 text-white/70">Tim kami siap menjawab pertanyaan dan memberikan penawaran terbaik untuk armada Anda.</p>
              <ul className="mt-8 space-y-5">
                {[
                  { i: MapPin, t: "Alamat", v: "Jl. Raya Cikupa No. 88, Tangerang, Banten" },
                  { i: Phone, t: "WhatsApp", v: "+62 812-3456-7890" },
                  { i: Mail, t: "Email", v: "halo@anekabancikupa.co.id" },
                ].map(({ i: Icon, t, v }) => (
                  <li key={t} className="flex items-start gap-4">
                    <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent text-primary-deep">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-white/50">{t}</div>
                      <div className="text-sm font-semibold text-white">{v}</div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
                <iframe
                  title="Lokasi Aneka Ban Cikupa"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3964.123!2d106.5!3d-6.25!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2sCikupa%2C%20Tangerang!5e0!3m2!1sen!2sid!4v1700000000"
                  width="100%" height="240" loading="lazy" className="block border-0" />
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              const f = e.currentTarget;
              const data = new FormData(f);
              const msg = `Halo Aneka Ban Cikupa,\n\nNama: ${data.get("nama")}\nTelepon: ${data.get("telepon")}\nKebutuhan: ${data.get("pesan")}`;
              window.open(waLink(msg), "_blank");
            }} className="rounded-2xl bg-white p-7 shadow-[var(--shadow-elegant)] md:p-9">
              <h3 className="text-xl font-bold text-primary">Minta Penawaran</h3>
              <p className="mt-1 text-sm text-muted-foreground">Isi formulir, tim kami merespons cepat via WhatsApp.</p>
              <div className="mt-6 space-y-4">
                {[
                  { n: "nama", l: "Nama Lengkap", t: "text" },
                  { n: "telepon", l: "Nomor WhatsApp", t: "tel" },
                  { n: "email", l: "Email (opsional)", t: "email", req: false },
                ].map((fd) => (
                  <div key={fd.n}>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{fd.l}</label>
                    <input name={fd.n} type={fd.t} required={fd.req !== false}
                      className="mt-1.5 w-full rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">Kebutuhan Anda</label>
                  <textarea name="pesan" rows={4} required
                    placeholder="Contoh: Saya butuh 10 ban vulkanisir untuk truk fuso..."
                    className="mt-1.5 w-full resize-none rounded-lg border border-border bg-secondary px-4 py-3 text-sm text-foreground outline-none transition focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/20" />
                </div>
                <button type="submit"
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-bold text-primary-deep shadow-[var(--shadow-accent)] transition hover:scale-[1.02]">
                  <MessageCircle className="h-5 w-5" /> Kirim & Lanjutkan ke WhatsApp
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-primary-deep py-14 text-white/70">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 md:px-6 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl" style={{ background: "var(--gradient-accent)" }}>
                <span className="font-extrabold text-primary-deep">A</span>
              </div>
              <div>
                <div className="text-base font-extrabold text-white">ANEKA BAN CIKUPA</div>
                <div className="text-xs text-white/50">Sejak bertahun-tahun melayani Anda</div>
              </div>
            </div>
            <p className="mt-5 max-w-md text-sm italic text-accent">"Jual Ban Vulkanisir Berkualitas dan Amanah"</p>
            <p className="mt-4 max-w-md text-sm">Mitra terpercaya pemilik truk, bus, pickup, dan perusahaan logistik untuk kebutuhan ban vulkanisir berkualitas dengan harga bersahabat.</p>
          </div>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Navigasi</h4>
            <ul className="mt-4 space-y-2 text-sm">
              {[
                { label: "Beranda", href: "#beranda" },
                { label: "Tentang", href: "#tentang" },
                { label: "Keunggulan", href: "#keunggulan" },
                { label: "Produk", href: "#produk" },
                { label: "Kontak", href: "#kontak" },
              ].map((n) => (
                <li key={n.href}><a href={n.href} className="transition hover:text-accent">{n.label}</a></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-white">Ikuti Kami</h4>
            <div className="mt-4 flex gap-3">
              {[Facebook, Instagram, MessageCircle].map((I, i) => (
                <a key={i} href="#" className="grid h-10 w-10 place-items-center rounded-full border border-white/15 transition hover:border-accent hover:bg-accent hover:text-primary-deep">
                  <I className="h-4 w-4" />
                </a>
              ))}
            </div>
            <p className="mt-6 text-xs text-white/50">Jl. Raya Cikupa No. 88<br />Tangerang, Banten</p>
          </div>
        </div>
        <div className="mx-auto mt-10 max-w-7xl border-t border-white/10 px-4 pt-6 text-center text-xs text-white/40 md:px-6">
          © {new Date().getFullYear()} Aneka Ban Cikupa. All rights reserved.
        </div>
      </footer>

      {/* FLOATING WA */}
      <a href={waLink("Halo Aneka Ban Cikupa, saya ingin bertanya.")} target="_blank" rel="noreferrer"
        aria-label="Chat WhatsApp"
        className="animate-float fixed bottom-6 right-6 z-50 grid h-14 w-14 place-items-center rounded-full text-white"
        style={{ background: "oklch(0.62 0.18 145)" }}>
        <svg viewBox="0 0 24 24" fill="currentColor" className="h-7 w-7">
          <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 018.413 3.488 11.824 11.824 0 013.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 01-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.51 5.26l-.999 3.648 3.978-1.027zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>
      </a>
    </div>
  );
}
