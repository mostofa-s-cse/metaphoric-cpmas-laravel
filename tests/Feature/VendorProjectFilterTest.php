<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\ProjectVendor;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VendorProjectFilterTest extends TestCase
{
    use RefreshDatabase;

    private function makeProject(string $name): Project
    {
        return Project::create([
            'name' => $name,
            'code' => strtoupper(substr(md5($name . microtime()), 0, 8)),
            'clientName' => 'Acme Co',
            'clientContactNumber' => '555-0100',
            'projectLocation' => 'Test City',
            'startDate' => now(),
            'expectedCompletionDate' => now()->addMonths(6),
            'estimatedBudget' => 100000,
            'status' => 'RUNNING',
        ]);
    }

    public function test_project_filter_only_returns_assigned_vendors(): void
    {
        $user = User::create([
            'email' => 'admin@example.com', 'passwordHash' => bcrypt('password'),
            'fullName' => 'Admin', 'role' => 'SUPER_ADMIN',
        ]);
        $this->actingAs($user);

        $projectA = $this->makeProject('Project A');
        $projectB = $this->makeProject('Project B');

        $vendorAssignedToA = Vendor::create(['name' => 'Assigned Vendor', 'contactNumber' => '555-1', 'workType' => 'Electrical']);
        $vendorAssignedToB = Vendor::create(['name' => 'Other Vendor', 'contactNumber' => '555-2', 'workType' => 'Plumbing']);

        ProjectVendor::create([
            'projectId' => $projectA->id, 'vendorId' => $vendorAssignedToA->id,
            'contractAmount' => 1000, 'paidAmount' => 0, 'dueAmount' => 1000,
        ]);
        ProjectVendor::create([
            'projectId' => $projectB->id, 'vendorId' => $vendorAssignedToB->id,
            'contractAmount' => 500, 'paidAmount' => 0, 'dueAmount' => 500,
        ]);

        $response = $this->getJson('/api/vendors?projectId=' . $projectA->id);

        $response->assertOk();
        $names = collect($response->json('data.vendors'))->pluck('name')->all();
        $this->assertContains('Assigned Vendor', $names);
        $this->assertNotContains('Other Vendor', $names);
    }

    public function test_no_project_filter_returns_all_vendors(): void
    {
        $user = User::create([
            'email' => 'admin2@example.com', 'passwordHash' => bcrypt('password'),
            'fullName' => 'Admin', 'role' => 'SUPER_ADMIN',
        ]);
        $this->actingAs($user);

        Vendor::create(['name' => 'Vendor One', 'contactNumber' => '555-1', 'workType' => 'Electrical']);
        Vendor::create(['name' => 'Vendor Two', 'contactNumber' => '555-2', 'workType' => 'Plumbing']);

        $response = $this->getJson('/api/vendors');

        $response->assertOk();
        $this->assertCount(2, $response->json('data.vendors'));
    }
}
