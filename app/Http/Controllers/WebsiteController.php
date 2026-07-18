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

        // Default copy for every known section key. Keyed by sectionKey so
        // missing keys can be backfilled individually (not just on a totally
        // empty table) — lets new page-content keys seed on already-deployed
        // databases that already have HERO/ABOUT_FIRM.
        $sectionDefaults = [
            'HERO' => [
                'title' => 'Build', 'highlight' => 'Dreams.',
                'subtitle' => 'Architecture · Design · Planning · Dhaka',
                'description' => 'Metaphoric Architect delivers architecture, design, planning, and construction across Bangladesh.',
                'imageUrl' => 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=2800&q=80',
            ],
            'ABOUT_FIRM' => [
                'title' => 'Spaces that speak', 'highlight' => 'purpose.',
                'subtitle' => '01. The Firm',
                'description' => 'Metaphoric Architect specializes in architecture, interior design, urban planning, construction management.',
                'imageUrl' => 'https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=1200&q=80',
            ],
            'CONTACT_HERO' => [
                'title' => "Let's talk", 'highlight' => 'design',
                'description' => 'Reach out to discuss your residential, commercial, or urban project in {city} and across Bangladesh.',
            ],
            'FOOTER_CTA' => [
                'title' => "Let's build your", 'highlight' => 'vision.',
                'description' => 'Reach out to discuss your residential, commercial, or urban project in {city} and across Bangladesh.',
            ],
            'SERVICES_HERO' => [
                'title' => 'Our', 'highlight' => 'Expertise',
                'description' => 'From initial planning and architectural conceptualization to interior detailing and construction management, we craft spaces that blend timeless form with purposeful function.',
            ],
            'SERVICES_APPROACH' => [
                'title' => 'Our Approach',
                'extraData' => ['items' => [
                    ['title' => 'Rigorous Detailing', 'description' => 'Every line drawn serves a functional and aesthetic purpose, detailed to absolute perfection.'],
                    ['title' => 'Local Expertise', 'description' => 'Deep understanding of Dhaka\'s urban requirements, building codes, and material suppliers.'],
                    ['title' => 'Sustainable Vision', 'description' => 'Crafting spaces that optimize light, ventilation, and minimize environmental impact.'],
                    ['title' => 'End-to-End Delivery', 'description' => 'Bridging the gap between creative design blueprint and practical field execution.'],
                ]],
            ],
            'SERVICES_SHOW_CTA' => [
                'title' => 'Start Your Project',
                'description' => "Let's sit down and discuss how we can transform your space. Get a tailored consult for this service.",
            ],
            'PORTFOLIO_HERO' => [
                'title' => 'Our', 'highlight' => 'Portfolio',
                'description' => 'Explore our curation of premium residential, commercial, and structural designs crafted across Dhaka and greater Bangladesh.',
            ],
            'PORTFOLIO_SHOW_CTA' => [
                'title' => 'Request Similar Concept',
                'description' => 'Inspired by this design? Begin a dialogue with us to discuss architectural planning for your specific space.',
            ],
            'TEAM_HERO' => [
                'title' => 'Our', 'highlight' => 'Team',
                'description' => 'Meet the architects, designers, urban planners, and project managers driving creative excellence and solid execution.',
            ],
            'TEAM_SHOW_QUOTE' => [
                'description' => 'Architecture is a metaphor for human connection. We do not just build concrete structures; we model spaces that foster community and inspire dreams.',
            ],
        ];

        $missingKeys = array_diff(array_keys($sectionDefaults), $sections->pluck('sectionKey')->all());

        if (!empty($missingKeys)) {
            foreach ($missingKeys as $key) {
                WebsiteSection::create(array_merge(
                    ['sectionKey' => $key, 'isActive' => true],
                    $sectionDefaults[$key]
                ));
            }
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
     * Every CMS resource (Service, Portfolio, Team, TrustBadge, Testimonial,
     * FAQ) shares the exact same index/show/update/destroy shape — only the
     * model class and response wording differ. store() is left per-resource
     * since each has distinct validation rules.
     */
    private function cmsIndex(string $modelClass, string $label, string $path)
    {
        $items = $modelClass::orderBy('order')->get();
        return $this->apiSuccess($items, "{$label} retrieved successfully", $path);
    }

    private function cmsShow(string $modelClass, string $id, string $path)
    {
        $item = $modelClass::findOrFail($id);
        return $this->apiSuccess($item, 'Retrieved successfully', $path);
    }

    private function cmsUpdate(Request $request, string $modelClass, string $id, string $itemKey, string $label, string $path)
    {
        $item = $modelClass::findOrFail($id);
        $item->update($request->all());
        return $this->apiSuccess([$itemKey => $item->fresh()], "{$label} updated", $path);
    }

    private function cmsDestroy(string $modelClass, string $id, string $label, string $path)
    {
        $modelClass::findOrFail($id)->delete();
        return $this->apiSuccess(null, "{$label} deleted", $path);
    }

    // ─── Services ─────────────────────────────────────────────────────────────

    public function getServices()
    {
        return $this->cmsIndex(WebsiteService::class, 'services', '/website/services');
    }

    public function showService(string $id)
    {
        return $this->cmsShow(WebsiteService::class, $id, '/website/services');
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
        return $this->cmsUpdate($request, WebsiteService::class, $id, 'service', 'Service', '/website/services');
    }

    public function destroyService(string $id)
    {
        return $this->cmsDestroy(WebsiteService::class, $id, 'Service', '/website/services');
    }

    // ─── Portfolio ────────────────────────────────────────────────────────────

    public function getPortfolio()
    {
        return $this->cmsIndex(WebsitePortfolio::class, 'portfolio', '/website/portfolio');
    }

    public function showPortfolio(string $id)
    {
        return $this->cmsShow(WebsitePortfolio::class, $id, '/website/portfolio');
    }

    public function storePortfolio(Request $request)
    {
        $data = $request->validate([
            'title' => 'required|string', 'category' => 'required|string', 'location' => 'nullable|string', 'coverImage' => 'required|string',
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
        return $this->cmsUpdate($request, WebsitePortfolio::class, $id, 'portfolio', 'Portfolio', '/website/portfolio');
    }

    public function destroyPortfolio(string $id)
    {
        return $this->cmsDestroy(WebsitePortfolio::class, $id, 'Portfolio', '/website/portfolio');
    }

    // ─── Team ─────────────────────────────────────────────────────────────────

    public function getTeam()
    {
        return $this->cmsIndex(WebsiteTeam::class, 'team', '/website/team');
    }

    public function showTeamMember(string $id)
    {
        return $this->cmsShow(WebsiteTeam::class, $id, '/website/team');
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
        return $this->cmsUpdate($request, WebsiteTeam::class, $id, 'team', 'Team member', '/website/team');
    }

    public function destroyTeam(string $id)
    {
        return $this->cmsDestroy(WebsiteTeam::class, $id, 'Team member', '/website/team');
    }

    // ─── Trust Badges ─────────────────────────────────────────────────────────

    public function getTrustBadges()
    {
        return $this->cmsIndex(WebsiteTrustBadge::class, 'trust', '/website/trust');
    }

    public function showTrustBadge(string $id)
    {
        return $this->cmsShow(WebsiteTrustBadge::class, $id, '/website/trust');
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
        return $this->cmsUpdate($request, WebsiteTrustBadge::class, $id, 'trustBadge', 'Trust badge', '/website/trust');
    }

    public function destroyTrustBadge(string $id)
    {
        return $this->cmsDestroy(WebsiteTrustBadge::class, $id, 'Trust badge', '/website/trust');
    }

    // ─── Testimonials ─────────────────────────────────────────────────────────

    public function getTestimonials()
    {
        return $this->cmsIndex(WebsiteTestimonial::class, 'testimonials', '/website/testimonials');
    }

    public function showTestimonial(string $id)
    {
        return $this->cmsShow(WebsiteTestimonial::class, $id, '/website/testimonials');
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
        return $this->cmsUpdate($request, WebsiteTestimonial::class, $id, 'testimonial', 'Testimonial', '/website/testimonials');
    }

    public function destroyTestimonial(string $id)
    {
        return $this->cmsDestroy(WebsiteTestimonial::class, $id, 'Testimonial', '/website/testimonials');
    }

    // ─── FAQs ─────────────────────────────────────────────────────────────────

    public function getFaqs()
    {
        return $this->cmsIndex(WebsiteFAQ::class, 'faqs', '/website/faqs');
    }

    public function showFaq(string $id)
    {
        return $this->cmsShow(WebsiteFAQ::class, $id, '/website/faqs');
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
        return $this->cmsUpdate($request, WebsiteFAQ::class, $id, 'faq', 'FAQ', '/website/faqs');
    }

    public function destroyFaq(string $id)
    {
        return $this->cmsDestroy(WebsiteFAQ::class, $id, 'FAQ', '/website/faqs');
    }

    public function cmsPage()
    {
        return Inertia::render('Dashboard/Website/Index');
    }
}
