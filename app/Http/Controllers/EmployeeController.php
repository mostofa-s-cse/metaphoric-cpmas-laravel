<?php

namespace App\Http\Controllers;

use App\Models\CashOut;
use App\Models\Employee;
use App\Models\Salary;
use App\Traits\ApiResponse;
use App\Traits\HasMainBalance;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class EmployeeController extends Controller
{
    use ApiResponse, HasMainBalance;

    const PATH = '/employees';

    public function index(Request $request)
    {
        $search = $request->get('search', '');
        $page = (int) $request->get('page', 1);
        $limit = (int) $request->get('limit', 10);
        $skip = ($page - 1) * $limit;

        $query = Employee::with('salaries');
        if ($search) {
            $query->where('fullName', 'like', "%{$search}%")
                  ->orWhere('designation', 'like', "%{$search}%")
                  ->orWhere('employeeId', 'like', "%{$search}%");
        }

        $total = $query->count();
        $employees = $query->orderBy('created_at', 'desc')->skip($skip)->take($limit)->get();

        if (! $this->hasSalaryAccess()) {
            $employees = $employees->map(fn ($employee) => $this->redactSalaryFields($employee));
        }

        return $this->apiPaginated('employees', $employees, $total, $page, $limit,
            'Employees retrieved successfully', self::PATH);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'employeeId' => 'required|string|unique:employees,employeeId',
            'fullName' => 'required|string',
            'designation' => 'required|string',
            'department' => 'required|string',
            'phoneNumber' => 'required|string',
            'email' => 'nullable|email',
            'joiningDate' => 'required|date',
            'monthlySalary' => 'required|numeric',
            'employmentStatus' => 'nullable|string|in:ACTIVE,INACTIVE,SUSPENDED',
        ]);

        $employee = Employee::create([
            ...$data,
            'employmentStatus' => $data['employmentStatus'] ?? 'ACTIVE',
        ]);

        return $this->apiCreated(['employee' => $employee], 'Employee created successfully', self::PATH);
    }

    public function show(string $id)
    {
        $employee = Employee::with(['salaries', 'documents'])->findOrFail($id);

        if (! $this->hasSalaryAccess()) {
            $employee = $this->redactSalaryFields($employee);
        }

        return $this->apiSuccess(['employee' => $employee], 'Employee retrieved successfully', self::PATH);
    }

    public function update(Request $request, string $id)
    {
        $employee = Employee::findOrFail($id);

        $data = $request->validate([
            'employeeId' => "sometimes|string|unique:employees,employeeId,{$id}",
            'fullName' => 'sometimes|string',
            'designation' => 'sometimes|string',
            'department' => 'sometimes|string',
            'phoneNumber' => 'sometimes|string',
            'email' => 'nullable|email',
            'joiningDate' => 'sometimes|date',
            'monthlySalary' => 'sometimes|numeric',
            'employmentStatus' => 'sometimes|string|in:ACTIVE,INACTIVE,SUSPENDED',
        ]);

        $employee->update($data);

        return $this->apiSuccess(['employee' => $employee->fresh()], 'Employee updated successfully', self::PATH);
    }

    public function destroy(string $id)
    {
        $employee = Employee::findOrFail($id);
        $employee->delete();
        return $this->apiSuccess(null, 'Employee deleted successfully', self::PATH);
    }

    // ─── Salary Access Control ─────────────────────────────────────────────────

    /**
     * Only these roles may see real salary/financial figures.
     */
    private function hasSalaryAccess(): bool
    {
        $role = Auth::user()?->role;
        return in_array($role, ['SUPER_ADMIN', 'ADMIN', 'ACCOUNTANT'], true);
    }

    /**
     * Zero out salary-related fields for low-privilege roles before the
     * employee (and any eager-loaded salaries) is returned in a response.
     */
    private function redactSalaryFields(Employee $employee): Employee
    {
        $employee->monthlySalary = 0;

        if ($employee->relationLoaded('salaries')) {
            $employee->salaries->transform(function (Salary $salary) {
                $salary->basicSalary = 0;
                $salary->bonus = 0;
                $salary->deduction = 0;
                $salary->netSalary = 0;
                $salary->paidAmount = 0;
                $salary->dueAmount = 0;
                return $salary;
            });
        }

        return $employee;
    }

    // ─── Salary Sub-Resource ───────────────────────────────────────────────────

    public function salaries(string $employeeId)
    {
        $employee = Employee::findOrFail($employeeId);
        $salaries = Salary::where('employeeId', $employeeId)
            ->with('project:id,name,code')
            ->orderBy('month', 'desc')
            ->get();
        return $this->apiSuccess(['salaries' => $salaries, 'employee' => $employee],
            'Salaries retrieved successfully', self::PATH . '/salaries');
    }

    public function processSalary(Request $request, string $employeeId)
    {
        $employee = Employee::findOrFail($employeeId);

        $data = $request->validate([
            'month' => 'required|string|regex:/^\d{4}-\d{2}$/',
            'projectId' => 'nullable|uuid|exists:projects,id',
            'basicSalary' => 'required|numeric|min:0',
            'bonus' => 'nullable|numeric|min:0',
            'deduction' => 'nullable|numeric|min:0',
            'paidAmount' => 'nullable|numeric|min:0',
            'paymentMethod' => 'required|string|in:CASH,BANK,CHEQUE,MOBILE_BANKING',
            'referenceNumber' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        // Check unique employeeId + month
        $existing = Salary::where('employeeId', $employeeId)->where('month', $data['month'])->first();
        if ($existing) {
            return $this->apiConflict('Salary for this month already exists', self::PATH . '/salaries');
        }

        $basicSalary = (float) $data['basicSalary'];
        $bonus = (float) ($data['bonus'] ?? 0);
        $deduction = (float) ($data['deduction'] ?? 0);
        $paidAmount = (float) ($data['paidAmount'] ?? 0);
        $netSalary = $basicSalary + $bonus - $deduction;
        $dueAmount = max($netSalary - $paidAmount, 0);

        $paymentStatus = 'DUE';
        if ($paidAmount > 0) {
            $paymentStatus = $paidAmount >= $netSalary ? 'PAID' : 'PARTIAL';
        }

        if ($paidAmount > 0) {
            $projectId = $data['projectId'] ?? null;
            $available = $this->availableBalance($projectId, 'EMPLOYEE_SALARY');
            if ($paidAmount > $available) {
                return $this->apiBadRequest(
                    $this->insufficientBalanceMessage($available, $projectId, 'EMPLOYEE_SALARY'),
                    self::PATH . '/salaries'
                );
            }
        }

        [$salary, $cashOut] = DB::transaction(function () use (
            $employee, $employeeId, $data, $basicSalary, $bonus, $deduction,
            $netSalary, $paidAmount, $dueAmount, $paymentStatus
        ) {
            $salary = Salary::create([
                'employeeId' => $employeeId,
                'projectId' => $data['projectId'] ?? null,
                'month' => $data['month'],
                'basicSalary' => $basicSalary,
                'bonus' => $bonus,
                'deduction' => $deduction,
                'netSalary' => $netSalary,
                'paidAmount' => $paidAmount,
                'dueAmount' => $dueAmount,
                'paymentStatus' => $paymentStatus,
            ]);

            $cashOut = CashOut::create([
                'date' => now(),
                'projectId' => $data['projectId'] ?? null,
                'expenseCategory' => 'EMPLOYEE_SALARY',
                'paidTo' => $employee->fullName,
                'amount' => $paidAmount,
                'paymentMethod' => $data['paymentMethod'],
                'referenceNumber' => $data['referenceNumber'] ?? null,
                'notes' => "Salary for {$data['month']}. Basic: {$basicSalary}, Bonus: {$bonus}, Deduction: {$deduction}, Net: {$netSalary}. " . ($data['notes'] ?? ''),
                'employeeId' => $employeeId,
                'salaryId' => $salary->id,
            ]);

            return [$salary, $cashOut];
        });

        return $this->apiCreated(['salary' => $salary->load('project:id,name,code'), 'cashOut' => $cashOut],
            'Salary processed successfully', self::PATH . '/salaries');
    }

    public function page()
    {
        return Inertia::render('Dashboard/Employees/Index');
    }
}
