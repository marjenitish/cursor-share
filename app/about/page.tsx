'use client';

import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import { Navigation } from '@/components/shared/navigation';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Input } from '@/components/ui/input';

export default function AboutPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      {/* Hero Section */}
      <section className="relative bg-muted/30 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-bold tracking-tight mb-6">About SHARE</h1>
            <p className="text-xl text-muted-foreground">
              Empowering adults aged 50+ to live active, healthy, and connected lives through exercise and community.
            </p>
          </div>
        </div>
      </section>

      {/* Mission & Values */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid gap-12 md:grid-cols-2">
            <div>
              <h2 className="text-3xl font-bold mb-6">Our Mission</h2>
              <p className="text-lg text-muted-foreground mb-6">
                To provide accessible, engaging, and effective exercise programs that promote physical health, mental wellbeing, and social connection for adults aged 50 and above.
              </p>
              <Button size="lg">
                Join Our Community
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            <div className="relative aspect-video rounded-xl overflow-hidden">
              <img
                src="https://insight.study.csu.edu.au/wp-content/uploads/2018/04/Industry-adapting-Ageing-population.jpg"
                alt="Senior adults exercising together"
                className="object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12 text-center">Our Values</h2>
          <div className="grid gap-8 md:grid-cols-3">
            {[
              {
                title: "Community",
                description: "Building connections and fostering a supportive environment where everyone belongs"
              },
              {
                title: "Accessibility",
                description: "Making exercise accessible to all, regardless of fitness level or experience"
              },
              {
                title: "Quality",
                description: "Delivering professional instruction and evidence-based programs"
              }
            ].map((value, i) => (
              <div key={i} className="rounded-xl border bg-card p-6">
                <h3 className="text-xl font-bold mb-4">{value.title}</h3>
                <p className="text-muted-foreground">{value.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* CTA */}
      <section className="py-12 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-primary-foreground mb-6">
            Ready to Start Your Journey?
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
            Join our community today and discover the benefits of active living with SHARE.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" variant="secondary" onClick={() => router.push('/easy-enroll')}>
              Find a Class
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline">
              Contact Us
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-12">
          <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <h4 className="font-bold mb-6">About SHARE</h4>
              <ul className="space-y-3">
                <li><Link href="/about" className="hover:underline">Who We Are</Link></li>
                <li><Link href="/about#mission" className="hover:underline">Our Mission</Link></li>
                <li><Link href="/about#team" className="hover:underline">Our Team</Link></li>
                <li><Link href="/about#values" className="hover:underline">Values</Link></li>
                <li><Link href="/news" className="hover:underline">Latest News</Link></li>
                <li><Link href="/careers" className="hover:underline">Careers</Link></li>
                <li><Link href="/support" className="hover:underline">Support & Advocacy</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-6">Classes & Programs</h4>
              <ul className="space-y-3">
                <li><Link href="/classes" className="hover:underline">All Classes</Link></li>
                <li><Link href="/classes#yoga" className="hover:underline">Yoga</Link></li>
                <li><Link href="/classes#strength" className="hover:underline">Strength & Balance</Link></li>
                <li><Link href="/classes#chair" className="hover:underline">Chair Fitness</Link></li>
                <li><Link href="/classes#schedule" className="hover:underline">Class Schedule</Link></li>
                <li><Link href="/instructors" className="hover:underline">Our Instructors</Link></li>
                <li><Link href="/pricing" className="hover:underline">Pricing & Memberships</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-6">Resources</h4>
              <ul className="space-y-3">
                <li><Link href="/venues" className="hover:underline">Find a Venue</Link></li>
                <li><Link href="/faq" className="hover:underline">FAQs</Link></li>
                <li><Link href="/health-tips" className="hover:underline">Health & Wellness Tips</Link></li>
                <li><Link href="/blog" className="hover:underline">Blog</Link></li>
                <li><Link href="/testimonials" className="hover:underline">Success Stories</Link></li>
                <li><Link href="/events" className="hover:underline">Community Events</Link></li>
                <li><Link href="/support" className="hover:underline">Support Center</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-6">Contact & Support</h4>
              <div className="space-y-4">
                <div>
                  <p className="text-2xl font-bold">1800 XXX XXX</p>
                  <p className="text-sm text-primary-foreground/80">Freecall</p>
                </div>
                <div className="space-y-1">
                  <p>Mon - Fri: 8am - 6pm</p>
                  <p>Saturday: 9am - 1pm</p>
                </div>
                <div className="space-y-4">
                  <Input
                    placeholder="Enter your email"
                    className="bg-primary-foreground text-primary"
                  />
                  <Button variant="secondary" className="w-full">
                    Subscribe to Newsletter
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-primary-foreground/20">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <div className="flex flex-wrap items-center gap-4 justify-center md:justify-start">
                <Link href="/terms" className="text-sm hover:underline">Terms of Use</Link>
                <Link href="/privacy" className="text-sm hover:underline">Privacy Policy</Link>
                <Link href="/accessibility" className="text-sm hover:underline">Accessibility</Link>
                <Link href="/sitemap" className="text-sm hover:underline">Sitemap</Link>
              </div>
              <div className="flex items-center gap-4">
                <Link href="/auth" className="text-sm hover:underline">Staff Portal</Link>
                <span className="text-sm">© {new Date().getFullYear()} SHARE CRM. All rights reserved.</span>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}