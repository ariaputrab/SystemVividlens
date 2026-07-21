export default function Modal({ isOpen, onClose, onConfirm, title, message, isSuccess = false }: any) {
  if (!isOpen) return null;

  return (
    // Posisi fixed, flex center memastikan modal selalu di tengah layar
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-xl w-full max-w-sm transform transition-all">
        {/* Judul Modal */}
        <h3 className="text-lg font-bold text-[#0F2573] mb-2">{title}</h3>

        {/* Pesan Modal */}
        <div className="text-slate-600 mb-6 text-sm max-h-[60vh] overflow-y-auto">
          {message}
        </div>

        {/* Tombol Aksi */}
        <div className="flex gap-3 justify-end">
          {/* Tombol Batal hanya muncul jika bukan mode sukses */}
          {!isSuccess && (
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition"
            >
              Batal
            </button>
          )}

          {/* Tombol Utama (OK) */}
          <button
            onClick={onConfirm || onClose} 
            className="px-5 py-2 rounded-xl text-sm font-bold bg-[#0F2573] text-white hover:bg-[#1e3a8a] transition"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}