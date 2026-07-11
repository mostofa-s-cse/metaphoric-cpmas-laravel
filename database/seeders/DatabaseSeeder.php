<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Project;
use App\Models\Supplier;
use App\Models\Vendor;
use App\Models\Employee;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Create Default Users for each role
        $roles = [
            ['email' => 'superadmin@cpmas.com', 'fullName' => 'Super Admin User', 'role' => 'SUPER_ADMIN'],
            ['email' => 'admin@cpmas.com', 'fullName' => 'Admin User', 'role' => 'ADMIN'],
            ['email' => 'accountant@cpmas.com', 'fullName' => 'Accountant User', 'role' => 'ACCOUNTANT'],
            ['email' => 'pm@cpmas.com', 'fullName' => 'Project Manager User', 'role' => 'PROJECT_MANAGER'],
            ['email' => 'operator@cpmas.com', 'fullName' => 'Data Entry Operator User', 'role' => 'DATA_ENTRY_OPERATOR'],
        ];

        // bcrypt with cost 10
        $passwordHash = Hash::make('Password123!', ['rounds' => 10]);

        foreach ($roles as $u) {
            User::updateOrCreate(
                ['email' => $u['email']],
                [
                    'fullName' => $u['fullName'],
                    'role' => $u['role'],
                    'passwordHash' => $passwordHash,
                ]
            );
        }

        // 2. Create Initial Projects
        $projectData = [
            [
                'name' => 'Skyline Heights Commercial Center',
                'code' => 'PRJ-SKY-001',
                'clientName' => 'Skyline Developers Ltd',
                'clientContactNumber' => '+1 (555) 019-2834',
                'projectLocation' => '742 Evergreen Terrace, Downtown',
                'startDate' => '2026-01-01 00:00:00',
                'expectedCompletionDate' => '2027-06-30 00:00:00',
                'estimatedBudget' => 5000000.0,
                'status' => 'RUNNING',
                'projectType' => 'CONSTRUCTION',
                'description' => 'A 15-story premium commercial building with mixed retail and office spaces.',
            ],
            [
                'name' => 'Greenwood Residential Estate',
                'code' => 'PRJ-GRN-002',
                'clientName' => 'Greenwood Estates Inc',
                'clientContactNumber' => '+1 (555) 014-9988',
                'projectLocation' => '12 River Road, Suburbs',
                'startDate' => '2026-03-15 00:00:00',
                'expectedCompletionDate' => '2027-12-31 00:00:00',
                'estimatedBudget' => 3200000.0,
                'status' => 'PLANNING',
                'projectType' => 'SUPERVISION',
                'description' => 'A gated community containing 45 eco-friendly residential villas.',
            ],
            [
                'name' => 'Metro City Overpass Bridge',
                'code' => 'PRJ-MTR-003',
                'clientName' => 'City Municipal Corp',
                'clientContactNumber' => '+1 (555) 017-7755',
                'projectLocation' => 'Express Highway Intersect 4',
                'startDate' => '2025-05-10 00:00:00',
                'expectedCompletionDate' => '2026-05-10 00:00:00',
                'estimatedBudget' => 12000000.0,
                'status' => 'COMPLETED',
                'projectType' => 'CONSTRUCTION',
                'description' => 'Public infrastructure bridge project spanning 1.2 kilometers.',
            ],
        ];

        foreach ($projectData as $prj) {
            Project::updateOrCreate(['code' => $prj['code']], $prj);
        }

        // 3. Create Sample Suppliers
        $supplierData = [
            [
                'name' => 'Apex Steel & Cement',
                'companyName' => 'Apex Materials Group',
                'phoneNumber' => '+1 (555) 123-4567',
                'email' => 'sales@apexmaterials.com',
                'address' => 'Industrial Zone Block C, Cityville',
                'openingBalance' => 10000.0,
                'currentDue' => 15000.0,
                'notes' => 'Key supplier for structural steel and Portland cement.',
            ],
            [
                'name' => 'National Timber & Hardwood',
                'companyName' => 'National Forest Products',
                'phoneNumber' => '+1 (555) 987-6543',
                'email' => 'info@nationaltimber.com',
                'address' => '44 Logging Way, Forest Town',
                'openingBalance' => 0.0,
                'currentDue' => 5400.0,
                'notes' => 'Supplier for structural wood framing and scaffolding planks.',
            ],
        ];

        foreach ($supplierData as $sup) {
            Supplier::updateOrCreate(['name' => $sup['name']], $sup);
        }

        // 4. Create Sample Vendors
        $vendorData = [
            [
                'name' => 'John Doe Civil works',
                'companyName' => 'Doe Excavations & Concrete LLC',
                'contactNumber' => '+1 (555) 444-1122',
                'address' => '22 Trench Rd, Metroville',
                'workType' => 'Civil & Foundation',
                'contractAmount' => 450000.0,
                'paidAmount' => 300000.0,
                'dueAmount' => 150000.0,
                'notes' => 'Subcontractor handling foundation piling and deep excavating.',
            ],
            [
                'name' => 'BrightSpark Electricals',
                'companyName' => 'BrightSpark Controls Corp',
                'contactNumber' => '+1 (555) 777-8899',
                'address' => '88 Voltage Blvd, Cityville',
                'workType' => 'Electrical & Wiring',
                'contractAmount' => 180000.0,
                'paidAmount' => 80000.0,
                'dueAmount' => 100000.0,
                'notes' => 'Responsible for main electrical risers and distribution panels.',
            ],
        ];

        foreach ($vendorData as $ctr) {
            Vendor::updateOrCreate(['name' => $ctr['name']], $ctr);
        }

        // 5. Create Sample Employees
        $employeeData = [
            [
                'employeeId' => 'EMP-001',
                'fullName' => 'Sarah Jenkins',
                'designation' => 'Senior Project Engineer',
                'department' => 'Engineering',
                'phoneNumber' => '+1 (555) 606-7070',
                'email' => 'sjenkins@cpmas.com',
                'joiningDate' => '2024-03-01 00:00:00',
                'monthlySalary' => 6500.0,
                'employmentStatus' => 'ACTIVE',
            ],
            [
                'employeeId' => 'EMP-002',
                'fullName' => 'Michael Vance',
                'designation' => 'Assistant Quantity Surveyor',
                'department' => 'Finance & Planning',
                'phoneNumber' => '+1 (555) 303-4040',
                'email' => 'mvance@cpmas.com',
                'joiningDate' => '2025-07-15 00:00:00',
                'monthlySalary' => 4200.0,
                'employmentStatus' => 'ACTIVE',
            ],
        ];

        foreach ($employeeData as $emp) {
            Employee::updateOrCreate(['employeeId' => $emp['employeeId']], $emp);
        }

        // 6. Website CMS Seed Data (services, portfolio, team, trust badges, testimonials, FAQs)
        $this->call(WebsiteCmsSeeder::class);
    }
}
