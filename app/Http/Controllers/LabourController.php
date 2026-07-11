<?php

namespace App\Http\Controllers;

use App\Models\Labour;
use App\Models\Attendance;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Carbon\Carbon;
use Inertia\Inertia;

class LabourController extends Controller
{
    use ApiResponse;

    const PATH = '/labours';

    public function index(Request $request)
    {
        $search = $request->get('search', '');
        $projectId = $request->get('projectId');
        $page = (int) $request->get('page', 1);
        $limit = (int) $request->get('limit', 10);
        $skip = ($page - 1) * $limit;

        $query = Labour::with(['project:id,name,code']);
        if ($search) {
            $query->where('name', 'like', "%{$search}%")->orWhere('trade', 'like', "%{$search}%");
        }
        if ($projectId) {
            $query->where('projectId', $projectId);
        }

        $total = $query->count();
        $labours = $query->orderBy('created_at', 'desc')->skip($skip)->take($limit)->get();

        return $this->apiPaginated('labours', $labours, $total, $page, $limit,
            'Labours retrieved successfully', self::PATH);
    }

    public function store(Request $request)
    {
        $user = Auth::user();

        if (in_array($user->role, ['ACCOUNTANT', 'DATA_ENTRY_OPERATOR'])) {
            return $this->apiForbidden(self::PATH, 'Forbidden: Insufficient role to create labour records');
        }

        $data = $request->validate([
            'name' => 'required|string',
            'phoneNumber' => 'required|string',
            'trade' => 'required|string',
            'dailyWage' => 'required|numeric',
            'projectId' => 'required|uuid|exists:projects,id',
            'employmentStatus' => 'nullable|string|in:ACTIVE,INACTIVE',
        ]);

        $labour = Labour::create([...$data, 'employmentStatus' => $data['employmentStatus'] ?? 'ACTIVE']);

        return $this->apiCreated(['labour' => $labour->load('project:id,name,code')],
            'Labour created successfully', self::PATH);
    }

    public function show(string $id)
    {
        $labour = Labour::with(['project:id,name,code', 'attendances'])->findOrFail($id);
        return $this->apiSuccess(['labour' => $labour], 'Labour retrieved successfully', self::PATH);
    }

    public function update(Request $request, string $id)
    {
        $user = Auth::user();

        if (in_array($user->role, ['ACCOUNTANT', 'DATA_ENTRY_OPERATOR'])) {
            return $this->apiForbidden(self::PATH, 'Forbidden: Insufficient role to update labour records');
        }

        $labour = Labour::findOrFail($id);

        $data = $request->validate([
            'name' => 'sometimes|string',
            'phoneNumber' => 'sometimes|string',
            'trade' => 'sometimes|string',
            'dailyWage' => 'sometimes|numeric',
            'projectId' => 'sometimes|uuid|exists:projects,id',
            'employmentStatus' => 'sometimes|string|in:ACTIVE,INACTIVE',
        ]);

        $labour->update($data);

        return $this->apiSuccess(['labour' => $labour->fresh('project')], 'Labour updated successfully', self::PATH);
    }

    public function destroy(string $id)
    {
        $user = Auth::user();

        if (!in_array($user->role, ['SUPER_ADMIN', 'ADMIN'])) {
            return $this->apiForbidden(self::PATH, 'Forbidden: Super Admin or Admin access required');
        }

        Labour::findOrFail($id)->delete();
        return $this->apiSuccess(null, 'Labour deleted successfully', self::PATH);
    }

    // ─── Attendance Sub-Resource ───────────────────────────────────────────────

    public function bulkAttendance(Request $request)
    {
        $data = $request->validate([
            'date' => 'required|date',
            'records' => 'required|array',
            'records.*.labourId' => 'required|uuid|exists:labours,id',
            'records.*.status' => 'required|string|in:PRESENT,ABSENT,LEAVE',
            'records.*.projectId' => 'nullable|uuid|exists:projects,id',
        ]);

        $attendanceDate = Carbon::parse($data['date'])->startOfDay();

        $saved = [];
        foreach ($data['records'] as $record) {
            $att = Attendance::updateOrCreate(
                ['labourId' => $record['labourId'], 'date' => $attendanceDate],
                ['status' => $record['status'], 'projectId' => $record['projectId'] ?? null]
            );
            $saved[] = $att;
        }

        return $this->apiSuccess(['count' => count($saved)], 'Attendance logs saved successfully', '/attendance');
    }

    /**
     * Read back saved attendance records for a given date (defaults to today).
     * GET /attendance?date=YYYY-MM-DD
     */
    public function attendanceByDate(Request $request)
    {
        $dateStr = $request->query('date');
        $queryDate = $dateStr ? Carbon::parse($dateStr)->startOfDay() : Carbon::now()->startOfDay();
        $nextDay = $queryDate->copy()->addDay();

        $attendances = Attendance::with(['labour:id,name,trade,dailyWage'])
            ->where('date', '>=', $queryDate)
            ->where('date', '<', $nextDay)
            ->get();

        return $this->apiSuccess(['attendances' => $attendances], 'Attendance logs retrieved successfully', '/attendance');
    }

    public function page()
    {
        return Inertia::render('Dashboard/Labours/Index');
    }
}
