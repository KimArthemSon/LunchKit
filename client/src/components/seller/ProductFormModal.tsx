import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { I } from "../Shared";
import { useAuth } from "../../context/AuthContext";
import {
  PRODUCT_CATEGORIES, PRODUCT_STATUSES, assetUrl, formatFileSize, downloadProductFile,
  type Product, type ProductInput, type ProductCategory, type ProductStatus,
} from "../../api/products";

interface Props {
  product: Product | null; // null = creating a new product
  onClose: () => void;
  onSubmit: (input: ProductInput) => Promise<void>;
}

const MAX_FILE_SIZE = 500 * 1024 * 1024;
const MAX_PREVIEW_SIZE = 5 * 1024 * 1024;
const FILE_ACCEPT =
  ".zip,.rar,.7z,.pdf,.ppt,.pptx,.key,.fig,.sketch,.xd,.psd,.ai,.eps,.svg,.png,.jpg,.jpeg,.webp,.gif,.mp4,.mov,.webm,.aep,.prproj,.mogrt,.ttf,.otf,.json";

const inputClass =
  "w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-purple-500/50";
const labelClass = "block text-sm text-gray-400 mb-1.5";
const dropzoneClass =
  "flex items-center gap-3 w-full px-4 py-3 bg-white/5 border border-dashed border-white/20 rounded-xl cursor-pointer hover:border-purple-500/50 transition-colors";

export default function ProductFormModal({ product, onClose, onSubmit }: Props) {
  const { token } = useAuth();
  const [form, setForm] = useState({
    title: product?.title ?? "",
    description: product?.description ?? "",
    price: product ? String(product.price) : "",
    category: (product?.category ?? PRODUCT_CATEGORIES[0]) as ProductCategory,
    status: (product?.status ?? "draft") as ProductStatus,
  });
  const [file, setFile] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<File | null>(null);
  const [previewSrc, setPreviewSrc] = useState(assetUrl(product?.previewImageUrl));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  // Show a local thumbnail for a newly picked preview image
  useEffect(() => {
    if (!previewImage) return;
    const url = URL.createObjectURL(previewImage);
    setPreviewSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [previewImage]);

  const set = (key: keyof typeof form) =>
    (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const pickFile = (picked: File | undefined) => {
    if (!picked) return;
    if (picked.size > MAX_FILE_SIZE) return setError("Product file is too large (max 500 MB)");
    setError("");
    setFile(picked);
  };

  const pickPreview = (picked: File | undefined) => {
    if (!picked) return;
    if (!picked.type.startsWith("image/")) return setError("Preview must be an image");
    if (picked.size > MAX_PREVIEW_SIZE) return setError("Preview image is too large (max 5 MB)");
    setError("");
    setPreviewImage(picked);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!product && !file) return setError("Please upload the product file");
    setError("");
    setIsSaving(true);
    try {
      await onSubmit({
        title: form.title.trim(),
        description: form.description.trim(),
        price: Number(form.price),
        category: form.category,
        status: form.status,
        file: file ?? undefined,
        previewImage: previewImage ?? undefined,
      });
    } catch (err: any) {
      setError(err.message);
      setIsSaving(false);
    }
  };

  const handleDownload = async () => {
    if (!product) return;
    try {
      await downloadProductFile(token, product);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0f0f17] border border-white/10 rounded-2xl p-6"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">{product ? "Edit Product" : "Add Product"}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white">
            <I name="X" size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className={labelClass}>Title *</label>
            <input required maxLength={120} value={form.title} onChange={set("title")} className={inputClass} placeholder="iPhone 15 Pro Mockup Pack" />
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Description</label>
            <textarea rows={4} maxLength={5000} value={form.description} onChange={set("description")} className={inputClass} placeholder="What's included, formats, use cases..." />
          </div>

          <div>
            <label className={labelClass}>Price (USD) *</label>
            <input required type="number" min="0" step="0.01" value={form.price} onChange={set("price")} className={inputClass} placeholder="12.99" />
          </div>

          <div>
            <label className={labelClass}>Category *</label>
            <select value={form.category} onChange={set("category")} className={inputClass}>
              {PRODUCT_CATEGORIES.map((c) => <option key={c} value={c} className="bg-[#0f0f17]">{c}</option>)}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Product File {product ? "(upload to replace)" : "*"}</label>
            <label className={dropzoneClass}>
              <I name="Download" size={20} className="text-purple-400 rotate-180 shrink-0" />
              <span className="flex-1 min-w-0 truncate text-sm">
                {file ? (
                  <span className="text-white">{file.name} <span className="text-gray-500">· {formatFileSize(file.size)}</span></span>
                ) : (
                  <span className="text-gray-500">Click to choose a file (ZIP, PDF, PPTX, FIG, PSD, MP4… up to 500 MB)</span>
                )}
              </span>
              <input type="file" accept={FILE_ACCEPT} className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
            </label>
            {product && !file && (
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                <I name="FileText" size={14} />
                <span className="truncate">Current: {product.fileName} · {formatFileSize(product.fileSize)}</span>
                <button type="button" onClick={handleDownload} className="text-purple-400 hover:text-purple-300 font-medium">
                  Download
                </button>
              </div>
            )}
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Preview Image</label>
            <label className={dropzoneClass}>
              {previewSrc ? (
                <img src={previewSrc} alt="Preview" className="w-14 h-14 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-white/10 flex items-center justify-center text-gray-500 shrink-0">
                  <I name="Image" size={20} />
                </div>
              )}
              <span className="text-sm text-gray-500 truncate">
                {previewImage ? previewImage.name : previewSrc ? "Click to replace image" : "Click to choose an image (PNG, JPG, WebP, GIF, up to 5 MB)"}
              </span>
              <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={(e) => pickPreview(e.target.files?.[0])} />
            </label>
          </div>

          <div className="md:col-span-2">
            <label className={labelClass}>Status</label>
            <div className="flex gap-2">
              {PRODUCT_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, status: s }))}
                  className={`px-4 py-2 rounded-xl text-sm font-medium capitalize border transition-colors ${
                    form.status === s
                      ? "bg-purple-600 border-purple-500 text-white"
                      : "bg-white/5 border-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-xl text-gray-300 hover:bg-white/10">
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-bold transition-all"
          >
            {isSaving ? "Uploading..." : product ? "Save Changes" : "Create Product"}
          </button>
        </div>
      </form>
    </div>
  );
}
