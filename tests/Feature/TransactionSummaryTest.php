<?php

namespace Tests\Feature;

use App\Models\CashIn;
use App\Models\CashOut;
use App\Models\Project;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransactionSummaryTest extends TestCase
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

    public function test_summary_totals_and_mode_breakdown_without_project_filter(): void
    {
        $this->actingAsAdmin();
        $project = $this->makeProject();

        CashIn::create([
            'date' => now(), 'projectId' => $project->id, 'clientName' => 'Client A',
            'amount' => 1000, 'paymentMethod' => 'CASH', 'bankOrCash' => 'Cash Box', 'source' => 'CLIENT_PAYMENT',
        ]);
        CashIn::create([
            'date' => now(), 'projectId' => $project->id, 'clientName' => 'Client B',
            'amount' => 500, 'paymentMethod' => 'BANK', 'bankOrCash' => 'Main A/C', 'source' => 'CLIENT_PAYMENT',
        ]);
        CashOut::create([
            'date' => now(), 'projectId' => $project->id, 'expenseCategory' => 'MATERIALS',
            'paidTo' => 'Supplier X', 'amount' => 300, 'paymentMethod' => 'CASH',
        ]);

        $response = $this->getJson('/api/transactions/summary');

        $response->assertOk();
        $response->assertJsonPath('data.summary.cashIn.total', 1500);
        $response->assertJsonPath('data.summary.cashIn.byMode.CASH', 1000);
        $response->assertJsonPath('data.summary.cashIn.byMode.BANK', 500);
        $response->assertJsonPath('data.summary.cashOut.total', 300);
        $response->assertJsonPath('data.summary.cashOut.byMode.CASH', 300);
        $response->assertJsonPath('data.summary.net', 1200);
    }

    public function test_summary_filters_by_project_id(): void
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
            'amount' => 9999, 'paymentMethod' => 'CASH', 'bankOrCash' => 'Cash Box', 'source' => 'CLIENT_PAYMENT',
        ]);

        $response = $this->getJson('/api/transactions/summary?projectId=' . $projectA->id);

        $response->assertOk();
        $response->assertJsonPath('data.summary.cashIn.total', 1000);
    }

    public function test_summary_filters_by_general_no_project(): void
    {
        $this->actingAsAdmin();
        $project = $this->makeProject();

        CashIn::create([
            'date' => now(), 'projectId' => null, 'clientName' => 'Corporate Client',
            'amount' => 250, 'paymentMethod' => 'CASH', 'bankOrCash' => 'Cash Box', 'source' => 'OTHER_INCOME',
        ]);
        CashIn::create([
            'date' => now(), 'projectId' => $project->id, 'clientName' => 'Project Client',
            'amount' => 9999, 'paymentMethod' => 'CASH', 'bankOrCash' => 'Cash Box', 'source' => 'CLIENT_PAYMENT',
        ]);

        $response = $this->getJson('/api/transactions/summary?projectId=GENERAL');

        $response->assertOk();
        $response->assertJsonPath('data.summary.cashIn.total', 250);
    }
}
