import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminStore } from '../../store/adminStore'
import { Camera, ArrowLeft } from 'lucide-react'
import PhotoUpload from '../../components/PhotoUpload'
import PhotoGallery from '../../components/PhotoGallery'

export default function PhotoTestPage() {
    const navigate = useNavigate()
    const { admin } = useAdminStore()
    const [testTimesheetId, setTestTimesheetId] = useState('test-timesheet-123')
    const [refreshKey, setRefreshKey] = useState(0)

    const handleUploadSuccess = (data) => {
        console.log('Photo uploaded:', data)
        // Refresh gallery
        setRefreshKey(prev => prev + 1)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 p-6">
            <div className="max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-6">
                    <button
                        onClick={() => navigate('/admin/dashboard')}
                        className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Înapoi la Dashboard
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg">
                            <Camera className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900">Test Încărcare Fotografii</h1>
                            <p className="text-slate-600 mt-1">Testează funcționalitatea de upload pentru pontaje</p>
                        </div>
                    </div>
                </div>

                {/* Test Timesheet ID Input */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 mb-6">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                        Timesheet ID (pentru test)
                    </label>
                    <input
                        type="text"
                        value={testTimesheetId}
                        onChange={(e) => setTestTimesheetId(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        placeholder="test-timesheet-123"
                    />
                    <p className="text-sm text-slate-500 mt-2">
                        💡 Acest ID va fi folosit pentru a asocia fotografiile cu un pontaj specific
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Upload Section */}
                    <div>
                        <PhotoUpload
                            timesheetId={testTimesheetId}
                            onUploadSuccess={handleUploadSuccess}
                            maxPhotos={10}
                        />
                    </div>

                    {/* Gallery Section */}
                    <div>
                        <PhotoGallery
                            key={refreshKey}
                            timesheetId={testTimesheetId}
                            canDelete={true}
                        />
                    </div>
                </div>

                {/* Info Card */}
                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <h3 className="font-semibold text-blue-900 mb-2">ℹ️ Informații</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Fotografiile sunt salvate în <code className="bg-blue-100 px-2 py-0.5 rounded">/backend/uploads/sites/</code></li>
                        <li>• Dimensiune maximă: 10MB per fotografie</li>
                        <li>• Formate acceptate: JPEG, PNG, WebP</li>
                        <li>• Imaginile sunt redimensionate automat la max 1920x1080</li>
                        <li>• Se creează automat thumbnail-uri de 300x300px</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
