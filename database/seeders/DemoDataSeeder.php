<?php

namespace Database\Seeders;

use App\Models\BankAccount;
use App\Models\Employee;
use App\Models\Labour;
use App\Models\Project;
use App\Models\Supplier;
use App\Models\Vendor;
use Illuminate\Database\Seeder;

class DemoDataSeeder extends Seeder
{
    /**
     * Seed a minimal demo dataset: 2 projects, 1 supplier, 2 vendors,
     * 1 bank account, 2 labours, 2 employees.
     */
    public function run(): void
    {
        $projectOne = Project::create([
            'name'                    => 'Greenview Residential Tower',
            'code'                    => 'PRJ-1001',
            'clientName'              => 'Greenview Properties Ltd.',
            'clientContactNumber'     => '01711000001',
            'projectLocation'         => 'Bashundhara, Dhaka',
            'startDate'               => now(),
            'expectedCompletionDate'  => now()->addMonths(12),
            'estimatedBudget'         => 1000,
            'status'                  => 'RUNNING',
            'projectType'             => 'CONSTRUCTION',
            'description'             => 'Demo project #1',
        ]);

        $projectTwo = Project::create([
            'name'                    => 'Lakeview Commercial Complex',
            'code'                    => 'PRJ-1002',
            'clientName'              => 'Lakeview Holdings',
            'clientContactNumber'     => '01711000002',
            'projectLocation'         => 'Gulshan, Dhaka',
            'startDate'               => now(),
            'expectedCompletionDate'  => now()->addMonths(18),
            'estimatedBudget'         => 2000,
            'status'                  => 'RUNNING',
            'projectType'             => 'CONSTRUCTION',
            'description'             => 'Demo project #2',
        ]);

        Supplier::create([
            'name'           => 'Rahman Building Materials',
            'companyName'    => 'Rahman Trading Co.',
            'phoneNumber'    => '01811000001',
            'email'          => 'supplier@example.com',
            'address'        => 'Tejgaon, Dhaka',
            'openingBalance' => 0,
            'currentDue'     => 0,
            'notes'          => 'Demo supplier',
        ]);

        Vendor::create([
            'name'            => 'Karim Electrical Works',
            'companyName'     => 'Karim Electric Ltd.',
            'contactNumber'   => '01911000001',
            'address'         => 'Mirpur, Dhaka',
            'workType'        => 'Electrical',
            'contractAmount'  => 0,
            'paidAmount'      => 0,
            'dueAmount'       => 0,
            'notes'           => 'Demo vendor #1',
        ]);

        Vendor::create([
            'name'            => 'Hossain Plumbing Services',
            'companyName'     => 'Hossain Plumbing Ltd.',
            'contactNumber'   => '01911000002',
            'address'         => 'Uttara, Dhaka',
            'workType'        => 'Plumbing',
            'contractAmount'  => 0,
            'paidAmount'      => 0,
            'dueAmount'       => 0,
            'notes'           => 'Demo vendor #2',
        ]);

        BankAccount::create([
            'name'            => 'Main Bank Account',
            'accountType'     => 'BANK',
            'accountNumber'   => '1234567890',
            'bankName'        => 'Dutch-Bangla Bank',
            'openingBalance'  => 2000,
            'currentBalance'  => 2000,
            'totalIn'         => 0,
            'totalOut'        => 0,
            'notes'           => 'Demo bank account',
            'isActive'        => true,
        ]);

        Labour::create([
            'name'              => 'Abdul Karim',
            'phoneNumber'       => '01611000001',
            'trade'             => 'Mason',
            'dailyWage'         => 800,
            'employmentStatus'  => 'ACTIVE',
            'projectId'         => $projectOne->id,
        ]);

        Labour::create([
            'name'              => 'Jamal Uddin',
            'phoneNumber'       => '01611000002',
            'trade'             => 'Electrician',
            'dailyWage'         => 900,
            'employmentStatus'  => 'ACTIVE',
            'projectId'         => $projectTwo->id,
        ]);

        Employee::create([
            'employeeId'        => 'EMP-1001',
            'fullName'          => 'Nusrat Jahan',
            'designation'       => 'Site Engineer',
            'department'        => 'Engineering',
            'phoneNumber'       => '01511000001',
            'email'             => 'employee1@example.com',
            'joiningDate'       => now(),
            'monthlySalary'     => 35000,
            'employmentStatus'  => 'ACTIVE',
        ]);

        Employee::create([
            'employeeId'        => 'EMP-1002',
            'fullName'          => 'Tanvir Ahmed',
            'designation'       => 'Accountant',
            'department'        => 'Finance',
            'phoneNumber'       => '01511000002',
            'email'             => 'employee2@example.com',
            'joiningDate'       => now(),
            'monthlySalary'     => 40000,
            'employmentStatus'  => 'ACTIVE',
        ]);
    }
}
