import { Metadata } from "next";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import { Navigation } from '@/components/shared/navigation';
import Link from "next/link";

export const dynamic = 'force-static';

// Metadata for SEO
export const generateMetadata = async (): Promise<Metadata> => {
  return {
    title: "Contact Share | SHARE Community Fitness",
    description:
      "Contact SHARE, a not-for-profit organization delivering targeted, affordable exercise programs for people over 50 since 1985.",
    openGraph: {
      title: "Contact Share | SHARE Community Fitness",
      description:
        "SHARE provides award-winning fitness programs focused on compassion, innovation, and inclusiveness for people over 50.",
      url: "https://share.org.au/contact",
      siteName: "SHARE Community Fitness",
      images: [
        {
          url: "/share-logo.png",
          alt: "SHARE Community",
        },
      ],
      locale: "en_AU",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Contact Us | SHARE Community Fitness",
      description: "Contact us share for Targeted, affordable exercise programs for over 50s. Discover our core values and mission.",
      images: ["https://share.org.au/wp-content/uploads/2019/07/SHARE-circle.png"],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
};

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      {/* Hero Section */}
      <section className="bg-muted/30 py-12">
        <div className="container mx-auto px-4">
          <h1 className="text-4xl font-bold mb-6">Contact Us</h1>
          <p className="text-xl text-muted-foreground max-w-2xl">
            Have questions about our classes or want to learn more? We're here to help you start your journey to active living.
          </p>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold mb-6">Get in Touch</h2>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <Phone className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-medium">Phone</h3>
                    <p className="text-muted-foreground">1800 XXX XXX</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Mail className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-medium">Email</h3>
                    <p className="text-muted-foreground">info@sharecrm.com</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <MapPin className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-medium">Address</h3>
                    <p className="text-muted-foreground">123 Exercise Street<br />Fitness VIC 3000</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Clock className="h-5 w-5 text-primary mt-1" />
                  <div>
                    <h3 className="font-medium">Hours</h3>
                    <p className="text-muted-foreground">Monday - Friday: 8am - 6pm<br />Saturday: 9am - 1pm</p>
                  </div>
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-6">Send us a Message</h2>
              <form className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium mb-2 block">First Name</label>
                    <Input />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Last Name</label>
                    <Input />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Email</label>
                  <Input type="email" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Phone</label>
                  <Input type="tel" />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Message</label>
                  <Textarea className="min-h-[120px]" />
                </div>
                <Button className="w-full">Send Message</Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Map */}
      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="rounded-xl border bg-card overflow-hidden">
            <div className="aspect-[21/9] relative">
              <img
                src="/australian-old-people.jpg"
                alt="Location map"
                className="object-cover absolute inset-0 h-full w-full"
              />
            </div>
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