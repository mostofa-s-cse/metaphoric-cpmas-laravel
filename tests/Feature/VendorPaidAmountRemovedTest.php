<?php

namespace Tests\Feature;

use App\Models\Project;
use App\Models\ProjectVendor;
use App\Models\User;
use App\Models\Vendor;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class VendorPaidAmountRemovedTest extends TestCase
{
    use RefreshDatabase;

    private function makeProject(string $name = 'Test Project'): Project
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

    private function actingAsAdmin(): User
    {
        $user = User::create([
            'email' => 'admin@example.com',
            'passwordHash' => bcrypt('password'),
            'fullName' => 'Admin User',
            'role' => 'SUPER_ADMIN',
        ]);
        $this->actingAs($user);
        return $user;
    }

    public function test_vendor_create_ignores_paid_amount_input(): void
    {
        $this->actingAsAdmin();
        $project = $this->makeProject();

        $response = $this->postJson('/api/vendors', [
            'name' => 'Acme Electrical',
            'contactNumber' => '555-9',
            'workType' => 'Electrical',
            'assignments' => [
                ['projectId' => $project->id, 'contractAmount' => 1000, 'paidAmount' => 999],
            ],
        ]);

        $response->assertStatus(201);
        $response->assertJsonPath('data.vendor.paidAmount', 0);
        $response->assertJsonPath('data.vendor.dueAmount', 1000);

        $pv = ProjectVendor::where('projectId', $project->id)->first();
        $this->assertEquals(0.0, (float) $pv->paidAmount);
        $this->assertEquals(1000.0, (float) $pv->dueAmount);
    }

    public function test_vendor_update_preserves_existing_paid_amount_on_assignment_edit(): void
    {
        $this->actingAsAdmin();
        $project = $this->makeProject();

        $vendor = Vendor::create(['name' => 'Acme Electrical', 'contactNumber' => '555-9', 'workType' => 'Electrical', 'contractAmount' => 1000, 'paidAmount' => 0, 'dueAmount' => 1000]);
        ProjectVendor::create(['projectId' => $project->id, 'vendorId' => $vendor->id, 'contractAmount' => 1000, 'paidAmount' => 400, 'dueAmount' => 600]);

        $response = $this->patchJson("/api/vendors/{$vendor->id}", [
            'assignments' => [
                ['projectId' => $project->id, 'contractAmount' => 1200],
            ],
        ]);

        $response->assertOk();
        $pv = ProjectVendor::where('vendorId', $vendor->id)->where('projectId', $project->id)->first();
        $this->assertEquals(400.0, (float) $pv->paidAmount);
        $this->assertEquals(800.0, (float) $pv->dueAmount);
    }
}
