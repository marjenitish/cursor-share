'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '../ui/input';

export function Footer() {
  
  return (
    <footer className="border-t bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 py-12">
          <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <h4 className="font-bold mb-6">About SHARE</h4>
              <ul className="space-y-3">
                <li><Link href="/about/who-we-are" className="hover:underline">Who We Are</Link></li>
                <li><Link href="/about/mission" className="hover:underline">Our Mission</Link></li>
                <li><Link href="/about/board" className="hover:underline">Our Team</Link></li>
                <li><Link href="/about/instructors" className="hover:underline">Our Instructors</Link></li>
                <li><Link href="/news" className="hover:underline">Latest News</Link></li>
                <li><Link href="/about/careers" className="hover:underline">Careers</Link></li>
                <li><Link href="/contact" className="hover:underline">Support & Advocacy</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-6">Classes & Programs</h4>
              <ul className="space-y-3">
                {
                  [
                    { href: '/exercise-types/d1d461a7-6626-4379-a1e7-650377744fa8', label: 'Gentle Aqua' },
                    { href: '/exercise-types/f64b82bf-8ffd-4545-a229-fc7e36a0c89d', label: 'Active & Fit' },
                    { href: '/exercise-types/c94fcd75-bd35-420a-9c71-2206ca523921', label: 'Strength, Stretch & Relax' },
                    { href: '/exercise-types/9190ce95-0a78-414b-b406-6a01a7df240f', label: 'Tai Chi' },
                    { href: '/exercise-types/d329edef-8c00-4fca-a497-f23378f7f627', label: 'Fitter and Stronger' },
                    { href: '/exercise-types/432bfd44-e4fb-41e8-b048-a132df8325ca', label: 'Zumba Gold' },
                  ].map((item: any) => (
                  <li key={item?.href}>
                    <Link href={item?.href} className="hover:underline">{item.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-bold mb-6">Resources</h4>
              <ul className="space-y-3">
                <li><Link href="/easy-enroll" className="hover:underline">Find a Venue</Link></li>
                <li><Link href="/faq" className="hover:underline">FAQs</Link></li>
                <li><Link href="#" className="hover:underline">Health & Wellness Tips</Link></li>
                <li><Link href="/news" className="hover:underline">Blog</Link></li>
                <li><Link href="#" className="hover:underline">Success Stories</Link></li>
                <li><Link href="/news" className="hover:underline">Community Events</Link></li>
                <li><Link href="/contact" className="hover:underline">Support Center</Link></li>
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
                <Link href="#" className="text-sm hover:underline">Terms of Use</Link>
                <Link href="#" className="text-sm hover:underline">Privacy Policy</Link>
                <Link href="#" className="text-sm hover:underline">Accessibility</Link>
                <Link href="#" className="text-sm hover:underline">Sitemap</Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
  );
}