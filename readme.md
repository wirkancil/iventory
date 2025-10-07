buat aplikasi dashboard stok barang (UI sederhana)

barang {
	nama,
	kode,
	stok,
	lokasi_rak
}

transaksi {
	id_barang,
	tanggal,
	tipe_transaksi (barang masuk atau barang keluar),
	id_user,
}

user {
	name,
	username,
	password,
	role,
}

features:
1. Login admin & operator
2. CRUD barang
3. CRUD user operator (operator hanya bisa akses fitur master barang dan transaksi)
4. CRUD transaksi (transaksi masuk, transaksi keluar)
5. tandai stok kurang dari 10
6. test CRUD transaksi menggunakan tool Grafana k6 (perhatikan race condition)
7. pastikan stok tetap akurat apabila multiple users merubah stok secara bersamaan
8. deploy ke railway.app