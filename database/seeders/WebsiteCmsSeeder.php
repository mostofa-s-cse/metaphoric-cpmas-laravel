<?php

namespace Database\Seeders;

use App\Models\WebsiteService;
use App\Models\WebsitePortfolio;
use App\Models\WebsiteTeam;
use App\Models\WebsiteTrustBadge;
use App\Models\WebsiteTestimonial;
use App\Models\WebsiteFAQ;
use App\Models\WebsiteSettings;
use Illuminate\Database\Seeder;

class WebsiteCmsSeeder extends Seeder
{
    /**
     * Seed the website CMS content (Services, Portfolio, Team, Trust Badges,
     * Testimonials, FAQs) ported from prisma/seed.ts.
     *
     * Note: WebsiteSection (HERO, ABOUT_FIRM) is intentionally NOT seeded here
     * — WebsiteController::publicData() already seeds it on-the-fly the first
     * time the public site loads.
     */
    public function run(): void
    {
        // Brand Info (logo/favicon default to empty — set via Website Management
        // → Branding Assets in the dashboard). firstOrCreate so re-running the
        // seeder never clobbers an admin's already-uploaded logo.
        WebsiteSettings::firstOrCreate(
            ['key' => 'BRAND_INFO'],
            ['value' => [
                'name' => 'Metaphoric', 'nameAlt' => 'Metaphoric Architect',
                'tagline' => 'Architect', 'city' => 'Dhaka, Bangladesh',
                'logoUrl' => '', 'faviconUrl' => '',
                'facebook' => 'https://www.facebook.com/metaphoricarchitect',
                'instagram' => 'https://www.instagram.com/', 'email' => 'info@metaphoricarchitect.com',
                'phone' => '+880 1XXX-XXXXXX', 'address' => 'Dhaka, Bangladesh',
                'followers' => '15.8K', 'years' => '10+', 'projects' => '200+', 'satisfaction' => '98%',
                'studioDesc' => 'Metaphoric Architect is a Dhaka-based multidisciplinary firm specializing in architecture, interior design, urban planning, construction management, and consulting. We craft spaces that blend timeless form with purposeful function.',
            ]]
        );

        // Services
        $serviceData = [
            ['title' => 'Architectural Design', 'description' => 'Innovative and sustainable architectural solutions for commercial and residential spaces.', 'imageUrl' => 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80', 'order' => 1],
            ['title' => 'Interior Design', 'description' => 'Crafting interior spaces that balance aesthetics, functionality, and comfort.', 'imageUrl' => 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=800&q=80', 'order' => 2],
            ['title' => 'Urban Planning', 'description' => 'Developing comprehensive master plans that shape the future of urban communities.', 'imageUrl' => 'https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=800&q=80', 'order' => 3],
            ['title' => 'Construction Management', 'description' => 'End-to-end project oversight ensuring quality, safety, and timely delivery.', 'imageUrl' => 'https://images.unsplash.com/photo-1541888086425-d81bb19240f5?auto=format&fit=crop&w=800&q=80', 'order' => 4],
        ];

        foreach ($serviceData as $svc) {
            WebsiteService::updateOrCreate(['title' => $svc['title']], $svc);
        }

        // Portfolio
        $portfolioData = [
            ['title' => 'The Vertex Tower', 'category' => 'Commercial', 'coverImage' => 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80', 'theChallenge' => 'A state-of-the-art 40-story commercial tower featuring sustainable green spaces.', 'order' => 1],
            ['title' => 'Lumina Residences', 'category' => 'Residential', 'coverImage' => 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=800&q=80', 'theChallenge' => 'Luxury apartments with panoramic city views and modern minimalist interiors.', 'order' => 2],
            ['title' => 'Eco Pavilion', 'category' => 'Public Space', 'coverImage' => 'https://images.unsplash.com/photo-1449844908441-8829872d2607?auto=format&fit=crop&w=800&q=80', 'theChallenge' => 'An eco-friendly public gathering space built entirely with recycled materials.', 'order' => 3],
        ];

        foreach ($portfolioData as $item) {
            WebsitePortfolio::updateOrCreate(['title' => $item['title']], $item);
        }

        // Team
        $teamData = [
            ['name' => 'Ar. Rafiqul Islam', 'role' => 'Principal Architect', 'bio' => 'Over 20 years of experience in shaping the modern skyline of Dhaka.', 'imageUrl' => 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80', 'order' => 1],
            ['name' => 'Nadia Hossain', 'role' => 'Lead Interior Designer', 'bio' => 'Specializes in creating immersive and functional interior experiences.', 'imageUrl' => 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80', 'order' => 2],
            ['name' => 'Kamal Ahmed', 'role' => 'Chief Structural Engineer', 'bio' => 'Ensuring every visionary design stands strong and safe.', 'imageUrl' => 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=400&q=80', 'order' => 3],
        ];

        foreach ($teamData as $member) {
            WebsiteTeam::updateOrCreate(['name' => $member['name']], $member);
        }

        // Trust Badges
        $trustBadgeData = [
            ['name' => 'ISO 9001 Certified', 'type' => 'CERTIFICATION', 'imageUrl' => 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/ISO_9001-2015.svg/120px-ISO_9001-2015.svg.png', 'order' => 1],
            ['name' => 'LEED Platinum', 'type' => 'CERTIFICATION', 'imageUrl' => 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Leed-Platinum.svg/120px-Leed-Platinum.svg.png', 'order' => 2],
            ['name' => 'IAB Member', 'type' => 'PARTNER_LOGO', 'imageUrl' => 'https://upload.wikimedia.org/wikipedia/en/thumb/e/ef/Institute_of_Architects_Bangladesh_logo.png/120px-Institute_of_Architects_Bangladesh_logo.png', 'order' => 3],
        ];

        foreach ($trustBadgeData as $badge) {
            WebsiteTrustBadge::updateOrCreate(['name' => $badge['name']], $badge);
        }

        // Testimonials
        $testimonialData = [
            ['clientName' => 'Mohammed Rahman', 'clientRole' => 'CEO, Vertex Group', 'reviewText' => 'Metaphoric completely transformed our vision into reality. Their attention to detail is unmatched.', 'order' => 1],
            ['clientName' => 'Sarah Jenkins', 'clientRole' => 'Director, Lumina Estates', 'reviewText' => 'Professional, creative, and delivered on time. The best architectural firm we have worked with.', 'order' => 2],
        ];

        foreach ($testimonialData as $testimonial) {
            WebsiteTestimonial::updateOrCreate(
                ['clientName' => $testimonial['clientName'], 'clientRole' => $testimonial['clientRole']],
                $testimonial
            );
        }

        // FAQs
        $faqData = [
            ['question' => 'Do you handle both design and construction?', 'answer' => 'Yes, we provide end-to-end services from initial conceptualization to final construction management.', 'order' => 1],
            ['question' => 'What is your typical project timeline?', 'answer' => 'Timelines vary greatly by project size, but a standard commercial building takes 18-24 months from design to handover.', 'order' => 2],
            ['question' => 'Do you offer sustainable/green architecture?', 'answer' => 'Absolutely. We specialize in LEED-certified designs and eco-friendly material sourcing.', 'order' => 3],
        ];

        foreach ($faqData as $faq) {
            WebsiteFAQ::updateOrCreate(['question' => $faq['question']], $faq);
        }
    }
}
