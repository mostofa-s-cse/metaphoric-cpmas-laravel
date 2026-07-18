<?php

namespace Tests\Feature;

use App\Models\CashIn;
use App\Models\CashOut;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BalanceCalculationTest extends TestCase
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

    public function test_material_purchase_is_capped_by_its_own_projects_paid_amount(): void
    {
        $this->actingAsAdmin();
        $projectA = $this->makeProject('Project A');
        $projectB = $this->makeProject('Project B');

        // Project A has 1000 paid in; Project B has 9000 paid in.
        CashIn::create([
            'date' => now(), 'projectId' => $projectA->id, 'clientName' => 'Client A',
            'amount' => 1000, 'paymentMethod' => 'CASH', 'bankOrCash' => 'Cash Box', 'source' => 'CLIENT_PAYMENT',
        ]);
        CashIn::create([
            'date' => now(), 'projectId' => $projectB->id, 'clientName' => 'Client B',
            'amount' => 9000, 'paymentMethod' => 'CASH', 'bankOrCash' => 'Cash Box', 'source' => 'CLIENT_PAYMENT',
        ]);

        // A materials expense against Project A for 1500 must be rejected even
        // though the combined (global) paid-in across both projects is 10000 —
        // MATERIALS is project-wise and must only see Project A's own 1000.
        $response = $this->postJson('/api/transactions/cash-out', [
            'date' => now()->toDateString(),
            'projectId' => $projectA->id,
            'expenseCategory' => 'MATERIALS',
            'paidTo' => 'Some Supplier',
            'amount' => 1500,
            'paymentMethod' => 'CASH',
        ]);

        $response->assertStatus(400);
        $response->assertJsonPath('message', 'Insufficient project balance. Available: 1,000.00');
    }

    public function test_employee_salary_draws_from_combined_all_projects_paid_amount(): void
    {
        $this->actingAsAdmin();
        $projectA = $this->makeProject('Project A');
        $projectB = $this->makeProject('Project B');

        CashIn::create([
            'date' => now(), 'projectId' => $projectA->id, 'clientName' => 'Client A',
            'amount' => 1000, 'paymentMethod' => 'CASH', 'bankOrCash' => 'Cash Box', 'source' => 'CLIENT_PAYMENT',
        ]);
        CashIn::create([
            'date' => now(), 'projectId' => $projectB->id, 'clientName' => 'Client B',
            'amount' => 9000, 'paymentMethod' => 'CASH', 'bankOrCash' => 'Cash Box', 'source' => 'CLIENT_PAYMENT',
        ]);

        // EMPLOYEE_SALARY is a global category: even tagged to Project A, it
        // must be able to spend against the combined 10000 pool, not just
        // Project A's own 1000.
        $response = $this->postJson('/api/transactions/cash-out', [
            'date' => now()->toDateString(),
            'projectId' => $projectA->id,
            'expenseCategory' => 'EMPLOYEE_SALARY',
            'paidTo' => 'Jane Doe',
            'amount' => 5000,
            'paymentMethod' => 'CASH',
        ]);

        $response->assertStatus(201);
    }

    public function test_global_pool_spend_is_not_scoped_by_project(): void
    {
        $this->actingAsAdmin();
        $project = $this->makeProject();

        CashIn::create([
            'date' => now(), 'projectId' => $project->id, 'clientName' => 'Client A',
            'amount' => 1000, 'paymentMethod' => 'CASH', 'bankOrCash' => 'Cash Box', 'source' => 'CLIENT_PAYMENT',
        ]);

        // An office-rent expense with no project already spent 600 of the
        // global pool.
        CashOut::create([
            'date' => now(), 'projectId' => null, 'expenseCategory' => 'OFFICE_RENT',
            'paidTo' => 'Landlord', 'amount' => 600, 'paymentMethod' => 'CASH',
        ]);

        // A second global-category expense, this time tagged to the project,
        // must still see the 600 already spent (global spend isn't scoped by
        // project) and only have 400 left of the 1000 pool.
        $response = $this->postJson('/api/transactions/cash-out', [
            'date' => now()->toDateString(),
            'projectId' => $project->id,
            'expenseCategory' => 'UTILITIES',
            'paidTo' => 'Power Co',
            'amount' => 500,
            'paymentMethod' => 'CASH',
        ]);

        $response->assertStatus(400);
        $response->assertJsonPath('message', 'Insufficient main balance. Available: 400.00');
    }

    public function test_project_wise_category_with_no_project_still_counts_against_global_pool(): void
    {
        $this->actingAsAdmin();
        $project = $this->makeProject();

        CashIn::create([
            'date' => now(), 'projectId' => $project->id, 'clientName' => 'Client A',
            'amount' => 1000, 'paymentMethod' => 'CASH', 'bankOrCash' => 'Cash Box', 'source' => 'CLIENT_PAYMENT',
        ]);

        // A VENDOR_PAYMENT with no project attached spends 700 of the global pool.
        CashOut::create([
            'date' => now(), 'projectId' => null, 'expenseCategory' => 'VENDOR_PAYMENT',
            'paidTo' => 'Some Vendor', 'amount' => 700, 'paymentMethod' => 'CASH',
        ]);

        // A second one for 400 must be rejected: only 300 of the 1000 pool is left,
        // because the first 700 must still be tracked as spent even though its
        // category (VENDOR_PAYMENT) is normally project-wise.
        $response = $this->postJson('/api/transactions/cash-out', [
            'date' => now()->toDateString(),
            'projectId' => null,
            'expenseCategory' => 'VENDOR_PAYMENT',
            'paidTo' => 'Another Vendor',
            'amount' => 400,
            'paymentMethod' => 'CASH',
        ]);

        $response->assertStatus(400);
        $response->assertJsonPath('message', 'Insufficient main balance. Available: 300.00');
    }
}
