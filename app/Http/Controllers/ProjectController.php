<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class ProjectController extends Controller
{
    use ApiResponse;

    const PATH = '/projects';

    /**
     * Display paginated list of projects (SUPER_ADMIN) or basic list for others.
     */
    public function index(Request $request)
    {
        $user = Auth::user();
        $search = $request->get('search', '');

        $query = Project::query();

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('code', 'like', "%{$search}%")
                  ->orWhere('clientName', 'like', "%{$search}%");
            });
        }

        // Non-Super Admins get only id, code, name for dropdown menus
        if ($user->role !== 'SUPER_ADMIN') {
            $projects = $query->orderBy('code')->get(['id', 'name', 'code']);
            return $this->apiSuccess(
                ['projects' => $projects, 'total' => $projects->count(), 'page' => 1, 'limit' => $projects->count()],
                'Projects basic list retrieved successfully',
                self::PATH
            );
        }

        // Full paginated list for SUPER_ADMIN
        $page = (int) $request->get('page', 1);
        $limit = (int) $request->get('limit', 10);
        $skip = ($page - 1) * $limit;

        $total = $query->count();
        $projects = $query->orderBy('created_at', 'desc')
            ->skip($skip)->take($limit)
            ->with(['materials:id,name,totalPrice,purchaseDate,projectId',
                    'cashOuts:id,amount,expenseCategory,date,projectId',
                    'cashIns:id,amount,date,projectId',
                    'labours:id,name,dailyWage,projectId',
                    'projectVendors:id,projectId,vendorId,contractAmount,paidAmount,dueAmount',
                    'projectVendors.vendor:id,name,workType',
                    'projectSuppliers:id,projectId,supplierId,contractAmount,paidAmount,dueAmount',
                    'projectSuppliers.supplier:id,name'])
            ->get();

        return $this->apiPaginated('projects', $projects, $total, $page, $limit,
            'Projects paginated list retrieved successfully', self::PATH);
    }

    /**
     * Store a newly created project (SUPER_ADMIN only).
     */
    public function store(Request $request)
    {
        $user = Auth::user();

        if ($user->role !== 'SUPER_ADMIN') {
            return $this->apiForbidden(self::PATH, 'Forbidden: Super Admin access required');
        }

        $data = $request->validate([
            'name' => 'required|string|min:2|max:120',
            'code' => 'required|string|min:2|max:30|regex:/^[A-Z0-9\-_]+$/i|unique:projects,code',
            'clientName' => 'required|string|min:2',
            'clientContactNumber' => 'required|string|min:5',
            'projectLocation' => 'required|string|min:3',
            'startDate' => 'required|date',
            'expectedCompletionDate' => 'required|date|after:startDate',
            'estimatedBudget' => 'required|numeric|min:0.01',
            'projectType' => 'required|string|in:CONSULTANCY,SUPERVISION,CONSTRUCTION,SUPPLYING',
            'status' => 'nullable|string|in:PLANNING,RUNNING,COMPLETED,ARCHIVED',
            'description' => 'nullable|string|max:1000',
        ]);

        $project = Project::create([
            ...$data,
            'status' => $data['status'] ?? 'PLANNING',
        ]);

        return $this->apiCreated(['project' => $project], 'Project created successfully', self::PATH);
    }

    /**
     * Lightweight, unpaginated list of all projects (id, name, code) for
     * assignment dropdowns (e.g. Suppliers/Vendors project assignment).
     */
    public function list()
    {
        $projects = Project::select('id', 'name', 'code')->orderBy('name')->get();

        return $this->apiSuccess(['projects' => $projects], 'Projects list retrieved successfully', self::PATH);
    }

    /**
     * Show a single project with all relations.
     */
    public function show(string $id)
    {
        if (Auth::user()->role !== 'SUPER_ADMIN') {
            return $this->apiForbidden(self::PATH, 'Forbidden: Super Admin access required');
        }

        $project = Project::with([
            'materials.supplier:id,name',
            'cashIns',
            'cashOuts',
            'labours',
            'documents',
            'attendances',
            'projectVendors.vendor:id,name,workType',
            'projectSuppliers.supplier:id,name',
        ])->findOrFail($id);

        return $this->apiSuccess(['project' => $project], 'Project retrieved successfully', self::PATH);
    }

    /**
     * Update a project (SUPER_ADMIN only).
     */
    public function update(Request $request, string $id)
    {
        $user = Auth::user();

        if ($user->role !== 'SUPER_ADMIN') {
            return $this->apiForbidden(self::PATH, 'Forbidden: Super Admin access required');
        }

        $project = Project::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|min:2|max:120',
            'code' => "sometimes|string|min:2|max:30|regex:/^[A-Z0-9\-_]+$/i|unique:projects,code,{$id}",
            'clientName' => 'sometimes|string|min:2',
            'clientContactNumber' => 'sometimes|string|min:5',
            'projectLocation' => 'sometimes|string|min:3',
            'startDate' => 'sometimes|date',
            'expectedCompletionDate' => 'sometimes|date',
            'estimatedBudget' => 'sometimes|numeric|min:0.01',
            'projectType' => 'sometimes|string|in:CONSULTANCY,SUPERVISION,CONSTRUCTION,SUPPLYING',
            'status' => 'sometimes|string|in:PLANNING,RUNNING,COMPLETED,ARCHIVED',
            'description' => 'nullable|string|max:1000',
        ]);

        // Cross-field check: completion date must be after start date.
        // Since both fields are optional on update, fall back to the existing
        // project's stored value for whichever side wasn't submitted.
        $validator->after(function ($validator) use ($request, $project) {
            $startDate = $request->input('startDate', optional($project->startDate)->toDateString());
            $completionDate = $request->input('expectedCompletionDate', optional($project->expectedCompletionDate)->toDateString());

            if ($startDate && $completionDate && strtotime($completionDate) <= strtotime($startDate)) {
                $validator->errors()->add('expectedCompletionDate', 'Completion date must be after start date.');
            }
        });

        $data = $validator->validate();

        $project->update($data);

        return $this->apiSuccess(['project' => $project->fresh()], 'Project updated successfully', self::PATH);
    }

    /**
     * Delete a project (SUPER_ADMIN only).
     */
    public function destroy(string $id)
    {
        $user = Auth::user();

        if ($user->role !== 'SUPER_ADMIN') {
            return $this->apiForbidden(self::PATH, 'Forbidden: Super Admin access required');
        }

        $project = Project::findOrFail($id);
        $project->delete();

        return $this->apiSuccess(null, 'Project deleted successfully', self::PATH);
    }

    /**
     * Inertia page for projects dashboard (renders React component).
     */
    public function page()
    {
        return Inertia::render('Dashboard/Projects/Index');
    }
}
