<?php

namespace App\Http\Controllers;

use App\Models\ProjectVendor;
use App\Models\Vendor;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class VendorController extends Controller
{
    use ApiResponse;

    const PATH = '/vendors';

    public function index(Request $request)
    {
        $search = $request->get('search', '');
        $projectId = $request->get('projectId');
        $page = (int) $request->get('page', 1);
        $limit = (int) $request->get('limit', 10);
        $skip = ($page - 1) * $limit;

        $query = Vendor::query();
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('companyName', 'like', "%{$search}%")
                    ->orWhere('workType', 'like', "%{$search}%");
            });
        }
        if ($projectId) {
            $query->whereHas('projectAssignments', function ($q) use ($projectId) {
                $q->where('projectId', $projectId);
            });
        }

        $total = $query->count();
        $vendors = $query->orderBy('created_at', 'desc')
            ->skip($skip)->take($limit)
            ->with(['projectAssignments.project:id,name,code'])
            ->get();

        return $this->apiPaginated('vendors', $vendors, $total, $page, $limit,
            'Vendors retrieved successfully', self::PATH);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string',
            'companyName' => 'nullable|string',
            'contactNumber' => 'required|string',
            'address' => 'nullable|string',
            'workType' => 'required|string',
            'contractAmount' => 'nullable|numeric',
            'paidAmount' => 'nullable|numeric',
            'notes' => 'nullable|string',
            'assignments' => 'nullable|array',
            'assignments.*.projectId' => 'required_with:assignments|string',
            'assignments.*.contractAmount' => 'nullable|numeric',
            'assignments.*.paidAmount' => 'nullable|numeric',
        ]);

        $assignments = $data['assignments'] ?? [];
        unset($data['assignments']);

        if (!empty($assignments)) {
            $contractAmount = collect($assignments)->sum(fn ($a) => (float) ($a['contractAmount'] ?? 0));
            $paidAmount = collect($assignments)->sum(fn ($a) => (float) ($a['paidAmount'] ?? 0));
        } else {
            $contractAmount = (float) ($data['contractAmount'] ?? 0);
            $paidAmount = (float) ($data['paidAmount'] ?? 0);
        }

        $data['contractAmount'] = $contractAmount;
        $data['paidAmount'] = $paidAmount;
        $data['dueAmount'] = $contractAmount - $paidAmount;

        $vendor = Vendor::create($data);

        foreach ($assignments as $assignment) {
            $aContract = (float) ($assignment['contractAmount'] ?? 0);
            $aPaid = (float) ($assignment['paidAmount'] ?? 0);

            ProjectVendor::create([
                'vendorId' => $vendor->id,
                'projectId' => $assignment['projectId'],
                'contractAmount' => $aContract,
                'paidAmount' => $aPaid,
                'dueAmount' => $aContract - $aPaid,
            ]);
        }

        return $this->apiCreated(['vendor' => $vendor->fresh()], 'Vendor created successfully', self::PATH);
    }

    public function show(string $id)
    {
        $vendor = Vendor::with(['cashOuts', 'documents',
            'projectAssignments.project:id,name,code'])->findOrFail($id);

        return $this->apiSuccess(['vendor' => $vendor], 'Vendor retrieved successfully', self::PATH);
    }

    public function update(Request $request, string $id)
    {
        $vendor = Vendor::findOrFail($id);

        $data = $request->validate([
            'name' => 'sometimes|string',
            'companyName' => 'nullable|string',
            'contactNumber' => 'sometimes|string',
            'address' => 'nullable|string',
            'workType' => 'sometimes|string',
            'contractAmount' => 'nullable|numeric',
            'paidAmount' => 'nullable|numeric',
            'notes' => 'nullable|string',
            'assignments' => 'nullable|array',
            'assignments.*.projectId' => 'required_with:assignments|string',
            'assignments.*.contractAmount' => 'nullable|numeric',
            'assignments.*.paidAmount' => 'nullable|numeric',
        ]);

        $hasAssignments = array_key_exists('assignments', $data);
        $assignments = $data['assignments'] ?? [];
        unset($data['assignments']);

        if ($hasAssignments) {
            ProjectVendor::where('vendorId', $id)->delete();

            foreach ($assignments as $assignment) {
                $aContract = (float) ($assignment['contractAmount'] ?? 0);
                $aPaid = (float) ($assignment['paidAmount'] ?? 0);

                ProjectVendor::create([
                    'vendorId' => $id,
                    'projectId' => $assignment['projectId'],
                    'contractAmount' => $aContract,
                    'paidAmount' => $aPaid,
                    'dueAmount' => $aContract - $aPaid,
                ]);
            }
        }

        if (!empty($assignments)) {
            $contractAmount = collect($assignments)->sum(fn ($a) => (float) ($a['contractAmount'] ?? 0));
            $paidAmount = collect($assignments)->sum(fn ($a) => (float) ($a['paidAmount'] ?? 0));
        } else {
            $contractAmount = array_key_exists('contractAmount', $data)
                ? (float) $data['contractAmount']
                : (float) $vendor->contractAmount;
            $paidAmount = array_key_exists('paidAmount', $data)
                ? (float) $data['paidAmount']
                : (float) $vendor->paidAmount;
        }

        $data['contractAmount'] = $contractAmount;
        $data['paidAmount'] = $paidAmount;
        $data['dueAmount'] = $contractAmount - $paidAmount;

        $vendor->update($data);

        return $this->apiSuccess(['vendor' => $vendor->fresh()], 'Vendor updated successfully', self::PATH);
    }

    public function destroy(string $id)
    {
        if (!in_array(Auth::user()->role, ['SUPER_ADMIN', 'ADMIN'])) {
            return $this->apiForbidden(self::PATH, 'Forbidden: Insufficient privileges');
        }

        $vendor = Vendor::findOrFail($id);
        $vendor->delete();
        return $this->apiSuccess(null, 'Vendor deleted successfully', self::PATH);
    }

    public function page()
    {
        return Inertia::render('Dashboard/Vendor/Index');
    }
}
