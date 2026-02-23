import { useState, useRef } from 'react'
import { Camera, Upload, X, Loader2, Check, AlertCircle } from 'lucide-react'
import api from '../lib/api'

export default function PhotoUpload({ timesheetId, onUploadSuccess, maxPhotos = 5 }) {
    const [selectedFile, setSelectedFile] = useState(null)
    const [preview, setPreview] = useState(null)
    const [uploading, setUploading] = useState(false)
    const [uploadProgress, setUploadProgress] = useState(0)
    const [description, setDescription] = useState('')
    const [error, setError] = useState(null)
    const [success, setSuccess] = useState(false)
    const fileInputRef = useRef(null)

    const handleFileSelect = (e) => {
        const file = e.target.files[0]
        if (!file) return

        // Validate file type
        const validTypes = ['image/jpeg', 'image/png', 'image/webp']
        if (!validTypes.includes(file.type)) {
            setError('Tip fișier invalid. Folosește JPEG, PNG sau WebP.')
            return
        }

        // Validate file size (10MB)
        if (file.size > 10 * 1024 * 1024) {
            setError('Fișier prea mare. Maxim 10MB.')
            return
        }

        setSelectedFile(file)
        setError(null)
        setSuccess(false)

        // Create preview
        const reader = new FileReader()
        reader.onloadend = () => {
            setPreview(reader.result)
        }
        reader.readAsDataURL(file)
    }

    const handleUpload = async () => {
        if (!selectedFile) return

        setUploading(true)
        setError(null)
        setUploadProgress(0)

        try {
            const formData = new FormData()
            formData.append('file', selectedFile)
            if (description) {
                formData.append('description', description)
            }

            const response = await api.post(
                `/timesheets/${timesheetId}/photos`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    },
                    onUploadProgress: (progressEvent) => {
                        const percentCompleted = Math.round(
                            (progressEvent.loaded * 100) / progressEvent.total
                        )
                        setUploadProgress(percentCompleted)
                    }
                }
            )

            setSuccess(true)
            setSelectedFile(null)
            setPreview(null)
            setDescription('')

            if (onUploadSuccess) {
                onUploadSuccess(response.data)
            }

            // Reset success message after 3 seconds
            setTimeout(() => {
                setSuccess(false)
            }, 3000)

        } catch (err) {
            setError(err.response?.data?.detail || 'Eroare la încărcare. Încearcă din nou.')
        } finally {
            setUploading(false)
            setUploadProgress(0)
        }
    }

    const handleCancel = () => {
        setSelectedFile(null)
        setPreview(null)
        setDescription('')
        setError(null)
        setSuccess(false)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                    <Camera className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-900">Încarcă Fotografie</h3>
                    <p className="text-sm text-slate-600">Maxim {maxPhotos} fotografii per pontaj</p>
                </div>
            </div>

            {/* File Input */}
            <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleFileSelect}
                className="hidden"
            />

            {/* Preview or Upload Button */}
            {!preview ? (
                <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-slate-300 rounded-xl p-8 hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
                >
                    <Upload className="w-12 h-12 text-slate-400 group-hover:text-blue-500 mx-auto mb-3" />
                    <p className="text-slate-600 font-medium">Click pentru a selecta fotografie</p>
                    <p className="text-sm text-slate-500 mt-1">JPEG, PNG sau WebP (max 10MB)</p>
                </button>
            ) : (
                <div className="space-y-4">
                    {/* Image Preview */}
                    <div className="relative rounded-xl overflow-hidden border border-slate-200">
                        <img
                            src={preview}
                            alt="Preview"
                            className="w-full h-64 object-cover"
                        />
                        <button
                            onClick={handleCancel}
                            className="absolute top-2 right-2 p-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">
                            Descriere (opțional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Adaugă o descriere pentru această fotografie..."
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                            rows={3}
                        />
                    </div>

                    {/* Upload Progress */}
                    {uploading && (
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-slate-600">Se încarcă...</span>
                                <span className="font-semibold text-blue-600">{uploadProgress}%</span>
                            </div>
                            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-500 transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Upload Button */}
                    <button
                        onClick={handleUpload}
                        disabled={uploading}
                        className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {uploading ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Se încarcă...
                            </>
                        ) : (
                            <>
                                <Upload className="w-5 h-5" />
                                Încarcă Fotografia
                            </>
                        )}
                    </button>
                </div>
            )}

            {/* Error Message */}
            {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{error}</p>
                </div>
            )}

            {/* Success Message */}
            {success && (
                <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-3">
                    <Check className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-emerald-700">Fotografie încărcată cu succes!</p>
                </div>
            )}
        </div>
    )
}
