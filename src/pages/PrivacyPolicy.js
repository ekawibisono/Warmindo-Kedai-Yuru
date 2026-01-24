import React from 'react';

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6 md:p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Kebijakan Privasi</h1>
          
          <div className="prose prose-lg max-w-none">
            <p className="text-gray-600 mb-6">
              Terakhir diperbarui: 23 Januari 2026
            </p>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">1. Informasi yang Kami Kumpulkan</h2>
              <p className="text-gray-700 mb-4">Kami mengumpulkan informasi berikut:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>Info Kontak:</strong> Nama, nomor WhatsApp, alamat delivery</li>
                <li><strong>Akun Google:</strong> Nama, email, foto profil (jika login dengan Google)</li>
                <li><strong>Riwayat Pesanan:</strong> Detail pesanan, tanggal, total belanja</li>
                <li><strong>Preferensi:</strong> Menu favorit, catatan khusus</li>
                <li><strong>Data Teknis:</strong> IP address, browser, waktu akses untuk keamanan</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">2. Bagaimana Kami Menggunakan Data</h2>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Memproses dan mengirim pesanan Anda</li>
                <li>Menghubungi Anda terkait status pesanan</li>
                <li>Menyimpan riwayat untuk kemudahan pemesanan berikutnya</li>
                <li>Memberikan rekomendasi menu yang relevan</li>
                <li>Mengirim promo dan penawaran khusus (dengan persetujuan)</li>
                <li>Menganalisis data untuk meningkatkan layanan</li>
                <li>Mencegah fraud dan menjaga keamanan</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">3. Login dengan Google</h2>
              <p className="text-gray-700 mb-4">
                Jika Anda memilih login dengan Google:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Kami hanya mengakses info profil dasar (nama, email, foto)</li>
                <li>Kami tidak menyimpan password Google Anda</li>
                <li>Anda dapat mencabut akses kapan saja melalui pengaturan Google</li>
                <li>Data Google ID hanya digunakan untuk autentikasi</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">4. Keamanan Data</h2>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Data disimpan di server yang aman dengan enkripsi</li>
                <li>Akses dibatasi hanya untuk staff yang berwenang</li>
                <li>Kami melakukan backup rutin untuk mencegah kehilangan data</li>
                <li>Sistem keamanan dimonitor 24/7</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">5. Berbagi Data dengan Pihak Ketiga</h2>
              <p className="text-gray-700 mb-4">
                Kami <strong>TIDAK</strong> menjual atau menyewakan data pribadi Anda. 
                Data hanya dibagikan dalam situasi berikut:
              </p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Dengan kurir delivery untuk pengiriman pesanan</li>
                <li>Dengan penyedia payment gateway (untuk QRIS)</li>
                <li>Jika diwajibkan oleh hukum atau otoritas berwenang</li>
                <li>Dengan persetujuan eksplisit dari Anda</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">6. Cookies dan Tracking</h2>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Kami menggunakan cookies untuk menyimpan keranjang belanja</li>
                <li>Session cookies untuk menjaga login Anda</li>
                <li>Analytics untuk memahami pola penggunaan website</li>
                <li>Anda dapat menonaktifkan cookies melalui pengaturan browser</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">7. Hak Anda</h2>
              <p className="text-gray-700 mb-4">Anda memiliki hak untuk:</p>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li><strong>Akses:</strong> Melihat data pribadi yang kami simpan</li>
                <li><strong>Koreksi:</strong> Memperbarui informasi yang tidak akurat</li>
                <li><strong>Penghapusan:</strong> Menghapus akun dan data pribadi</li>
                <li><strong>Portabilitas:</strong> Mendapat salinan data dalam format yang dapat dibaca</li>
                <li><strong>Keberatan:</strong> Menolak penggunaan data untuk marketing</li>
              </ul>
              <p className="text-gray-700 mt-4">
                Untuk menggunakan hak-hak ini, hubungi kami melalui WhatsApp.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">8. Penyimpanan Data</h2>
              <ul className="list-disc pl-6 text-gray-700 space-y-2">
                <li>Data pesanan disimpan selama 2 tahun untuk keperluan bisnis</li>
                <li>Data akun disimpan selama akun aktif</li>
                <li>Data akan dihapus otomatis setelah periode retensi berakhir</li>
                <li>Anda dapat meminta penghapusan lebih awal kapan saja</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">9. Anak di Bawah Umur</h2>
              <p className="text-gray-700 mb-4">
                Layanan kami tidak diperuntukkan untuk anak di bawah 13 tahun. 
                Jika kami mengetahui ada data anak di bawah umur, akan segera dihapus.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">10. Perubahan Kebijakan</h2>
              <p className="text-gray-700 mb-4">
                Kebijakan privasi ini dapat berubah sesuai perkembangan layanan. 
                Perubahan signifikan akan diberitahukan melalui website atau email.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">11. Kontak</h2>
              <p className="text-gray-700 mb-4">
                Untuk pertanyaan tentang kebijakan privasi atau penggunaan data Anda, 
                silakan hubungi kami melalui WhatsApp yang tersedia di website.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <p className="text-blue-800 text-sm">
                  <strong>💡 Komitmen Kami:</strong> Kedai Yuru berkomitmen melindungi privasi Anda. 
                  Kami hanya mengumpulkan data yang diperlukan untuk memberikan layanan terbaik.
                </p>
              </div>
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

export default PrivacyPolicy;