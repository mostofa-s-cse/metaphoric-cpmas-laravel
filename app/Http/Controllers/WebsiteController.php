<?php

namespace App\Http\Controllers;

use App\Models\WebsiteSettings;
use App\Models\WebsiteSection;
use App\Models\WebsiteService;
use App\Models\WebsitePortfolio;
use App\Models\WebsiteTeam;
use App\Models\WebsiteTrustBadge;
use App\Models\WebsiteTestimonial;
use App\Models\WebsiteFAQ;
use App\Models\ContactInquiry;
use App\Traits\ApiResponse;
use Illuminate\Http\Request;
use Illuminate\Mail\Message;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;

class WebsiteController extends Controller
{
    use ApiResponse;

    const PATH = '/website/public';

    /**
     * Public endpoint — returns all CMS data for the landing page.
     * Mirrors: src/app/api/website/public/route.ts
     */
    public function publicData()
    {
        [$settings, $sections, $services, $portfolio, $team, $trustBadges, $testimonials, $faqs] = [
            WebsiteSettings::all(),
            WebsiteSection::where('isActive', true)->get(),
            WebsiteService::where('isActive', true)->orderBy('order')->get(),
            WebsitePortfolio::where('isActive', true)->orderBy('order')->get(),
            WebsiteTeam::where('isActive', true)->orderBy('order')->get(),
            WebsiteTrustBadge::where('isActive', true)->orderBy('order')->get(),
            WebsiteTestimonial::where('isActive', true)->orderBy('order')->get(),
            WebsiteFAQ::where('isActive', true)->orderBy('order')->get(),
        ];

        // Seed defaults on-the-fly if empty
        if ($settings->isEmpty()) {
            $defaultBrand = [
                'name' => 'Metaphoric', 'nameAlt' => 'Metaphoric Architect',
                'tagline' => 'Architect', 'city' => 'Dhaka, Bangladesh',
                'logoUrl' => '', 'faviconUrl' => '',
                'facebook' => 'https://www.facebook.com/metaphoricarchitect',
                'instagram' => 'https://www.instagram.com/', 'email' => 'info@metaphoricarchitect.com',
                'phone' => '+880 1XXX-XXXXXX', 'address' => 'Dhaka, Bangladesh',
                'followers' => '15.8K', 'years' => '10+', 'projects' => '200+', 'satisfaction' => '98%',
                'studioDesc' => 'Metaphoric Architect is a Dhaka-based multidisciplinary firm.',
            ];
            WebsiteSettings::create(['key' => 'BRAND_INFO', 'value' => $defaultBrand]);
            $settings = WebsiteSettings::all();
        }

        if ($sections->isEmpty()) {
            WebsiteSection::insert([
                [
                    'id' => \Illuminate\Support\Str::uuid(),
                    'sectionKey' => 'HERO', 'title' => 'Build', 'highlight' => 'Dreams.',
                    'subtitle' => 'Architecture · Design · Planning · Dhaka',
                    'description' => 'Metaphoric Architect delivers architecture, design, planning, and construction across Bangladesh.',
                    'imageUrl' => 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2800&q=80',
                    'isActive' => 1, 'created_at' => now(), 'updated_at' => now(),
                ],
                [
                    'id' => \Illuminate\Support\Str::uuid(),
                    'sectionKey' => 'ABOUT_FIRM', 'title' => 'Spaces that speak', 'highlight' => 'purpose.',
                    'subtitle' => '01. The Firm',
                    'description' => 'Metaphoric Architect specializes in architecture, interior design, urban planning, construction management.',
                    'imageUrl' => 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80',
                    'isActive' => 1, 'created_at' => now(), 'updated_at' => now(),
                ],
            ]);
            $sections = WebsiteSection::where('isActive', true)->get();
        }

        // Transform settings to key-value map
        $settingsMap = $settings->keyBy('key')->map(fn($s) => $s->value);

        return $this->apiSuccess([
            'settings' => $settingsMap,
            'sections' => $sections,
            'services' => $services,
            'portfolio' => $portfolio,
            'team' => $team,
            'trustBadges' => $trustBadges,
            'testimonials' => $testimonials,
            'faqs' => $faqs,
        ], 'Public website data retrieved successfully', self::PATH);
    }

    /**
     * Store contact inquiry.
     */
    public function storeContact(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string',
            'email' => 'required|email',
            'scope' => 'required|string',
            'details' => 'nullable|string',
        ]);

        $inquiry = ContactInquiry::create($data);

        $this->sendContactNotificationEmail($data);

        return $this->apiCreated(['inquiry' => $inquiry], 'Inquiry submitted successfully', '/contact');
    }

    /**
     * Send a notification email for a new contact inquiry using the dynamic
     * SMTP_SETTINGS row in website_settings (falls back to nothing — Laravel's
     * own MAIL_* env vars already back the "smtp" mailer's defaults, so no
     * separate SMTP_USER/SMTP_PASS env plumbing is added here).
     * Mirrors: src/app/api/contact/route.ts (nodemailer transport section).
     * A mail failure must never break the contact form submission.
     */
    private function sendContactNotificationEmail(array $data): void
    {
        try {
            $smtpSetting = WebsiteSettings::where('key', 'SMTP_SETTINGS')->first();
            $smtp = $smtpSetting?->value;

            if (!$smtp || empty($smtp['user']) || empty($smtp['pass']) || empty($smtp['host'])) {
                return;
            }

            // Override the "smtp" mailer's runtime config with the DB-backed
            // credentials just before sending (Laravel has no per-send
            // nodemailer-style transport object, so we mutate the mailer
            // config and resolve a fresh connection via Mail::mailer('smtp')).
            // Note: this Laravel version's SMTP transport reads `scheme`
            // (not `encryption`) to decide TLS — 'smtps' for implicit TLS on
            // port 465, otherwise 'smtp' (STARTTLS is negotiated automatically).
            $secure = ($smtp['secure'] ?? false) === true || ($smtp['secure'] ?? null) === 'true';
            config([
                'mail.mailers.smtp.host' => $smtp['host'],
                'mail.mailers.smtp.port' => (int) ($smtp['port'] ?? 587),
                'mail.mailers.smtp.username' => $smtp['user'],
                'mail.mailers.smtp.password' => $smtp['pass'],
                'mail.mailers.smtp.scheme' => $secure ? 'smtps' : 'smtp',
            ]);

            $toEmail = $smtp['notificationEmail'] ?? $smtp['user'];
            $fromEmail = $smtp['fromEmail'] ?? $smtp['user'];

            $html = sprintf(
                '<h2>New Contact Inquiry</h2><p><strong>Name:</strong> %s</p><p><strong>Email:</strong> %s</p><p><strong>Project Scope:</strong> %s</p><p><strong>Details:</strong><br/>%s</p>',
                e($data['name']),
                e($data['email']),
                e($data['scope']),
                e($data['details'] ?? 'No details provided.')
            );

            Mail::mailer('smtp')->html($html, function (Message $message) use ($toEmail, $fromEmail, $data) {
                $message->to($toEmail)
                    ->from($fromEmail)
                    ->subject("New Contact Inquiry - {$data['name']}");
            });
        } catch (\Throwable $e) {
            // Log and swallow — matches Next.js behavior of logging the
            // email error but still returning success for the inquiry.
            Log::error('Error sending contact inquiry email: ' . $e->getMessage());
        }
    }

    // ─── CMS Admin CRUD ───────────────────────────────────────────────────────

    public function getSettings(Request $request)
    {
        $user = $request->user();
        $settings = WebsiteSettings::all();

        $settingsObject = $settings->reduce(function ($acc, $curr) use ($user) {
            if ($curr->key === 'SMTP_SETTINGS' && !in_array($user->role, ['SUPER_ADMIN', 'ADMIN'])) {
                return $acc;
            }
            $acc[$curr->key] = $curr->value;
            return $acc;
        }, []);

        return $this->apiSuccess($settingsObject, 'Settings retrieved successfully', '/website/settings');
    }

    public function updateSettings(Request $request)
    {
        $data = $request->validate(['key' => 'required|string', 'value' => 'required|array']);

        $setting = WebsiteSettings::updateOrCreate(
            ['key' => $data['key']],
            ['value' => $data['value']]
        );

        return $this->apiSuccess(['setting' => $setting], 'Settings updated successfully', '/website/settings');
    }

    public function updateSection(Request $request, string $id)
    {
        $section = WebsiteSection::findOrFail($id);
        $section->update($request->all());
        return $this->apiSuccess(['section' => $section->fresh()], 'Section updated successfully', '/website/sections');
    }

    /**
     * Create-or-update a section keyed on sectionKey (no id needed in the URL).
     * Mirrors: src/app/api/website/sections/route.ts POST handler.
     */
    public function upsertSection(Request $request)
    {
        $request->validate([
            'sectionKey' => 'required|string',
            'title' => 'nullable|string',
            'subtitle' => 'nullable|string',
            'highlight' => 'nullable|string',
            'description' => 'nullable|string',
            'imageUrl' => 'nullable|string',
            'videoUrl' => 'nullable|string',
            'extraData' => 'nullable|array',
            'isActive' => 'nullable|boolean',
        ]);

        $sectionKey = $request->input('sectionKey');

        // Only touch fields actually present in the payload, so an update
        // doesn't null out fields the caller didn't send (matches Prisma's
        // upsert `update` semantics, where omitted/undefined keys are left
        // untouched rather than written as null).
        $values = $request->only([
            'title', 'subtitle', 'highlight', 'description', 'imageUrl', 'videoUrl', 'extraData', 'isActive',
        ]);

        if (!array_key_exists('isActive', $values) && !WebsiteSection::where('sectionKey', $sectionKey)->exists()) {
            $values['isActive'] = true;
        }

        $section = WebsiteSection::updateOrCreate(['sectionKey' => $sectionKey], $values);

        return $this->apiSuccess(['section' => $section], 'Section updated successfully', '/website/sections');
    }

    /**
     * Unfiltered admin list of ALL sections, keyed by sectionKey.
     * Mirrors: src/app/api/website/sections/route.ts GET handler.
     */
    public function getSections()
    {
        $sections = WebsiteSection::all();
        $sectionsObject = $sections->reduce(function ($acc, $curr) {
            $acc[$curr->sectionKey] = $curr;
            return $acc;
        }, []);

        return $this->apiSuccess($sectionsObject, 'Sections retrieved successfully', '/website/sections');
    }

    /**
     * Unfiltered admin list of ALL services.
     * Mirrors: src/app/api/website/services/route.ts GET handler.
     */
    public function getServices()
    {
        $services = WebsiteService::orderBy('order')->get();
        return $this->apiSuccess($services, 'services retrieved successfully', '/website/services');
    }

    /**
     * Unfiltered admin list of ALL portfolio items.
     * Mirrors: src/app/api/website/portfolio/route.ts GET handler.
     */
    public function getPortfolio()
    {
        $portfolio = WebsitePortfolio::orderBy('order')->get();
        return $this->apiSuccess($portfolio, 'portfolio retrieved successfully', '/website/portfolio');
    }

    /**
     * Single-item GET for a service.
     * Mirrors: src/app/api/website/services/[id]/route.ts GET handler.
     */
    public function showService(string $id)
    {
        $service = WebsiteService::findOrFail($id);
        return $this->apiSuccess($service, 'Retrieved successfully', '/website/services');
    }

    public function storeService(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string',
            'description' => 'required|string',
            'imageUrl' => 'required|string',
            'order' => 'nullable|integer',
        ]);
        $service = WebsiteService::create($data);
        return $this->apiCreated(['service' => $service], 'Service created', '/website/services');
    }

    public function updateService(Request $request, string $id)
    {
        $service = WebsiteService::findOrFail($id);
        $service->update($request->all());
        return $this->apiSuccess(['service' => $service->fresh()], 'Service updated', '/website/services');
    }

    public function destroyService(string $id)
    {
        WebsiteService::findOrFail($id)->delete();
        return $this->apiSuccess(null, 'Service deleted', '/website/services');
    }

    /**
     * Single-item GET for a portfolio item.
     * Mirrors: src/app/api/website/portfolio/[id]/route.ts GET handler.
     */
    public function showPortfolio(string $id)
    {
        $portfolio = WebsitePortfolio::findOrFail($id);
        return $this->apiSuccess($portfolio, 'Retrieved successfully', '/website/portfolio');
    }

    public function storePortfolio(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string', 'category' => 'required|string', 'coverImage' => 'required|string',
            'beforeImage' => 'nullable|string', 'afterImage' => 'nullable|string',
            'images' => 'nullable|array', 'images.*' => 'string',
            'theChallenge' => 'nullable|string', 'theSolution' => 'nullable|string', 'theOutcome' => 'nullable|string',
            'projectMetrics' => 'nullable|array', 'order' => 'nullable|integer',
        ]);
        $portfolio = WebsitePortfolio::create($data);
        return $this->apiCreated(['portfolio' => $portfolio], 'Portfolio created', '/website/portfolio');
    }

    public function updatePortfolio(Request $request, string $id)
    {
        $portfolio = WebsitePortfolio::findOrFail($id);
        $portfolio->update($request->all());
        return $this->apiSuccess(['portfolio' => $portfolio->fresh()], 'Portfolio updated', '/website/portfolio');
    }

    public function destroyPortfolio(string $id)
    {
        WebsitePortfolio::findOrFail($id)->delete();
        return $this->apiSuccess(null, 'Portfolio deleted', '/website/portfolio');
    }

    // ─── Team ─────────────────────────────────────────────────────────────────

    public function getTeam()
    {
        $team = WebsiteTeam::orderBy('order')->get();
        return $this->apiSuccess($team, 'team retrieved successfully', '/website/team');
    }

    /**
     * Single-item GET for a team member.
     * Mirrors: src/app/api/website/team/[id]/route.ts GET handler.
     */
    public function showTeamMember(string $id)
    {
        $member = WebsiteTeam::findOrFail($id);
        return $this->apiSuccess($member, 'Retrieved successfully', '/website/team');
    }

    public function storeTeam(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string',
            'role' => 'required|string',
            'bio' => 'nullable|string',
            'imageUrl' => 'nullable|string',
            'order' => 'nullable|integer',
            'isActive' => 'nullable|boolean',
        ]);
        $member = WebsiteTeam::create($data);
        return $this->apiCreated(['team' => $member], 'Team member created', '/website/team');
    }

    public function updateTeam(Request $request, string $id)
    {
        $member = WebsiteTeam::findOrFail($id);
        $member->update($request->all());
        return $this->apiSuccess(['team' => $member->fresh()], 'Team member updated', '/website/team');
    }

    public function destroyTeam(string $id)
    {
        WebsiteTeam::findOrFail($id)->delete();
        return $this->apiSuccess(null, 'Team member deleted', '/website/team');
    }

    // ─── Trust Badges ─────────────────────────────────────────────────────────

    public function getTrustBadges()
    {
        $badges = WebsiteTrustBadge::orderBy('order')->get();
        return $this->apiSuccess($badges, 'trust retrieved successfully', '/website/trust');
    }

    /**
     * Single-item GET for a trust badge.
     * Mirrors: src/app/api/website/trust/[id]/route.ts GET handler.
     */
    public function showTrustBadge(string $id)
    {
        $badge = WebsiteTrustBadge::findOrFail($id);
        return $this->apiSuccess($badge, 'Retrieved successfully', '/website/trust');
    }

    public function storeTrustBadge(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string',
            'type' => 'required|string',
            'imageUrl' => 'nullable|string',
            'order' => 'nullable|integer',
            'isActive' => 'nullable|boolean',
        ]);
        $badge = WebsiteTrustBadge::create($data);
        return $this->apiCreated(['trustBadge' => $badge], 'Trust badge created', '/website/trust');
    }

    public function updateTrustBadge(Request $request, string $id)
    {
        $badge = WebsiteTrustBadge::findOrFail($id);
        $badge->update($request->all());
        return $this->apiSuccess(['trustBadge' => $badge->fresh()], 'Trust badge updated', '/website/trust');
    }

    public function destroyTrustBadge(string $id)
    {
        WebsiteTrustBadge::findOrFail($id)->delete();
        return $this->apiSuccess(null, 'Trust badge deleted', '/website/trust');
    }

    // ─── Testimonials ─────────────────────────────────────────────────────────

    public function getTestimonials()
    {
        $testimonials = WebsiteTestimonial::orderBy('order')->get();
        return $this->apiSuccess($testimonials, 'testimonials retrieved successfully', '/website/testimonials');
    }

    /**
     * Single-item GET for a testimonial.
     * Mirrors: src/app/api/website/testimonials/[id]/route.ts GET handler.
     */
    public function showTestimonial(string $id)
    {
        $testimonial = WebsiteTestimonial::findOrFail($id);
        return $this->apiSuccess($testimonial, 'Retrieved successfully', '/website/testimonials');
    }

    public function storeTestimonial(Request $request)
    {
        $data = $request->validate([
            'clientName' => 'required|string',
            'clientRole' => 'nullable|string',
            'reviewText' => 'required|string',
            'portfolioId' => 'nullable|string',
            'order' => 'nullable|integer',
            'isActive' => 'nullable|boolean',
        ]);
        $testimonial = WebsiteTestimonial::create($data);
        return $this->apiCreated(['testimonial' => $testimonial], 'Testimonial created', '/website/testimonials');
    }

    public function updateTestimonial(Request $request, string $id)
    {
        $testimonial = WebsiteTestimonial::findOrFail($id);
        $testimonial->update($request->all());
        return $this->apiSuccess(['testimonial' => $testimonial->fresh()], 'Testimonial updated', '/website/testimonials');
    }

    public function destroyTestimonial(string $id)
    {
        WebsiteTestimonial::findOrFail($id)->delete();
        return $this->apiSuccess(null, 'Testimonial deleted', '/website/testimonials');
    }

    // ─── FAQs ─────────────────────────────────────────────────────────────────

    public function getFaqs()
    {
        $faqs = WebsiteFAQ::orderBy('order')->get();
        return $this->apiSuccess($faqs, 'faqs retrieved successfully', '/website/faqs');
    }

    /**
     * Single-item GET for a FAQ.
     * Mirrors: src/app/api/website/faqs/[id]/route.ts GET handler.
     */
    public function showFaq(string $id)
    {
        $faq = WebsiteFAQ::findOrFail($id);
        return $this->apiSuccess($faq, 'Retrieved successfully', '/website/faqs');
    }

    public function storeFaq(Request $request)
    {
        $data = $request->validate([
            'question' => 'required|string',
            'answer' => 'required|string',
            'order' => 'nullable|integer',
            'isActive' => 'nullable|boolean',
        ]);
        $faq = WebsiteFAQ::create($data);
        return $this->apiCreated(['faq' => $faq], 'FAQ created', '/website/faqs');
    }

    public function updateFaq(Request $request, string $id)
    {
        $faq = WebsiteFAQ::findOrFail($id);
        $faq->update($request->all());
        return $this->apiSuccess(['faq' => $faq->fresh()], 'FAQ updated', '/website/faqs');
    }

    public function destroyFaq(string $id)
    {
        WebsiteFAQ::findOrFail($id)->delete();
        return $this->apiSuccess(null, 'FAQ deleted', '/website/faqs');
    }

    public function cmsPage()
    {
        return Inertia::render('Dashboard/Website/Index');
    }
}
