import React from 'react';

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6 md:p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Syarat & Ketentuan</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              Terakhir diperbarui: 23 Januari 2026
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">1. Penerimaan Ketentuan</h2>
              <p className="text-gray-700 mb-4">
                Dengan menggunakan layanan Kedai Yuru, Anda menyetujui syarat dan ketentuan ini. 
                Jika tidak setuju, mohon tidak menggunakan layanan kami.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">2. Layanan Kami</h2>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Kedai Yuru menyediakan layanan pemesanan makanan dan minuman</li>
                <li>Tersedia layanan pickup dan delivery (jika aktif)</li>
                <li>Pembayaran dapat dilakukan secara tunai atau QRIS</li>
                <li>Harga dan ketersediaan menu dapat berubah sewaktu-waktu</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">3. Pemesanan & Pembayaran</h2>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Pesanan dianggap sah setelah konfirmasi dari kami</li>
                <li>Pembayaran QRIS harus disertai bukti transfer yang valid</li>
                <li>Pesanan dapat dibatalkan sebelum proses memasak dimulai</li>
                <li>Refund akan diproses dalam 1-3 hari kerja jika ada pembatalan</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">4. Delivery</h2>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Waktu pengiriman estimasi 30-60 menit</li>
                <li>Biaya delivery dapat dikenakan sesuai jarak</li>
                <li>Customer wajib memberikan alamat yang jelas dan lengkap</li>
                <li>Kedai Yuru tidak bertanggung jawab atas keterlambatan karena cuaca/lalu lintas</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">5. Kualitas Produk</h2>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Kami berkomitmen menyajikan makanan berkualitas dan higienis</li>
                <li>Jika ada keluhan, dapat menghubungi kami dalam 1 jam setelah penerimaan</li>
                <li>Complain yang valid akan ditangani dengan penggantian atau refund</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">6. Akun Pengguna</h2>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Login dengan Google bersifat opsional untuk kemudahan</li>
                <li>Data akun akan disimpan untuk riwayat pesanan</li>
                <li>Anda dapat menghapus akun kapan saja dengan menghubungi kami</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">7. Batasan Tanggung Jawab</h2>
              <p className="text-gray-700 mb-4">
                Kedai Yuru tidak bertanggung jawab atas kerugian tidak langsung, kehilangan keuntungan, 
                atau kerusakan akibat penggunaan layanan kami di luar kontrol kami.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">8. Perubahan Ketentuan</h2>
              <p className="text-gray-700 mb-4">
                Kedai Yuru berhak mengubah syarat dan ketentuan ini kapan saja. 
                Perubahan akan diberitahukan melalui website atau aplikasi.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">9. Kontak</h2>
              <p className="text-gray-700 mb-4">
                Untuk pertanyaan tentang syarat dan ketentuan ini, silakan hubungi kami melalui WhatsApp 
                yang tersedia di website.
              </p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <button
              onClick={() => window.history.back()}
              className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Kembali
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TermsOfService;