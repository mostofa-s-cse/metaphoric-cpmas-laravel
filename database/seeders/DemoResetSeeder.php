<?php

namespace Database\Seeders;

use App\Models\Attendance;
use App\Models\CashIn;
use App\Models\CashOut;
use App\Models\Document;
use App\Models\Employee;
use App\Models\Labour;
use App\Models\Material;
use App\Models\Project;
use App\Models\ProjectSupplier;
use App\Models\ProjectVendor;
use App\Models\Salary;
use App\Models\Supplier;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Wipes all operational data except the 5 role seed users and the
 * website_* CMS tables, then seeds 2 small demo projects with one
 * cash-in and one cash-out per expense category so the budget vs
 * income vs expense math is easy to eyeball.
 */
class DemoResetSeeder extends Seeder
{
    private const KEEP_EMAILS = [
        'superadmin@cpmas.com',
        'admin@cpmas.com',
        'accountant@cpmas.com',
        'pm@cpmas.com',
        'operator@cpmas.com',
    ];

    public function run(): void
    {
        DB::transaction(function () {
            // FK-safe wipe order (children before parents)
            CashOut::query()->delete();
            CashIn::query()->delete();
            Attendance::query()->delete();
            Document::query()->delete();
            ProjectVendor::query()->delete();
            ProjectSupplier::query()->delete();
            Salary::query()->delete();
            Material::query()->delete();
            Labour::query()->delete();
            Employee::query()->delete();
            Vendor::query()->delete();
            Supplier::query()->delete();
            DB::table('audit_logs')->delete();
            Project::query()->delete();

            User::whereNotIn('email', self::KEEP_EMAILS)->delete();

            $now = now();
            $dIn = (clone $now)->subMonths(5)->startOfMonth()->addDays(3);
            $dVendor = (clone $now)->subMonths(5)->startOfMonth()->addDays(5);
            $dSupplier = (clone $now)->subMonths(4)->startOfMonth()->addDays(8);
            $dMaterial = (clone $now)->subMonths(3)->startOfMonth()->addDays(10);
            $dLabour = (clone $now)->subMonths(2)->startOfMonth()->addDays(12);
            $dSalaryOffice = (clone $now)->subMonth()->startOfMonth()->addDays(14);
            $dEmpSalary = (clone $now)->subMonth()->startOfMonth()->addDays(20);
            $dTransport = (clone $now)->startOfMonth()->addDays(2);

            $project1 = Project::create([
                'name' => 'Demo Project A',
                'code' => 'PRJ-DEMO-A',
                'clientName' => 'Demo Client A',
                'clientContactNumber' => '+1 (555) 000-0001',
                'projectLocation' => 'Demo Site A',
                'startDate' => now(),
                'expectedCompletionDate' => now()->addMonths(6),
                'estimatedBudget' => 1000.0,
                'status' => 'RUNNING',
                'projectType' => 'CONSTRUCTION',
                'description' => 'Demo project for calculation testing.',
            ]);

            $project2 = Project::create([
                'name' => 'Demo Project B',
                'code' => 'PRJ-DEMO-B',
                'clientName' => 'Demo Client B',
                'clientContactNumber' => '+1 (555) 000-0002',
                'projectLocation' => 'Demo Site B',
                'startDate' => now(),
                'expectedCompletionDate' => now()->addMonths(6),
                'estimatedBudget' => 1000.0,
                'status' => 'PLANNING',
                'projectType' => 'CONSTRUCTION',
                'description' => 'Demo project for calculation testing.',
            ]);

            $vendor = Vendor::create([
                'name' => 'Demo Vendor',
                'companyName' => 'Demo Vendor Co',
                'contactNumber' => '+1 (555) 000-0003',
                'address' => 'Demo Address',
                'workType' => 'General Contracting',
                'contractAmount' => 100.0,
                'paidAmount' => 100.0,
                'dueAmount' => 0.0,
                'notes' => 'Demo vendor.',
            ]);

            $supplier = Supplier::create([
                'name' => 'Demo Supplier',
                'companyName' => 'Demo Supplier Co',
                'phoneNumber' => '+1 (555) 000-0004',
                'email' => 'demo.supplier@example.com',
                'address' => 'Demo Address',
                'openingBalance' => 0.0,
                'currentDue' => 0.0,
                'notes' => 'Demo supplier.',
            ]);

            $employee = Employee::create([
                'employeeId' => 'EMP-DEMO-1',
                'fullName' => 'Demo Employee',
                'designation' => 'Site Engineer',
                'department' => 'Engineering',
                'phoneNumber' => '+1 (555) 000-0005',
                'email' => 'demo.employee@example.com',
                'joiningDate' => now(),
                'monthlySalary' => 100.0,
                'employmentStatus' => 'ACTIVE',
            ]);

            $labour = Labour::create([
                'name' => 'Demo Labour',
                'phoneNumber' => '+1 (555) 000-0006',
                'trade' => 'Mason',
                'dailyWage' => 100.0,
                'employmentStatus' => 'ACTIVE',
                'projectId' => $project1->id,
            ]);

            $material = Material::create([
                'name' => 'Demo Cement',
                'category' => 'Cement',
                'quantity' => 10,
                'unit' => 'Bag',
                'unitPrice' => 10.0,
                'totalPrice' => 100.0,
                'supplierId' => $supplier->id,
                'projectId' => $project1->id,
                'purchaseDate' => $dMaterial,
                'invoiceNumber' => 'INV-DEMO-1',
            ]);

            $salary = Salary::create([
                'employeeId' => $employee->id,
                'projectId' => $project1->id,
                'month' => $dEmpSalary->format('Y-m'),
                'basicSalary' => 100.0,
                'bonus' => 0.0,
                'deduction' => 0.0,
                'netSalary' => 100.0,
                'paidAmount' => 100.0,
                'dueAmount' => 0.0,
                'paymentStatus' => 'PAID',
            ]);

            // Income: 1000 in, matching project1's budget
            CashIn::create([
                'date' => $dIn,
                'projectId' => $project1->id,
                'clientName' => 'Demo Client A',
                'amount' => 1000.0,
                'paymentMethod' => 'BANK',
                'bankOrCash' => 'Demo Bank Account',
                'referenceNumber' => 'REF-IN-DEMO-1',
                'source' => 'CLIENT_PAYMENT',
                'notes' => 'Demo client payment.',
            ]);

            // Expense: one row per category, 100 each -> total out 700
            CashOut::create([
                'date' => $dVendor,
                'projectId' => $project1->id,
                'expenseCategory' => 'VENDOR_PAYMENT',
                'paidTo' => $vendor->name,
                'amount' => 100.0,
                'paymentMethod' => 'BANK',
                'referenceNumber' => 'REF-OUT-VENDOR',
                'notes' => 'Demo vendor payment.',
                'vendorId' => $vendor->id,
            ]);

            CashOut::create([
                'date' => $dSupplier,
                'projectId' => $project1->id,
                'expenseCategory' => 'SUPPLIER_PAYMENT',
                'paidTo' => $supplier->name,
                'amount' => 100.0,
                'paymentMethod' => 'BANK',
                'referenceNumber' => 'REF-OUT-SUPPLIER',
                'notes' => 'Demo supplier payment.',
                'supplierId' => $supplier->id,
            ]);

            CashOut::create([
                'date' => $dMaterial,
                'projectId' => $project1->id,
                'expenseCategory' => 'MATERIALS',
                'paidTo' => $supplier->name,
                'amount' => 100.0,
                'paymentMethod' => 'CASH',
                'referenceNumber' => 'REF-OUT-MATERIAL',
                'notes' => 'Demo material purchase.',
                'materialId' => $material->id,
            ]);

            CashOut::create([
                'date' => $dLabour,
                'projectId' => $project1->id,
                'expenseCategory' => 'LABOUR_WAGE',
                'paidTo' => $labour->name,
                'amount' => 100.0,
                'paymentMethod' => 'CASH',
                'referenceNumber' => 'REF-OUT-LABOUR',
                'notes' => 'Demo labour wage.',
                'labourId' => $labour->id,
            ]);

            CashOut::create([
                'date' => $dSalaryOffice,
                'projectId' => $project1->id,
                'expenseCategory' => 'SALARY',
                'paidTo' => 'Demo Office Staff',
                'amount' => 100.0,
                'paymentMethod' => 'BANK',
                'referenceNumber' => 'REF-OUT-SALARY',
                'notes' => 'Demo generic salary payment.',
            ]);

            CashOut::create([
                'date' => $dEmpSalary,
                'projectId' => $project1->id,
                'expenseCategory' => 'EMPLOYEE_SALARY',
                'paidTo' => $employee->fullName,
                'amount' => 100.0,
                'paymentMethod' => 'BANK',
                'referenceNumber' => 'REF-OUT-EMP-SALARY',
                'notes' => 'Demo employee salary payment.',
                'employeeId' => $employee->id,
                'salaryId' => $salary->id,
            ]);

            CashOut::create([
                'date' => $dTransport,
                'projectId' => $project1->id,
                'expenseCategory' => 'TRANSPORTATION',
                'paidTo' => 'Demo Transport Vendor',
                'amount' => 100.0,
                'paymentMethod' => 'CASH',
                'referenceNumber' => 'REF-OUT-TRANSPORT',
                'notes' => 'Demo transportation expense.',
            ]);
        });
    }
}
