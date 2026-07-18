<?php

namespace Tests\Feature;

use App\Models\CashIn;
use App\Models\CashOut;
use App\Models\CompanyBalance;
use App\Models\Project;
use App\Models\ProjectBalance;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class BalanceSnapshotScaleTest extends TestCase
{
    use RefreshDatabase;

    private function makeProject(string $name = 'Scale Project'): Project
    {
        return Project::create([
            'name' => $name,
            'code' => strtoupper(substr(md5($name . microtime()), 0, 8)),
            'clientName' => 'Acme Co',
            'clientContactNumber' => '555-0100',
            'projectLocation' => 'Test City',
            'startDate' => now(),
            'expectedCompletionDate' => now()->addMonths(6),
            'estimatedBudget' => 1000000,
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

    public function test_available_balance_reads_stay_fast_with_many_cash_out_rows(): void
    {
        $this->actingAsAdmin();
        $project = $this->makeProject();

        CashIn::create([
            'date' => now(), 'projectId' => $project->id, 'clientName' => 'Client A',
            'amount' => 1_000_000, 'paymentMethod' => 'CASH', 'bankOrCash' => 'Cash Box', 'source' => 'CLIENT_PAYMENT',
        ]);

        // 1000 pre-existing project-wise CashOut rows against the same project.
        for ($i = 0; $i < 1000; $i++) {
            CashOut::create([
                'date' => now(), 'projectId' => $project->id, 'expenseCategory' => 'MATERIALS',
                'paidTo' => 'Supplier ' . $i, 'amount' => 10, 'paymentMethod' => 'CASH',
            ]);
        }

        // project_balances now reflects 1000 rows worth of spend (10,000 total)
        // without ever summing them at read time — a fresh request just reads
        // the maintained snapshot row, so response time shouldn't grow with
        // how much history exists.
        $start = microtime(true);
        $response = $this->getJson('/api/transactions/available-balance?projectId=' . $project->id . '&category=MATERIALS');
        $elapsedMs = (microtime(true) - $start) * 1000;

        $response->assertStatus(200);
        $this->assertEquals(990000.0, $response->json('data.available'));
        $this->assertLessThan(500, $elapsedMs, 'availableBalance() took too long — likely fell back to a full-table scan.');
    }

    public function test_reconcile_command_detects_and_fixes_drift(): void
    {
        $project = $this->makeProject();

        CashIn::create([
            'date' => now(), 'projectId' => $project->id, 'clientName' => 'Client A',
            'amount' => 5000, 'paymentMethod' => 'CASH', 'bankOrCash' => 'Cash Box', 'source' => 'CLIENT_PAYMENT',
        ]);
        CashOut::create([
            'date' => now(), 'projectId' => $project->id, 'expenseCategory' => 'MATERIALS',
            'paidTo' => 'Supplier', 'amount' => 1200, 'paymentMethod' => 'CASH',
        ]);

        // Corrupt the maintained snapshot directly, bypassing the model
        // events, to simulate a missed write path.
        DB::table('project_balances')->where('projectId', $project->id)->update([
            'totalPaidIn' => 999,
            'totalProjectWiseSpent' => 111,
        ]);
        DB::table('company_balance')->where('id', 1)->update([
            'totalPaidInAllProjects' => 999,
        ]);

        $this->artisan('balances:reconcile')->assertExitCode(0);

        $projectBalance = ProjectBalance::find($project->id);
        $this->assertEquals(5000.0, (float) $projectBalance->totalPaidIn);
        $this->assertEquals(1200.0, (float) $projectBalance->totalProjectWiseSpent);

        $company = CompanyBalance::current();
        $this->assertEquals(5000.0, (float) $company->totalPaidInAllProjects);
    }
}
