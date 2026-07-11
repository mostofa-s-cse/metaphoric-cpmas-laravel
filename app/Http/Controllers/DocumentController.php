<?php

namespace App\Http\Controllers;

use App\Models\Document;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class DocumentController extends Controller
{
    use ApiResponse;

    const PATH = '/documents';

    public function index(Request $request)
    {
        $projectId = $request->get('projectId');
        $supplierId = $request->get('supplierId');
        $vendorId = $request->get('vendorId');
        $employeeId = $request->get('employeeId');
        $search = $request->get('search');
        $category = $request->get('category');

        $query = Document::with([
            'project:id,name,code',
            'supplier:id,name',
            'vendor:id,name',
            'employee:id,fullName',
        ])->orderBy('uploadDate', 'desc');

        if ($projectId) $query->where('projectId', $projectId);
        if ($supplierId) $query->where('supplierId', $supplierId);
        if ($vendorId) $query->where('vendorId', $vendorId);
        if ($employeeId) $query->where('employeeId', $employeeId);
        if ($category) $query->where('category', $category);
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('description', 'like', "%{$search}%");
            });
        }

        $documents = $query->get();

        return $this->apiSuccess(['documents' => $documents], 'Documents retrieved successfully', self::PATH);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string',
            'fileType' => 'required|string',
            'category' => 'required|string|in:CONTRACT,INVOICE,CHALLAN,QUOTATION,OTHER',
            'url' => 'nullable|string',
            'description' => 'nullable|string',
            'projectId' => 'nullable|uuid|exists:projects,id',
            'supplierId' => 'nullable|uuid|exists:suppliers,id',
            'vendorId' => 'nullable|uuid|exists:vendors,id',
            'employeeId' => 'nullable|uuid|exists:employees,id',
            'labourId' => 'nullable|uuid|exists:labours,id',
        ]);

        $docUrl = $data['url'] ?? '/uploads/' . strtolower(str_replace(' ', '_', $data['name'])) . '.' . strtolower($data['fileType']);

        $document = Document::create([...$data, 'url' => $docUrl]);

        return $this->apiCreated(['document' => $document], 'Document uploaded successfully', self::PATH);
    }

    public function upload(Request $request)
    {
        $request->validate(['file' => 'required|file|max:20480']); // 20MB max

        $file = $request->file('file');
        $filename = time() . '_' . preg_replace('/[^a-zA-Z0-9.-]/', '_', $file->getClientOriginalName());

        $file->move(public_path('uploads'), $filename);

        return $this->apiSuccess(['url' => '/uploads/' . $filename], 'File uploaded successfully', '/upload');
    }

    public function destroy(string $id)
    {
        if (Auth::user()->role !== 'SUPER_ADMIN') {
            return $this->apiForbidden(self::PATH, 'Forbidden: Super Admin access required');
        }

        $document = Document::findOrFail($id);

        $this->deletePhysicalFile($document->url);

        $document->delete();

        return $this->apiSuccess(null, 'Document deleted successfully', self::PATH);
    }

    /**
     * Delete the physical file stored under public/uploads for a document's url.
     * Fails gracefully if the file is missing so a DB row can still be removed.
     */
    private function deletePhysicalFile(?string $url): void
    {
        if (!$url) return;

        $cleanPath = preg_replace('#^/public#', '', $url);

        if (str_starts_with($cleanPath, '/uploads/')) {
            $filename = substr($cleanPath, strlen('/uploads/'));
            $filepath = public_path('uploads/' . $filename);

            if (File::exists($filepath)) {
                File::delete($filepath);
            }
        }
    }

    public function page()
    {
        return Inertia::render('Dashboard/Documents/Index');
    }
}
